const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { sendPayslipEmail } = require('../utils/mailer');
const numberToIndianWords = require('../utils/numberToWords');
const Groq = require('groq-sdk');

const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
let groq = null;
if (groqApiKey && groqApiKey !== 'missing_key') {
  try {
    groq = new Groq({ apiKey: groqApiKey });
  } catch (e) {}
}

// ----------------------------------------------------
// AUTHENTICATION APIs
// ----------------------------------------------------

// GET /api/auth/me
router.get('/auth/me', (req, res) => {
  const { getUserFromToken } = require('../middleware/auth');
  const user = getUserFromToken(req);
  if (user) {
    req.session.user = user;
    return res.json({ authenticated: true, user });
  }
  res.json({ authenticated: false, user: null });
});

// POST /api/auth/login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    employee_id: user.employee_id
  };

  const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');

  logAction(user.email, 'LOGIN', 'User Session', user.id, { role: user.role });
  res.json({ success: true, user: req.session.user, token });
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  if (req.session?.user) {
    logAction(req.session.user.email, 'LOGOUT', 'User Session', req.session.user.id);
  }
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// All subsequent API endpoints require authentication
router.use(requireAuth);

// ----------------------------------------------------
// DASHBOARD APIs
// ----------------------------------------------------
router.get('/dashboard', (req, res) => {
  const activeCount = db.prepare("SELECT COUNT(*) AS count FROM employees WHERE status = 'active'").get().count;
  const exitedCount = db.prepare("SELECT COUNT(*) AS count FROM employees WHERE status = 'exited'").get().count;
  const runCount = db.prepare('SELECT COUNT(*) AS count FROM payroll_runs').get().count;
  const locationCount = db.prepare("SELECT COUNT(DISTINCT work_location) AS count FROM employees").get().count;
  
  const totalBudget = db.prepare(`
    SELECT SUM(c.amount) as total
    FROM salary_components c
    JOIN employees e ON c.employee_id = e.id
    WHERE c.type = 'earning' AND e.status = 'active'
  `).get().total || 0;

  const locationSummary = db.prepare(`
    SELECT e.work_location, COUNT(DISTINCT e.id) as heads, COALESCE(SUM(c.amount), 0) as location_budget
    FROM employees e
    LEFT JOIN salary_components c ON c.employee_id = e.id AND c.type = 'earning'
    WHERE e.status = 'active'
    GROUP BY e.work_location
    ORDER BY heads DESC, e.work_location ASC
  `).all();

  const recentRuns = db.prepare('SELECT * FROM payroll_runs ORDER BY period DESC LIMIT 5').all();

  res.json({
    activeCount,
    exitedCount,
    runCount,
    locationCount,
    totalBudget,
    locationSummary,
    recentRuns
  });
});

// ----------------------------------------------------
// EMPLOYEES APIs
// ----------------------------------------------------
router.get('/employees', (req, res) => {
  const search = req.query.search || '';
  const location = req.query.location || '';
  const status = req.query.status || '';

  let query = 'SELECT * FROM employees WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR employee_code LIKE ? OR designation LIKE ? OR department LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (location) {
    query += ' AND work_location = ?';
    params.push(location);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY id DESC';
  const employees = db.prepare(query).all(...params);

  // Attach Gross Salary for each employee
  const getGross = db.prepare("SELECT SUM(amount) as total FROM salary_components WHERE employee_id = ? AND type = 'earning'");
  const employeesWithGross = employees.map(emp => {
    const gross = getGross.get(emp.id).total || 0;
    return { ...emp, gross_salary: gross };
  });

  const locations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);

  res.json({ employees: employeesWithGross, locations });
});

