const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');

router.use(requireAuth);
router.use(requireRole(['admin', 'hr']));

// GET /expenses
router.get('/', (req, res) => {
  const activeTab = req.query.tab || 'travel';
  const statusFilter = req.query.status || 'all';
  const locationFilter = req.query.location || 'all';
  const employeeFilter = req.query.employee || 'all';

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

  // 1. Query Consolidated Employee Expense Records
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

  // 2. Query Company Expenses
  let companySql = 'SELECT * FROM company_expenses WHERE 1=1';
  const companyParams = [];
  if (locationFilter !== 'all') {
    companySql += ' AND work_location = ?';
    companyParams.push(locationFilter);
  }
  companySql += ' ORDER BY date DESC, id DESC';
  const companyExpenses = db.prepare(companySql).all(...companyParams);

  // 3. Synchronized Metrics Aggregation (Matching current filters)
  const metricsSql = `
    SELECT 
      COALESCE(SUM(t.total_amount), 0) as total_claimed,
      COALESCE(SUM(t.advance_paid), 0) as total_advance,
      COALESCE(SUM(CASE WHEN t.status != 'Rejected' THEN t.dues_amount ELSE 0 END), 0) as total_dues
    FROM travel_expenses t
    JOIN employees e ON t.employee_id = e.id
    ${baseWhere}
  `;
  const travelMetrics = db.prepare(metricsSql).get(...baseParams);

  const totalTravelClaims = travelMetrics.total_claimed;
  const totalAdvancePaid = travelMetrics.total_advance;
  const totalPendingDues = travelMetrics.total_dues;

  const companyMetricsSql = locationFilter !== 'all' 
    ? 'SELECT COALESCE(SUM(amount), 0) as total_company FROM company_expenses WHERE work_location = ?'
    : 'SELECT COALESCE(SUM(amount), 0) as total_company FROM company_expenses';
  const companyMetricsParams = locationFilter !== 'all' ? [locationFilter] : [];
  const companyMetrics = db.prepare(companyMetricsSql).get(...companyMetricsParams);
  const totalCompanyExpenses = companyMetrics.total_company;

  // 4. Employee Dues Ledger Aggregation (Grouped per Employee with matching filters)
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

  const ledgerSql = `
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
  `;
  const employeeLedger = db.prepare(ledgerSql).all(...ledgerParams);

  // 5. Employees & Locations dropdown data
  const employees = db.prepare("SELECT id, employee_code, name, designation, work_location FROM employees WHERE status = 'active' ORDER BY work_location ASC, name ASC").all();
  const locations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);

  const selectedEmployeeInfo = employeeFilter !== 'all' ? db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeFilter) : null;

  const todayStr = new Date().toISOString().substring(0, 10);

  res.render('expenses/index', {
    activeTab,
    statusFilter,
    locationFilter,
    employeeFilter,
    selectedEmployeeInfo,
    travelExpenses,
    companyExpenses,
    employeeLedger,
    totalTravelClaims,
    totalAdvancePaid,
    totalPendingDues,
    totalCompanyExpenses,
    employees,
    locations,
    todayStr,
    success: req.query.success || null,
    error: req.query.error || null
  });
});

// GET /expenses/employee-dues/:employeeId (Fetch Cumulative Dues & History for an Employee)
router.get('/employee-dues/:employeeId', (req, res) => {
  const empId = req.params.employeeId;
  const employee = db.prepare('SELECT id, name, employee_code, work_location FROM employees WHERE id = ?').get(empId);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
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

  res.json({
    employee,
    summary,
    claims
  });
});

// POST /expenses/travel (Create Employee Reimbursement Claim)
router.post('/travel', (req, res) => {
  const {
    employee_id, claim_type, item_title, submission_source, receipt_ref, from_location, to_location, purpose,
    start_date, end_date, travel_cost, food_cost,
    stay_cost, misc_cost, claim_total_amount, advance_paid, notes
  } = req.body;

  if (!employee_id || !purpose || !start_date) {
    return res.redirect('/expenses?tab=travel&error=Please+fill+in+all+required+claim+details.');
  }

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
        employee_id, claim_type, item_title, submission_source, receipt_ref, from_location, to_location, purpose, start_date, end_date,
        travel_cost, food_cost, stay_cost, misc_cost, total_amount, advance_paid, dues_amount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employee_id, type, title, source, refNo,
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
    res.redirect('/expenses?tab=travel&error=' + encodeURIComponent(err.message));
  }
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
      newAdvance = claim.total_amount; // Fully settled
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
    res.redirect(`/expenses?tab=travel&success=Payment+updated!+New+Advance/Paid:+₹${newAdvance.toLocaleString('en-IN')},+Remaining+Dues:+₹${newDues.toLocaleString('en-IN')}.`);
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

// POST /expenses/company (Create Company Operational Expense)
router.post('/company', (req, res) => {
  const { title, category, vendor_name, amount, date, work_location, payment_mode, payment_status, invoice_ref, notes } = req.body;

  if (!title || !category || !amount || !date || !work_location) {
    return res.redirect('/expenses?tab=company&error=Please+fill+in+all+required+company+expense+fields.');
  }

  const amt = parseFloat(amount) || 0;

  try {
    const result = db.prepare(`
      INSERT INTO company_expenses (
        title, category, vendor_name, amount, date, work_location, payment_mode, payment_status, invoice_ref, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(), category.trim(), vendor_name ? vendor_name.trim() : '', amt, date, work_location.trim(),
      payment_mode || 'Bank Transfer', payment_status || 'Paid',
      invoice_ref ? invoice_ref.trim() : '', notes ? notes.trim() : ''
    );

    logAction((req.user || req.session?.user || {}).email || 'system', 'CREATE_COMPANY_EXPENSE', 'Company Expense', result.lastInsertRowid, { title, amount: amt });
    res.redirect('/expenses?tab=company&success=Company+expense+recorded+successfully.');
  } catch (err) {
    res.redirect('/expenses?tab=company&error=' + encodeURIComponent(err.message));
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
    db.prepare('DELETE FROM company_expenses WHERE id = ?').run(req.params.id);
    logAction((req.user || req.session?.user || {}).email || 'system', 'DELETE_COMPANY_EXPENSE', 'Company Expense', req.params.id, {});
    res.redirect('/expenses?tab=company&success=Company+expense+deleted.');
  } catch (err) {
    res.redirect('/expenses?tab=company&error=' + encodeURIComponent(err.message));
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

  const companyExp = db.prepare('SELECT * FROM company_expenses ORDER BY date DESC').all();

  let csvContent = '=== EMPLOYEE TRAVEL CLAIMS ===\n';
  csvContent += 'ID,Employee Code,Employee Name,From,To,Purpose,Start Date,End Date,Travel Cost,Food Cost,Stay Cost,Misc Cost,Total Amount,Advance Paid,Balance Dues,Status\n';

  travelClaims.forEach(t => {
    csvContent += [
      t.id,
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

  csvContent += '\n=== COMPANY OPERATIONAL EXPENSES ===\n';
  csvContent += 'ID,Title,Category,Amount,Date,Location,Payment Mode,Payment Status,Invoice Reference\n';

  companyExp.forEach(c => {
    csvContent += [
      c.id,
      `"${c.title}"`,
      `"${c.category}"`,
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
