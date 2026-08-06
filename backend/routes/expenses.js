const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');

router.use(requireAuth);
router.use(requireRole(['admin', 'hr']));

// GET /expenses (Main Directory & Summaries)
router.get('/', (req, res) => {
  const activeTab = req.query.tab || 'projects';
  const statusFilter = req.query.status || 'all';
  const locationFilter = req.query.location || 'all';
  const employeeFilter = req.query.employee || 'all';
  const projectFilter = req.query.project || 'all';

  // Build base WHERE clause for travel_expenses
  let baseWhere = ' WHERE 1=1';
  const baseParams = [];

  if (employeeFilter !== 'all') {
    baseWhere += ' AND t.employee_id = ?';
    baseParams.push(employeeFilter);
  }
  if (statusFilter !== 'all') {
    baseWhere += ' AND t.status = ?';
    baseParams.push(statusFilter);
  }
  if (locationFilter !== 'all') {
    baseWhere += ' AND (e.work_location = ? OR t.from_location = ? OR t.to_location = ?)';
    baseParams.push(locationFilter, locationFilter, locationFilter);
  }
  if (projectFilter !== 'all') {
    baseWhere += ' AND LOWER(TRIM(t.project_name)) = LOWER(TRIM(?))';
    baseParams.push(projectFilter);
  }

  // 1. Query Consolidated Employee Expense Claims
  const travelSql = `
    SELECT 
      e.id as employee_id, 
      e.name as employee_name, 
      e.employee_code, 
      e.work_location as emp_location, 
      e.designation,
      COUNT(t.id) as claim_count,
      COALESCE(SUM(t.total_amount), 0) as total_amount,
      COALESCE(SUM(t.advance_paid), 0) as advance_paid,
      COALESCE(SUM(CASE WHEN t.status != 'Rejected' THEN t.dues_amount ELSE 0 END), 0) as dues_amount,
      MAX(t.start_date) as latest_date,
      SUM(CASE WHEN t.status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN t.status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
      SUM(CASE WHEN t.status = 'Reimbursed' THEN 1 ELSE 0 END) as reimbursed_count
    FROM employees e
    JOIN travel_expenses t ON e.id = t.employee_id
    ${baseWhere}
    GROUP BY e.id
    ORDER BY dues_amount DESC, latest_date DESC
  `;
  const travelExpenses = db.prepare(travelSql).all(...baseParams);

  // 2. Query Project Site Expenses (expense_type = 'Project' OR project_name != 'General Corporate')
  let projectSql = `
    SELECT c.*, e.name as responsible_employee_name, e.employee_code as responsible_employee_code
    FROM company_expenses c
    LEFT JOIN employees e ON c.responsible_employee_id = e.id
    WHERE (c.expense_type = 'Project' OR (c.project_name IS NOT NULL AND TRIM(c.project_name) != '' AND TRIM(c.project_name) != 'General Corporate'))
  `;
  const projectParams = [];
  if (locationFilter !== 'all') {
    projectSql += ' AND c.work_location = ?';
    projectParams.push(locationFilter);
  }
  if (projectFilter !== 'all') {
    projectSql += ' AND LOWER(TRIM(c.project_name)) = LOWER(TRIM(?))';
    projectParams.push(projectFilter);
  }
  if (employeeFilter !== 'all') {
    projectSql += ' AND c.responsible_employee_id = ?';
    projectParams.push(employeeFilter);
  }
  projectSql += ' ORDER BY c.date DESC, c.id DESC';
  const projectExpensesList = db.prepare(projectSql).all(...projectParams);

  // 3. Query Company Operational Overhead Expenses (expense_type = 'Company Overhead' OR project_name = 'General Corporate')
  let companySql = `
    SELECT c.*, e.name as responsible_employee_name, e.employee_code as responsible_employee_code
    FROM company_expenses c
    LEFT JOIN employees e ON c.responsible_employee_id = e.id
    WHERE (c.expense_type = 'Company Overhead' OR c.project_name IS NULL OR TRIM(c.project_name) = '' OR TRIM(c.project_name) = 'General Corporate')
  `;
  const companyParams = [];
  if (locationFilter !== 'all') {
    companySql += ' AND c.work_location = ?';
    companyParams.push(locationFilter);
  }
  if (employeeFilter !== 'all') {
    companySql += ' AND c.responsible_employee_id = ?';
    companyParams.push(employeeFilter);
  }
  companySql += ' ORDER BY c.date DESC, c.id DESC';
  const companyExpenses = db.prepare(companySql).all(...companyParams);

  // 4. Metrics Aggregation
  const travelMetrics = db.prepare(`
    SELECT 
      COALESCE(SUM(t.total_amount), 0) as total_claimed,
      COALESCE(SUM(t.advance_paid), 0) as total_advance,
      COALESCE(SUM(CASE WHEN t.status != 'Rejected' THEN t.dues_amount ELSE 0 END), 0) as total_dues
    FROM travel_expenses t
    JOIN employees e ON t.employee_id = e.id
    ${baseWhere}
  `).get(...baseParams);

  const totalTravelClaims = travelMetrics.total_claimed;
  const totalAdvancePaid = travelMetrics.total_advance;
  const totalPendingDues = travelMetrics.total_dues;

  const totalProjectExpenses = projectExpensesList.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCompanyExpenses = companyExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);

  // 5. Case-Insensitive Project-Wise Grouping for Tab 1
  const projectMap = {};
  projectExpensesList.forEach(exp => {
    const rawName = (exp.project_name || 'General Corporate').trim();
    const key = rawName.toLowerCase();

    if (!projectMap[key]) {
      projectMap[key] = {
        project_name: rawName,
        work_location: exp.work_location,
        total_spent: 0,
        count: 0,
        items: []
      };
    } else {
      if (rawName !== projectMap[key].project_name && rawName[0] === rawName[0].toUpperCase()) {
        projectMap[key].project_name = rawName;
      }
    }
    projectMap[key].total_spent += exp.amount;
    projectMap[key].count += 1;
    projectMap[key].items.push(exp);
  });
  const projectSummary = Object.values(projectMap).sort((a, b) => b.total_spent - a.total_spent);

  // 6. Employee Dues Ledger Aggregation
  let ledgerWhere = ' WHERE 1=1';
  const ledgerParams = [];
  if (locationFilter !== 'all') {
    ledgerWhere += ' AND e.work_location = ?';
    ledgerParams.push(locationFilter);
  }
  if (employeeFilter !== 'all') {
    ledgerWhere += ' AND e.id = ?';
    ledgerParams.push(employeeFilter);
  }

  const employeeLedger = db.prepare(`
    SELECT 
      e.id as employee_id, e.name as employee_name, e.employee_code, e.work_location,
      COUNT(t.id) as claim_count,
      COALESCE(SUM(t.total_amount), 0) as total_claimed,
      COALESCE(SUM(t.advance_paid), 0) as total_advance_paid,
      COALESCE(SUM(CASE WHEN t.status != 'Rejected' THEN t.dues_amount ELSE 0 END), 0) as net_dues
    FROM employees e
    JOIN travel_expenses t ON e.id = t.employee_id
    ${ledgerWhere}
    GROUP BY e.id
    ORDER BY net_dues DESC, e.name ASC
  `).all(...ledgerParams);

  // 7. Dropdown & Datalist data with Case-Deduplication
  const employees = db.prepare("SELECT id, employee_code, name, designation, work_location FROM employees WHERE status = 'active' ORDER BY work_location ASC, name ASC").all();
  
  const empLocations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);
  const companyLocations = db.prepare("SELECT DISTINCT work_location FROM company_expenses WHERE work_location IS NOT NULL AND work_location != ''").all().map(r => r.work_location);
  const locations = Array.from(new Set([...empLocations, ...companyLocations, 'Dantewada', 'Hazaribagh', 'Jodhpur', 'Ranchi', 'Delhi', 'Patna', 'Jaipur'])).sort();
  
  const companyProjects = db.prepare("SELECT DISTINCT project_name FROM company_expenses WHERE project_name IS NOT NULL AND TRIM(project_name) != '' AND TRIM(project_name) != 'General Corporate'").all().map(r => r.project_name);
  const travelProjects = db.prepare("SELECT DISTINCT project_name FROM travel_expenses WHERE project_name IS NOT NULL AND TRIM(project_name) != '' AND TRIM(project_name) != 'General Corporate'").all().map(r => r.project_name);
  
  const projectMapUnique = new Map();
  [...companyProjects, ...travelProjects, 'Robotics Lab', 'Hazaribagh Solar Site', 'Jodhpur HQ Maintenance', 'Delhi Branch Office', 'Ranchi Expansion Project', 'Jaipur Site Alpha'].forEach(p => {
    if (p && p.trim()) {
      const key = p.trim().toLowerCase();
      if (!projectMapUnique.has(key)) {
        projectMapUnique.set(key, p.trim());
      }
    }
  });
  const projects = Array.from(projectMapUnique.values()).sort();

  const selectedEmployeeInfo = employeeFilter !== 'all' ? db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeFilter) : null;
  const todayStr = new Date().toISOString().substring(0, 10);

  res.render('expenses/index', {
    activeTab,
    statusFilter,
    locationFilter,
    employeeFilter,
    projectFilter,
    selectedEmployeeInfo,
    travelExpenses,
    companyExpenses,
    projectSummary,
    employeeLedger,
    totalProjectExpenses,
    totalCompanyExpenses,
    totalTravelClaims,
    totalAdvancePaid,
    totalPendingDues,
    employees,
    locations,
    projects,
    todayStr,
    success: req.query.success || null,
    error: req.query.error || null
  });
});