router.post('/employees', requireRole(['admin', 'hr']), (req, res) => {
  const { employee_code, name, designation, department, joining_date, work_location, pan, bank_name, bank_account, base_salary } = req.body;
  if (!name || !employee_code) {
    return res.status(400).json({ error: 'Name and Employee Code are required.' });
  }

  const result = db.prepare(`
    INSERT INTO employees (employee_code, name, designation, department, joining_date, work_location, pan, bank_name, bank_account, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(employee_code, name, designation || 'Staff', department || 'General', joining_date || new Date().toISOString().split('T')[0], work_location || 'Hazaribagh', pan || '', bank_name || '', bank_account || '');

  const empId = result.lastInsertRowid;

  // Insert default Basic Salary component
  const initialBase = parseFloat(base_salary) || 18000;
  db.prepare("INSERT INTO salary_components (employee_id, component_name, type, amount) VALUES (?, 'Basic Salary', 'earning', ?)").run(empId, initialBase);

  logAction(req.session.user.email, 'CREATE_EMPLOYEE', 'Employee', empId, { name, employee_code });
  res.json({ success: true, employee_id: empId });
});

router.put('/employees/:id', requireRole(['admin', 'hr']), (req, res) => {
  const { name, designation, department, work_location, status, pan, bank_name, bank_account } = req.body;
  db.prepare(`
    UPDATE employees 
    SET name = ?, designation = ?, department = ?, work_location = ?, status = ?, pan = ?, bank_name = ?, bank_account = ?
    WHERE id = ?
  `).run(name, designation, department, work_location, status, pan, bank_name, bank_account, req.params.id);

  logAction(req.session.user.email, 'UPDATE_EMPLOYEE', 'Employee', req.params.id, { name });
  res.json({ success: true });
});

router.get('/employees/:id/salary', (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found.' });

  const components = db.prepare('SELECT * FROM salary_components WHERE employee_id = ?').all(req.params.id);
  res.json({ employee, components });
});

router.post('/employees/:id/salary', requireRole(['admin', 'hr']), (req, res) => {
  const empId = req.params.id;
  const { component_name, type, amount } = req.body;

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare('DELETE FROM salary_components WHERE employee_id = ?').run(empId);

    const insertComp = db.prepare('INSERT INTO salary_components (employee_id, component_name, type, amount) VALUES (?, ?, ?, ?)');

    if (Array.isArray(component_name)) {
      for (let i = 0; i < component_name.length; i++) {
        if (component_name[i] && amount[i]) {
          insertComp.run(empId, component_name[i], type[i], parseFloat(amount[i]));
        }
      }
    } else if (component_name && amount) {
      insertComp.run(empId, component_name, type, parseFloat(amount));
    }

    db.exec('COMMIT');
    logAction(req.session.user.email, 'UPDATE_SALARY_STRUCTURE', 'Employee', empId);

    // Auto recalculate existing payslips
    const payslipsToUpdate = db.prepare('SELECT id, payroll_run_id FROM payslips WHERE employee_id = ?').all(empId);
    payslipsToUpdate.forEach(ps => {
      const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(ps.payroll_run_id);
      if (run) {
        // Calculate updated LOP formula
        const [yr, mo] = run.period.split('-').map(Number);
        const daysInMonth = (yr && mo) ? new Date(yr, mo, 0).getDate() : 31;
        const comps = db.prepare('SELECT * FROM salary_components WHERE employee_id = ?').all(empId);

        let grossPay = 0;
        let basicSalary = 0;
        let totalDeductions = 0;
        const earnings = [];
        const deductions = [];

        comps.forEach(c => {
          if (c.type === 'earning') {
            const val = Math.round(c.amount * 100) / 100;
            earnings.push({ name: c.component_name, amount: val, base_amount: val, prorated_amount: val });
            grossPay += val;
            if (c.component_name.toLowerCase().includes('basic')) basicSalary += val;
          } else if (c.type === 'deduction') {
            const val = Math.round(c.amount * 100) / 100;
            deductions.push({ name: c.component_name, amount: val });
            totalDeductions += val;
          }
        });
        if (basicSalary === 0) basicSalary = grossPay;

        const breakdownObj = {
          employee: { id: empId, name: req.body.empName || 'Employee' },
          period: run.period,
          days_in_month: daysInMonth,
          pay_date: run.pay_date,
          days_present: daysInMonth,
          days_lop: 0,
          earnings,
          deductions,
          gross_pay: grossPay,
          total_deductions: totalDeductions,
          net_pay: grossPay - totalDeductions,
          net_pay_in_words: numberToIndianWords(grossPay - totalDeductions)
        };

        db.prepare('UPDATE payslips SET gross_pay = ?, total_deductions = ?, net_pay = ?, breakdown_json = ? WHERE id = ?').run(
          grossPay, totalDeductions, grossPay - totalDeductions, JSON.stringify(breakdownObj), ps.id
        );
      }
    });

    res.json({ success: true });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// PAYROLL APIs
// ----------------------------------------------------
router.get('/payroll', (req, res) => {
  const runs = db.prepare(`
    SELECT r.*, COUNT(p.id) as total_payslips, COALESCE(SUM(p.net_pay), 0) as total_net_disbursed
    FROM payroll_runs r
    LEFT JOIN payslips p ON p.payroll_run_id = r.id
    GROUP BY r.id
    ORDER BY r.period DESC
  `).all();

  const activeEmployeesCount = db.prepare("SELECT COUNT(*) as count FROM employees WHERE status = 'active'").get().count;

  res.json({ runs, activeEmployeesCount });
});

router.post('/payroll', requireRole(['admin', 'hr']), (req, res) => {
  const { period, pay_date } = req.body;
  if (!period || !pay_date) {
    return res.status(400).json({ error: 'Period (YYYY-MM) and Pay Date are required.' });
  }

  const existing = db.prepare('SELECT * FROM payroll_runs WHERE period = ?').get(period);
  if (existing) {
    return res.status(400).json({ error: `Payroll run for period ${period} already exists.` });
  }

  const result = db.prepare("INSERT INTO payroll_runs (period, pay_date, status) VALUES (?, ?, 'draft')").run(period, pay_date);
  logAction(req.session.user.email, 'CREATE_PAYROLL_RUN', 'Payroll Run', result.lastInsertRowid, { period });
  res.json({ success: true, run_id: result.lastInsertRowid });
});

router.get('/payroll/:id', (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

  const payslips = db.prepare(`
    SELECT p.*, e.name as employee_name, e.employee_code, e.work_location, e.email as user_email
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    WHERE p.payroll_run_id = ?
    ORDER BY e.name ASC
  `).all(run.id);

  const activeEmployees = db.prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY name ASC").all();

  res.json({ run, payslips, activeEmployees });
});

router.post('/payroll/:id/calculate', requireRole(['admin', 'hr']), (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

  const [yearStr, monthStr] = run.period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const lopData = req.body.lop || {};
  const activeEmps = db.prepare("SELECT * FROM employees WHERE status = 'active'").all();

  db.exec('BEGIN TRANSACTION');
  try {
    const upsertAttendance = db.prepare(`
      INSERT INTO attendance_logs (employee_id, date, days_present, days_lop)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(employee_id, date) DO UPDATE SET days_present = excluded.days_present, days_lop = excluded.days_lop
    `);

    const insertPayslip = db.prepare(`
      INSERT INTO payslips (payroll_run_id, employee_id, gross_pay, total_deductions, net_pay, breakdown_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(payroll_run_id, employee_id) DO UPDATE SET
        gross_pay = excluded.gross_pay,
        total_deductions = excluded.total_deductions,
        net_pay = excluded.net_pay,
        breakdown_json = excluded.breakdown_json
    `);

    for (const emp of activeEmps) {
      let rawLop = parseFloat(lopData[emp.id] || 0);
      const lopDays = isNaN(rawLop) || rawLop < 0 ? 0 : (rawLop > daysInMonth ? daysInMonth : rawLop);
      const daysPresent = daysInMonth - lopDays;

      upsertAttendance.run(emp.id, run.period, daysPresent, lopDays);

      const components = db.prepare('SELECT * FROM salary_components WHERE employee_id = ?').all(emp.id);
      const earnings = [];
      const deductions = [];
      let grossPay = 0;
      let basicSalary = 0;
      let totalDeductions = 0;

      components.forEach(comp => {
        if (comp.type === 'earning') {
          const amount = Math.round(comp.amount * 100) / 100;
          earnings.push({ name: comp.component_name, amount, base_amount: amount, prorated_amount: amount });
          grossPay += amount;
          if (comp.component_name.toLowerCase().includes('basic')) basicSalary += amount;
        } else if (comp.type === 'deduction') {
          const amount = Math.round(comp.amount * 100) / 100;
          deductions.push({ name: comp.component_name, amount });
          totalDeductions += amount;
        }
      });

      if (basicSalary === 0) basicSalary = grossPay;

      if (lopDays > 0 && basicSalary > 0) {
        const lopDeductionAmount = Math.round((basicSalary * lopDays / daysInMonth) * 100) / 100;
        deductions.unshift({ name: `Loss of Pay (${lopDays} LOP Days)`, amount: lopDeductionAmount });
        totalDeductions += lopDeductionAmount;
      }

      grossPay = Math.round(grossPay * 100) / 100;
      totalDeductions = Math.round(totalDeductions * 100) / 100;
      const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

      const breakdown = {
        employee: { id: emp.id, name: emp.name, designation: emp.designation, department: emp.department, work_location: emp.work_location, pan: emp.pan, bank_name: emp.bank_name, bank_account: emp.bank_account },
        period: run.period,
        days_in_month: daysInMonth,
        pay_date: run.pay_date,
        days_present: daysPresent,
        days_lop: lopDays,
        earnings,
        deductions,
        gross_pay: grossPay,
        total_deductions: totalDeductions,
        net_pay: netPay,
        net_pay_in_words: numberToIndianWords(netPay)
      };

      insertPayslip.run(run.id, emp.id, grossPay, totalDeductions, netPay, JSON.stringify(breakdown));
    }

    db.exec('COMMIT');
    logAction(req.session.user.email, 'CALCULATE_PAYROLL', 'Payroll Run', run.id, { period: run.period });
    res.json({ success: true });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

router.post('/payroll/:id/approve', requireRole(['admin', 'hr']), async (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  res.json({ success: true });
});

router.post('/payroll/:id/send-email/:employeeId', requireRole(['admin', 'hr']), (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  const payslip = db.prepare(`
    SELECT p.*, e.name as employee_name, e.email as user_email
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    WHERE p.payroll_run_id = ? AND p.employee_id = ?
  `).get(req.params.id, req.params.employeeId);

  if (!run || !payslip) {
    return res.status(404).json({ error: 'Payslip record not found.' });
  }

  const targetEmail = payslip.user_email || `${payslip.employee_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@hiddenlamp.com`;
  const breakdown = JSON.parse(payslip.breakdown_json);
  const protocol = req.protocol;
  const host = req.get('host');
  const payslipDownloadUrl = `${protocol}://${host}/payroll/download/payslip/${run.id}/${payslip.employee_id}`;

  db.prepare("UPDATE payslips SET email_status = 'Sending...' WHERE id = ?").run(payslip.id);

  res.json({ success: true, message: `Email dispatch started for ${payslip.employee_name} (${targetEmail})` });

  setImmediate(async () => {
    try {
      await sendPayslipEmail({
        to: targetEmail,
        employeeName: payslip.employee_name,
        period: run.period,
        payDate: run.pay_date,
        grossPay: payslip.gross_pay,
        totalDeductions: payslip.total_deductions,
        netPay: payslip.net_pay,
        netPayInWords: breakdown.net_pay_in_words,
        breakdown,
        payslipDownloadUrl
      });
      db.prepare("UPDATE payslips SET email_status = 'Dispatched', email_sent_at = CURRENT_TIMESTAMP, email_error = NULL WHERE id = ?").run(payslip.id);
    } catch (err) {
      db.prepare("UPDATE payslips SET email_status = 'Failed', email_error = ? WHERE id = ?").run(err.message, payslip.id);
    }
  });
});

router.post('/payroll/:id/send-all-emails', requireRole(['admin', 'hr']), (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

  const payslips = db.prepare(`
    SELECT p.*, e.name as employee_name, e.email as user_email
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    WHERE p.payroll_run_id = ?
  `).all(run.id);

  db.prepare("UPDATE payslips SET email_status = 'Sending...' WHERE payroll_run_id = ?").run(run.id);
  res.json({ success: true, message: `Bulk email dispatch initiated for ${payslips.length} employees.` });

  const protocol = req.protocol;
  const host = req.get('host');

  setImmediate(async () => {
    for (const ps of payslips) {
      const targetEmail = ps.user_email || `${ps.employee_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@hiddenlamp.com`;
      const breakdown = JSON.parse(ps.breakdown_json);
      const payslipDownloadUrl = `${protocol}://${host}/payroll/download/payslip/${run.id}/${ps.employee_id}`;

      try {
        await sendPayslipEmail({
          to: targetEmail,
          employeeName: ps.employee_name,
          period: run.period,
          payDate: run.pay_date,
          grossPay: ps.gross_pay,
          totalDeductions: ps.total_deductions,
          netPay: ps.net_pay,
          netPayInWords: breakdown.net_pay_in_words,
          breakdown,
          payslipDownloadUrl
        });
        db.prepare("UPDATE payslips SET email_status = 'Dispatched', email_sent_at = CURRENT_TIMESTAMP, email_error = NULL WHERE id = ?").run(ps.id);
      } catch (e) {
        db.prepare("UPDATE payslips SET email_status = 'Failed', email_error = ? WHERE id = ?").run(e.message, ps.id);
      }
    }
  });
});

// ----------------------------------------------------
// PAYSLIPS APIs
// ----------------------------------------------------
router.get('/payslips', (req, res) => {
  const selectedMonth = req.query.month || '';
  const selectedYear = req.query.year || '';
  const searchQuery = req.query.search || '';

  let query = `
    SELECT p.*, r.period, r.status as run_status, e.name as employee_name, e.employee_code, e.work_location, e.email as user_email
    FROM payslips p
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    JOIN employees e ON p.employee_id = e.id
    WHERE 1=1
  `;
  const params = [];

  if (selectedYear && selectedMonth) {
    query += ' AND r.period = ?';
    params.push(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`);
  } else if (selectedYear) {
    query += ' AND r.period LIKE ?';
    params.push(`${selectedYear}-%`);
  } else if (selectedMonth) {
    query += ' AND r.period LIKE ?';
    params.push(`%-${String(selectedMonth).padStart(2, '0')}`);
  }

  if (searchQuery) {
    query += ' AND (e.name LIKE ? OR e.employee_code LIKE ? OR e.work_location LIKE ?)';
    const term = `%${searchQuery}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY r.period DESC, e.name ASC';
  const payslips = db.prepare(query).all(...params);

  const totalGenerated = payslips.length;
  const totalAmount = payslips.reduce((sum, p) => sum + p.net_pay, 0);

  const years = db.prepare("SELECT DISTINCT SUBSTR(period, 1, 4) as yr FROM payroll_runs ORDER BY yr DESC").all().map(r => r.yr);
  if (!years.includes('2026')) years.unshift('2026');

  const monthNames = [
    { num: '01', name: 'January' }, { num: '02', name: 'February' }, { num: '03', name: 'March' },
    { num: '04', name: 'April' }, { num: '05', name: 'May' }, { num: '06', name: 'June' },
    { num: '07', name: 'July' }, { num: '08', name: 'August' }, { num: '09', name: 'September' },
    { num: '10', name: 'October' }, { num: '11', name: 'November' }, { num: '12', name: 'December' }
  ];

  res.json({ payslips, totalGenerated, totalAmount, years, monthNames });
});

router.get('/payslips/:id', (req, res) => {
  const payslip = db.prepare(`
    SELECT p.*, r.period, r.pay_date, r.status as run_status
    FROM payslips p
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!payslip) return res.status(404).json({ error: 'Payslip not found.' });

  const breakdown = JSON.parse(payslip.breakdown_json);
  res.json({ payslip, breakdown });
});

// ----------------------------------------------------
// EXPENSES APIs
// ----------------------------------------------------
router.get('/expenses', (req, res) => {
  const travelExpenses = db.prepare(`
    SELECT t.*, e.name as employee_name, e.employee_code, e.work_location
    FROM travel_expenses t
    JOIN employees e ON t.employee_id = e.id
    ORDER BY t.start_date DESC
  `).all();

  const companyExpenses = db.prepare('SELECT * FROM company_expenses ORDER BY date DESC').all();
  const employees = db.prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY name ASC").all();

  res.json({ travelExpenses, companyExpenses, employees });
});

router.post('/expenses/travel', requireRole(['admin', 'hr']), (req, res) => {
  const { employee_id, claim_type, start_date, end_date, purpose, total_amount, advance_paid, status, receipt_ref, submission_source } = req.body;
  const tot = parseFloat(total_amount) || 0;
  const adv = parseFloat(advance_paid) || 0;
  const dues = tot - adv;

  db.prepare(`
    INSERT INTO travel_expenses (employee_id, claim_type, start_date, end_date, purpose, total_amount, advance_paid, dues_amount, status, receipt_ref, submission_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(employee_id, claim_type || 'Travel', start_date, end_date, purpose, tot, adv, dues, status || 'Pending', receipt_ref || '', submission_source || 'Admin Direct Entry');

  res.json({ success: true });
});

router.post('/expenses/company', requireRole(['admin', 'hr']), (req, res) => {
  const { title, category, amount, date, work_location, vendor_name, payment_mode, payment_status, invoice_ref } = req.body;
  db.prepare(`
    INSERT INTO company_expenses (title, category, amount, date, work_location, vendor_name, payment_mode, payment_status, invoice_ref)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, category || 'Office Operations', parseFloat(amount) || 0, date, work_location || 'Hazaribagh', vendor_name || '', payment_mode || 'Bank Transfer', payment_status || 'Paid', invoice_ref || '');

  res.json({ success: true });
});

// ----------------------------------------------------
// ANALYTICS APIs
// ----------------------------------------------------
router.get('/analytics', (req, res) => {
  const selectedYear = req.query.year || '';
  const selectedMonth = req.query.month || '';
  const selectedLocation = req.query.location || 'all';

  let payslipWhere = 'WHERE 1=1';
  const payslipParams = [];

  if (selectedYear && selectedMonth) {
    payslipWhere += ' AND r.period = ?';
    payslipParams.push(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`);
  } else if (selectedYear) {
    payslipWhere += ' AND r.period LIKE ?';
    payslipParams.push(`${selectedYear}-%`);
  } else if (selectedMonth) {
    payslipWhere += ' AND r.period LIKE ?';
    payslipParams.push(`%-${String(selectedMonth).padStart(2, '0')}`);
  }

  if (selectedLocation !== 'all') {
    payslipWhere += ' AND e.work_location = ?';
    payslipParams.push(selectedLocation);
  }

  const kpiPayroll = db.prepare(`
    SELECT 
      COALESCE(SUM(p.net_pay), 0) as total_net, 
      COALESCE(SUM(p.gross_pay), 0) as total_gross, 
      COALESCE(SUM(p.total_deductions), 0) as total_deductions
    FROM payslips p
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    JOIN employees e ON p.employee_id = e.id
    ${payslipWhere}
  `).get(...payslipParams);

  let expWhere = 'WHERE 1=1';
  const expParams = [];
  if (selectedLocation !== 'all') {
    expWhere += ' AND e.work_location = ?';
    expParams.push(selectedLocation);
  }

  const kpiExpenses = db.prepare(`
    SELECT 
      COALESCE(SUM(t.total_amount), 0) as total_claimed, 
      COALESCE(SUM(t.advance_paid), 0) as total_paid, 
      COALESCE(SUM(CASE WHEN t.status != 'Rejected' THEN t.dues_amount ELSE 0 END), 0) as total_dues
    FROM travel_expenses t
    JOIN employees e ON t.employee_id = e.id
    ${expWhere}
  `).get(...expParams);

  let compWhere = 'WHERE 1=1';
  const compParams = [];
  if (selectedLocation !== 'all') {
    compWhere += ' AND work_location = ?';
    compParams.push(selectedLocation);
  }

  const kpiCompany = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_overhead
    FROM company_expenses
    ${compWhere}
  `).get(...compParams);

  const payrollTrend = db.prepare(`
    SELECT r.period, COALESCE(SUM(p.gross_pay), 0) as gross_pay, COALESCE(SUM(p.total_deductions), 0) as deductions, COALESCE(SUM(p.net_pay), 0) as net_pay
    FROM payslips p
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    JOIN employees e ON p.employee_id = e.id
    ${payslipWhere}
    GROUP BY r.period
    ORDER BY r.period ASC
    LIMIT 12
  `).all(...payslipParams);

  const deptSpend = db.prepare(`
    SELECT COALESCE(e.department, 'Unassigned') as department, COUNT(DISTINCT e.id) as staff_count, COALESCE(SUM(p.gross_pay), 0) as total_gross, COALESCE(SUM(p.net_pay), 0) as total_net
    FROM payslips p
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    JOIN employees e ON p.employee_id = e.id
    ${payslipWhere}
    GROUP BY e.department
    ORDER BY total_net DESC
  `).all(...payslipParams);

  const locationSpend = db.prepare(`
    SELECT COALESCE(e.work_location, 'Main Office') as work_location, COUNT(DISTINCT e.id) as staff_count, COALESCE(SUM(p.gross_pay), 0) as total_gross, COALESCE(SUM(p.total_deductions), 0) as total_deductions, COALESCE(SUM(p.net_pay), 0) as total_net
    FROM payslips p
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    JOIN employees e ON p.employee_id = e.id
    ${payslipWhere}
    GROUP BY e.work_location
    ORDER BY total_net DESC
  `).all(...payslipParams);

  const expenseCategoryBreakdown = db.prepare(`
    SELECT 
      COALESCE(t.claim_type, 'Travel') as category,
      COUNT(t.id) as claim_count,
      COALESCE(SUM(t.total_amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN t.status != 'Rejected' THEN t.dues_amount ELSE 0 END), 0) as dues_amount
    FROM travel_expenses t
    JOIN employees e ON t.employee_id = e.id
    ${expWhere}
    GROUP BY t.claim_type
    ORDER BY total_amount DESC
  `).all(...expParams);

  const topExpenseEmployees = db.prepare(`
    SELECT e.name, e.employee_code, e.work_location, COUNT(t.id) as claim_count, COALESCE(SUM(t.total_amount), 0) as total_claimed, COALESCE(SUM(t.dues_amount), 0) as total_dues
    FROM travel_expenses t
    JOIN employees e ON t.employee_id = e.id
    ${expWhere}
    GROUP BY e.id
    ORDER BY total_claimed DESC
    LIMIT 5
  `).all(...expParams);

  const companyCategorySpend = db.prepare(`
    SELECT category, COUNT(id) as bill_count, COALESCE(SUM(amount), 0) as total_amount
    FROM company_expenses
    ${compWhere}
    GROUP BY category
    ORDER BY total_amount DESC
  `).all(...compParams);

  const years = db.prepare("SELECT DISTINCT SUBSTR(period, 1, 4) as yr FROM payroll_runs ORDER BY yr DESC").all().map(r => r.yr);
  if (!years.includes('2026')) years.unshift('2026');

  const monthNames = [
    { num: '01', name: 'January' }, { num: '02', name: 'February' }, { num: '03', name: 'March' },
    { num: '04', name: 'April' }, { num: '05', name: 'May' }, { num: '06', name: 'June' },
    { num: '07', name: 'July' }, { num: '08', name: 'August' }, { num: '09', name: 'September' },
    { num: '10', name: 'October' }, { num: '11', name: 'November' }, { num: '12', name: 'December' }
  ];

  const locations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);

  res.json({
    kpiPayroll,
    kpiExpenses,
    kpiCompany,
    payrollTrend,
    deptSpend,
    locationSpend,
    expenseCategoryBreakdown,
    topExpenseEmployees,
    companyCategorySpend,
    years,
    monthNames,
    locations
  });
});

// ----------------------------------------------------
// LOANS & SALARY ADVANCES APIs
// ----------------------------------------------------
router.get('/loans', requireRole(['admin', 'hr']), (req, res) => {
  try {
    const loans = db.prepare(`
      SELECT l.*, e.name as employee_name, e.employee_code, e.work_location, e.designation
      FROM employee_loans l
      JOIN employees e ON l.employee_id = e.id
      ORDER BY l.created_at DESC
    `).all();

    const employees = db.prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY name ASC").all();

    const totalLoansDisbursed = loans.reduce((sum, l) => sum + (l.loan_amount || 0), 0);
    const totalRepaid = loans.reduce((sum, l) => sum + (l.repaid_amount || 0), 0);
    const totalOutstanding = loans.reduce((sum, l) => sum + (l.remaining_balance || 0), 0);

    res.json({ loans, employees, totalLoansDisbursed, totalRepaid, totalOutstanding });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/loans', requireRole(['admin', 'hr']), (req, res) => {
  const { employee_id, loan_type, loan_amount, monthly_emi, disbursed_date, notes } = req.body;
  const amount = parseFloat(loan_amount) || 0;
  const emi = parseFloat(monthly_emi) || 0;

  if (!employee_id || amount <= 0 || emi <= 0 || !disbursed_date) {
    return res.status(400).json({ error: 'Please enter valid employee, loan amount, monthly EMI, and disbursed date.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO employee_loans (employee_id, loan_type, loan_amount, monthly_emi, repaid_amount, remaining_balance, disbursed_date, status, notes)
      VALUES (?, ?, ?, ?, 0, ?, ?, 'Active', ?)
    `).run(employee_id, loan_type || 'Salary Advance', amount, emi, amount, disbursed_date, notes || '');

    res.json({ success: true, message: 'Loan disbursed successfully.', loanId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/loans/:id', requireRole(['admin', 'hr']), (req, res) => {
  try {
    db.prepare('DELETE FROM employee_loans WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Loan record deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SYSTEM RESET & CLEANUP APIs
// ----------------------------------------------------
router.post('/system/reset-test-data', requireRole(['admin']), (req, res) => {
  const confirmText = (req.body.confirm || '').trim();
  if (confirmText !== 'CONFIRM RESET') {
    return res.status(400).json({ error: 'Safety check failed! Please type "CONFIRM RESET" to wipe test data.' });
  }

  try {
    db.prepare('DELETE FROM payslips').run();
    db.prepare('DELETE FROM payroll_runs').run();
    db.prepare('DELETE FROM employee_loans').run();
    db.prepare('DELETE FROM loan_repayments').run();
    db.prepare('DELETE FROM company_expenses').run();
    db.prepare('DELETE FROM travel_expenses').run();

    res.json({ success: true, message: 'All test data wiped cleanly! Ready for production.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// AUDIT LOGS APIs
// ----------------------------------------------------
router.get('/audit-logs', requireRole(['admin']), (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  res.json({ logs });
});

module.exports = router;