// GET /expenses/project/new (Dedicated Full Page to Add Project Site Expense)
router.get('/project/new', (req, res) => {
  const selectedProject = req.query.project_name || '';
  const employees = db.prepare("SELECT id, employee_code, name, designation, work_location FROM employees WHERE status = 'active' ORDER BY name ASC").all();
  
  const empLocations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);
  const companyLocations = db.prepare("SELECT DISTINCT work_location FROM company_expenses WHERE work_location IS NOT NULL AND work_location != ''").all().map(r => r.work_location);
  const locations = Array.from(new Set([...empLocations, ...companyLocations, 'Dantewada', 'Hazaribagh', 'Jodhpur', 'Ranchi', 'Delhi', 'Patna', 'Jaipur'])).sort();

  const companyProjects = db.prepare("SELECT DISTINCT project_name FROM company_expenses WHERE project_name IS NOT NULL AND TRIM(project_name) != '' AND TRIM(project_name) != 'General Corporate'").all().map(r => r.project_name);
  const travelProjects = db.prepare("SELECT DISTINCT project_name FROM travel_expenses WHERE project_name IS NOT NULL AND TRIM(project_name) != '' AND TRIM(project_name) != 'General Corporate'").all().map(r => r.project_name);
  
  const projectMapUnique = new Map();
  [...companyProjects, ...travelProjects, 'Robotics Lab', 'Hazaribagh Solar Site', 'Jodhpur HQ Maintenance', 'Delhi Branch Office', 'Ranchi Expansion Project', 'Jaipur Site Alpha'].forEach(p => {
    if (p && p.trim()) {
      const key = p.trim().toLowerCase();
      if (!projectMapUnique.has(key)) {
        projectMapUnique.set(key, p.trim());
      }
    }
  });
  const projects = Array.from(projectMapUnique.values()).sort();

  const dbCategories = db.prepare("SELECT DISTINCT category FROM company_expenses WHERE category IS NOT NULL AND category != ''").all().map(r => r.category);
  const categories = Array.from(new Set([...dbCategories, 'Project Site Material', 'Lab Equipment & Hardware', 'Robotics Kit', 'Site Labor & Transport'])).sort();

  const todayStr = new Date().toISOString().substring(0, 10);

  res.render('expenses/project_new', {
    employees,
    locations,
    projects,
    categories,
    selectedProject,
    todayStr,
    error: req.query.error || null
  });
});

// GET /expenses/company/new (Dedicated Full Page to Add Company Operational Overhead Bill)
router.get('/company/new', (req, res) => {
  const employees = db.prepare("SELECT id, employee_code, name, designation, work_location FROM employees WHERE status = 'active' ORDER BY name ASC").all();
  
  const empLocations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);
  const companyLocations = db.prepare("SELECT DISTINCT work_location FROM company_expenses WHERE work_location IS NOT NULL AND work_location != ''").all().map(r => r.work_location);
  const locations = Array.from(new Set([...empLocations, ...companyLocations, 'Jodhpur HQ', 'Delhi Branch Office', 'Ranchi Office', 'Hazaribagh', 'Dantewada'])).sort();

  const todayStr = new Date().toISOString().substring(0, 10);

  res.render('expenses/company_new', {
    employees,
    locations,
    todayStr,
    error: req.query.error || null
  });
});

// GET /expenses/travel/new (Dedicated Full Page to Add Employee Field Claim)
router.get('/travel/new', (req, res) => {
  const employeeId = req.query.employee_id || '';
  const selectedProject = req.query.project_name || '';
  const employees = db.prepare("SELECT id, employee_code, name, designation, work_location FROM employees WHERE status = 'active' ORDER BY name ASC").all();
  
  const empLocations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);
  const companyLocations = db.prepare("SELECT DISTINCT work_location FROM company_expenses WHERE work_location IS NOT NULL AND work_location != ''").all().map(r => r.work_location);
  const locations = Array.from(new Set([...empLocations, ...companyLocations, 'Dantewada', 'Hazaribagh', 'Jodhpur', 'Ranchi', 'Delhi', 'Patna', 'Jaipur'])).sort();

  const companyProjects = db.prepare("SELECT DISTINCT project_name FROM company_expenses WHERE project_name IS NOT NULL AND TRIM(project_name) != '' AND TRIM(project_name) != 'General Corporate'").all().map(r => r.project_name);
  const travelProjects = db.prepare("SELECT DISTINCT project_name FROM travel_expenses WHERE project_name IS NOT NULL AND TRIM(project_name) != '' AND TRIM(project_name) != 'General Corporate'").all().map(r => r.project_name);
  
  const projectMapUnique = new Map();
  [...companyProjects, ...travelProjects, 'Robotics Lab', 'Hazaribagh Solar Site', 'Jodhpur HQ Maintenance', 'Delhi Branch Office', 'Ranchi Expansion Project', 'Jaipur Site Alpha'].forEach(p => {
    if (p && p.trim()) {
      const key = p.trim().toLowerCase();
      if (!projectMapUnique.has(key)) {
        projectMapUnique.set(key, p.trim());
      }
    }
  });
  const projects = Array.from(projectMapUnique.values()).sort();

  const todayStr = new Date().toISOString().substring(0, 10);

  res.render('expenses/travel_new', {
    employees,
    projects,
    locations,
    selectedEmployeeId: employeeId,
    selectedProject,
    todayStr,
    error: req.query.error || null
  });
});

// GET /expenses/employee-ledger/:employeeId (Dedicated Full Page for Employee Expense Ledger)
router.get('/employee-ledger/:employeeId', (req, res) => {
  const empId = req.params.employeeId;
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(empId);
  if (!employee) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Employee not found.' });
  }

  const summary = db.prepare(`
    SELECT 
      COUNT(id) as claim_count,
      COALESCE(SUM(total_amount), 0) as total_claimed,
      COALESCE(SUM(advance_paid), 0) as total_advance_paid,
      COALESCE(SUM(CASE WHEN status != 'Rejected' THEN dues_amount ELSE 0 END), 0) as net_dues
    FROM travel_expenses
    WHERE employee_id = ?
  `).get(empId);

  const claims = db.prepare(`
    SELECT * FROM travel_expenses
    WHERE employee_id = ?
    ORDER BY start_date DESC, id DESC
  `).all(empId);

  res.render('expenses/ledger', {
    employee,
    summary,
    claims,
    error: req.query.error || null,
    success: req.query.success || null
  });
});

// POST /expenses/project (Create Project Expense)
router.post('/project', (req, res) => {
  const { title, category, project_name, vendor_name, amount, date, work_location, payment_mode, payment_status, invoice_ref, notes, responsible_employee_id } = req.body;

  if (!title || !category || !amount || !date || !work_location || !project_name) {
    return res.redirect('/expenses/project/new?error=Please+fill+in+all+required+project+expense+fields.');
  }

  const amt = parseFloat(amount) || 0;
  const projName = project_name.trim();
  const respEmpId = responsible_employee_id ? parseInt(responsible_employee_id, 10) || null : null;

  try {
    const result = db.prepare(`
      INSERT INTO company_expenses (
        title, category, expense_type, project_name, vendor_name, responsible_employee_id, amount, date, work_location, payment_mode, payment_status, invoice_ref, notes
      ) VALUES (?, ?, 'Project', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(), category.trim(), projName, vendor_name ? vendor_name.trim() : '', respEmpId, amt, date, work_location.trim(),
      payment_mode || 'Bank Transfer', payment_status || 'Paid',
      invoice_ref ? invoice_ref.trim() : '', notes ? notes.trim() : ''
    );

    logAction((req.user || req.session?.user || {}).email || 'system', 'CREATE_PROJECT_EXPENSE', 'Project Expense', result.lastInsertRowid, { title, project_name: projName, amount: amt });
    res.redirect('/expenses?tab=projects&success=Project+expense+recorded+successfully+under+project+' + encodeURIComponent(projName));
  } catch (err) {
    res.redirect('/expenses/project/new?error=' + encodeURIComponent(err.message));
  }
});

// POST /expenses/company (Create Company Operational Overhead Bill)
router.post('/company', (req, res) => {
  const { title, category, vendor_name, amount, date, work_location, payment_mode, payment_status, invoice_ref, notes, responsible_employee_id } = req.body;

  if (!title || !category || !amount || !date || !work_location) {
    return res.redirect('/expenses/company/new?error=Please+fill+in+all+required+company+overhead+bill+fields.');
  }

  const amt = parseFloat(amount) || 0;
  const respEmpId = responsible_employee_id ? parseInt(responsible_employee_id, 10) || null : null;

  try {
    const result = db.prepare(`
      INSERT INTO company_expenses (
        title, category, expense_type, project_name, vendor_name, responsible_employee_id, amount, date, work_location, payment_mode, payment_status, invoice_ref, notes
      ) VALUES (?, ?, 'Company Overhead', 'General Corporate', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(), category.trim(), vendor_name ? vendor_name.trim() : '', respEmpId, amt, date, work_location.trim(),
      payment_mode || 'Bank Transfer', payment_status || 'Paid',
      invoice_ref ? invoice_ref.trim() : '', notes ? notes.trim() : ''
    );

    logAction((req.user || req.session?.user || {}).email || 'system', 'CREATE_COMPANY_OVERHEAD', 'Company Expense', result.lastInsertRowid, { title, amount: amt });
    res.redirect('/expenses?tab=company&success=Company+operational+overhead+bill+recorded+successfully.');
  } catch (err) {
    res.redirect('/expenses/company/new?error=' + encodeURIComponent(err.message));
  }
});

// POST /expenses/travel (Create Employee Reimbursement Claim)
router.post('/travel', (req, res) => {
  const {
    employee_id, project_name, claim_type, item_title, submission_source, receipt_ref, from_location, to_location, purpose,
    start_date, end_date, travel_cost, food_cost,
    stay_cost, misc_cost, claim_total_amount, advance_paid, notes
  } = req.body;

  if (!employee_id || !purpose || !start_date) {
    return res.redirect('/expenses/travel/new?error=Please+fill+in+all+required+claim+details.');
  }

  const projName = project_name ? project_name.trim() : 'General Corporate';
  const type = claim_type || 'Travel';
  const title = item_title ? item_title.trim() : '';
  const source = submission_source || 'Offline Form';
  const refNo = receipt_ref ? receipt_ref.trim() : '';

  const tCost = parseFloat(travel_cost) || 0;
  const fCost = parseFloat(food_cost) || 0;
  const sCost = parseFloat(stay_cost) || 0;
  const mCost = parseFloat(misc_cost) || 0;
  const advPaid = parseFloat(advance_paid) || 0;

  let totalAmount;
  if (type !== 'Travel' && claim_total_amount !== undefined && claim_total_amount !== '') {
    totalAmount = parseFloat(claim_total_amount) || 0;
  } else {
    totalAmount = Math.round((tCost + fCost + sCost + mCost) * 100) / 100;
  }

  const duesAmount = Math.max(0, Math.round((totalAmount - advPaid) * 100) / 100);
  const initialStatus = duesAmount === 0 ? 'Reimbursed' : 'Pending Payment';

  try {
    const result = db.prepare(`
      INSERT INTO travel_expenses (
        employee_id, project_name, claim_type, item_title, submission_source, receipt_ref, from_location, to_location, purpose, start_date, end_date,
        travel_cost, food_cost, stay_cost, misc_cost, total_amount, advance_paid, dues_amount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employee_id, projName, type, title, source, refNo,
      from_location ? from_location.trim() : '',
      to_location ? to_location.trim() : '',
      purpose.trim(),
      start_date,
      end_date || start_date,
      tCost, fCost, sCost, mCost,
      totalAmount, advPaid, duesAmount,
      initialStatus,
      notes ? notes.trim() : ''
    );

    logAction((req.user || req.session?.user || {}).email || 'system', 'CREATE_EMPLOYEE_CLAIM', 'Employee Expense', result.lastInsertRowid, { type, totalAmount, duesAmount });
    res.redirect('/expenses?tab=travel&success=Employee+expense+record+entered+successfully.');
  } catch (err) {
    res.redirect('/expenses/travel/new?error=' + encodeURIComponent(err.message));
  }
});

// GET /expenses/company/:id/pay (Dedicated Page to Settle Company Bill)
router.get('/company/:id/pay', (req, res) => {
  const exp = db.prepare(`
    SELECT c.*, e.name as responsible_employee_name, e.employee_code as responsible_employee_code
    FROM company_expenses c
    LEFT JOIN employees e ON c.responsible_employee_id = e.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!exp) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Company expense bill record not found.' });
  }

  res.render('expenses/company_pay', {
    expense: exp,
    error: req.query.error || null
  });
});

// GET /expenses/travel/:id/pay (Dedicated Page to Pay Employee Reimbursement Dues)
router.get('/travel/:id/pay', (req, res) => {
  const claim = db.prepare(`
    SELECT t.*, e.name as employee_name, e.employee_code, e.work_location
    FROM travel_expenses t
    JOIN employees e ON t.employee_id = e.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!claim) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Travel expense claim record not found.' });
  }

  res.render('expenses/travel_pay', {
    claim,
    error: req.query.error || null
  });
});

// POST /expenses/travel/:id/status (Pay / Settle Payment)
router.post('/travel/:id/status', (req, res) => {
  const { status, payment_amount, advance_paid } = req.body;
  const claimId = req.params.id;

  const claim = db.prepare('SELECT * FROM travel_expenses WHERE id = ?').get(claimId);
  if (!claim) {
    return res.redirect('/expenses?tab=travel&error=Travel+claim+record+not+found.');
  }

  try {
    let newAdvance = claim.advance_paid;

    if (payment_amount !== undefined && payment_amount !== '') {
      const addedPay = parseFloat(payment_amount) || 0;
      newAdvance = Math.round((claim.advance_paid + addedPay) * 100) / 100;
    } else if (advance_paid !== undefined && advance_paid !== '') {
      newAdvance = parseFloat(advance_paid) || 0;
    } else if (status === 'Reimbursed') {
      newAdvance = claim.total_amount;
    }

    if (newAdvance > claim.total_amount) {
      newAdvance = claim.total_amount;
    }

    const newDues = Math.max(0, Math.round((claim.total_amount - newAdvance) * 100) / 100);
    const finalStatus = newDues === 0 ? 'Reimbursed' : 'Pending Payment';

    db.prepare(`
      UPDATE travel_expenses
      SET status = ?, advance_paid = ?, dues_amount = ?
      WHERE id = ?
    `).run(finalStatus, newAdvance, newDues, claimId);

    logAction((req.user || req.session?.user || {}).email || 'system', 'UPDATE_TRAVEL_STATUS', 'Travel Expense', claimId, { status: finalStatus, newAdvance, newDues });
    
    const redirectUrl = req.body.redirect_ledger ? `/expenses/employee-ledger/${claim.employee_id}?success=Payment+recorded+successfully!` : `/expenses?tab=travel&success=Payment+updated!+New+Advance/Paid:+₹${newAdvance.toLocaleString('en-IN')},+Remaining+Dues:+₹${newDues.toLocaleString('en-IN')}.`;
    res.redirect(redirectUrl);
  } catch (err) {
    res.redirect('/expenses?tab=travel&error=' + encodeURIComponent(err.message));
  }
});

// POST /expenses/travel/:id/delete
router.post('/travel/:id/delete', (req, res) => {
  try {
    db.prepare('DELETE FROM travel_expenses WHERE id = ?').run(req.params.id);
    logAction((req.user || req.session?.user || {}).email || 'system', 'DELETE_TRAVEL_EXPENSE', 'Travel Expense', req.params.id, {});
    res.redirect('/expenses?tab=travel&success=Travel+claim+record+deleted.');
  } catch (err) {
    res.redirect('/expenses?tab=travel&error=' + encodeURIComponent(err.message));
  }
});

// POST /expenses/company/:id/pay (Settle / Mark Paid Company Expense Bill)
router.post('/company/:id/pay', (req, res) => {
  const { payment_mode, invoice_ref } = req.body;
  try {
    db.prepare(`
      UPDATE company_expenses
      SET payment_status = 'Paid',
          payment_mode = CASE WHEN ? != '' THEN ? ELSE payment_mode END,
          invoice_ref = CASE WHEN ? != '' THEN ? ELSE invoice_ref END
      WHERE id = ?
    `).run(payment_mode || '', payment_mode || '', invoice_ref || '', invoice_ref || '', req.params.id);

    logAction((req.user || req.session?.user || {}).email || 'system', 'SETTLE_COMPANY_EXPENSE', 'Company Expense', req.params.id, {});
    res.redirect('/expenses?tab=company&success=Company+bill+settled+and+marked+as+Paid.');
  } catch (err) {
    res.redirect('/expenses?tab=company&error=' + encodeURIComponent(err.message));
  }
});

// POST /expenses/company/:id/delete
router.post('/company/:id/delete', (req, res) => {
  try {
    const exp = db.prepare('SELECT * FROM company_expenses WHERE id = ?').get(req.params.id);
    const redirectTab = exp && exp.expense_type === 'Company Overhead' ? 'company' : 'projects';
    db.prepare('DELETE FROM company_expenses WHERE id = ?').run(req.params.id);
    logAction((req.user || req.session?.user || {}).email || 'system', 'DELETE_COMPANY_EXPENSE', 'Company Expense', req.params.id, {});
    res.redirect(`/expenses?tab=${redirectTab}&success=Expense+record+deleted.`);
  } catch (err) {
    res.redirect('/expenses?error=' + encodeURIComponent(err.message));
  }
});

// GET /expenses/report (Download Expenses CSV Report)
router.get('/report', (req, res) => {
  const travelClaims = db.prepare(`
    SELECT t.*, e.name as employee_name, e.employee_code, e.work_location
    FROM travel_expenses t
    JOIN employees e ON t.employee_id = e.id
    ORDER BY t.start_date DESC
  `).all();

  const companyExp = db.prepare(`
    SELECT c.*, e.name as responsible_employee_name
    FROM company_expenses c
    LEFT JOIN employees e ON c.responsible_employee_id = e.id
    ORDER BY c.date DESC
  `).all();

  let csvContent = '=== EMPLOYEE TRAVEL CLAIMS ===\n';
  csvContent += 'ID,Project Name,Employee Code,Employee Name,From,To,Purpose,Start Date,End Date,Travel Cost,Food Cost,Stay Cost,Misc Cost,Total Amount,Advance Paid,Balance Dues,Status\n';

  travelClaims.forEach(t => {
    csvContent += [
      t.id,
      `"${t.project_name || 'General Corporate'}"`,
      `"${t.employee_code}"`,
      `"${t.employee_name}"`,
      `"${t.from_location}"`,
      `"${t.to_location}"`,
      `"${t.purpose}"`,
      t.start_date,
      t.end_date,
      t.travel_cost,
      t.food_cost,
      t.stay_cost,
      t.misc_cost,
      t.total_amount,
      t.advance_paid,
      t.dues_amount,
      `"${t.status}"`
    ].join(',') + '\n';
  });

  csvContent += '\n=== COMPANY & PROJECT OPERATIONAL EXPENSES ===\n';
  csvContent += 'ID,Expense Type,Project Name,Title,Category,Vendor,Responsible Employee,Amount,Date,Location,Payment Mode,Payment Status,Invoice Reference\n';

  companyExp.forEach(c => {
    csvContent += [
      c.id,
      `"${c.expense_type || 'Project'}"`,
      `"${c.project_name || 'General Corporate'}"`,
      `"${c.title}"`,
      `"${c.category}"`,
      `"${c.vendor_name || ''}"`,
      `"${c.responsible_employee_name || 'Unassigned'}"`,
      c.amount,
      c.date,
      `"${c.work_location}"`,
      `"${c.payment_mode}"`,
      `"${c.payment_status}"`,
      `"${c.invoice_ref || ''}"`
    ].join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="Expenses_Report_${new Date().toISOString().substring(0, 10)}.csv"`);
  res.send(csvContent);
});

module.exports = router;
