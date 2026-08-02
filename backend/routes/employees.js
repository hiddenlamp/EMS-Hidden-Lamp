const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { numberToIndianWords } = require('../utils/numberToWords');

router.use(requireAuth);
router.use(requireRole(['admin', 'hr']));

// GET /employees
router.get('/', (req, res) => {
  const statusFilter = req.query.status || 'active';
  const locationFilter = req.query.location || 'all';
  const successMsg = req.query.success || null;

  let sql = 'SELECT * FROM employees WHERE 1=1';
  const params = [];

  if (statusFilter === 'active' || statusFilter === 'exited') {
    sql += ' AND status = ?';
    params.push(statusFilter);
  }

  if (locationFilter !== 'all') {
    sql += ' AND work_location = ?';
    params.push(locationFilter);
  }

  sql += ' ORDER BY name ASC';

  const employees = db.prepare(sql).all(...params);
  const locations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);

  res.render('employees/index', {
    employees,
    locations,
    statusFilter,
    locationFilter,
    success: successMsg
  });
});

// GET /employees/new
router.get('/new', (req, res) => {
  const locations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);
  res.render('employees/form', {
    employee: {},
    locations,
    isEdit: false,
    error: null
  });
});

// POST /employees/new
router.post('/new', (req, res) => {
  const {
    employee_code,
    name,
    designation,
    department,
    work_location,
    work_location_new,
    date_of_joining,
    email,
    payment_mode,
    pan,
    bank_name,
    bank_account,
    monthly_salary
  } = req.body;

  if (!name || !designation || !department || (!work_location && !work_location_new) || !date_of_joining) {
    const locations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);
    return res.status(400).render('employees/form', {
      employee: req.body,
      locations,
      isEdit: false,
      error: 'Please fill in all required fields.'
    });
  }

  let finalLocation = work_location;
  if (work_location === '__new__' && work_location_new) {
    finalLocation = work_location_new.trim();
  }

  try {
    db.exec('BEGIN TRANSACTION');

    const result = db.prepare(`
      INSERT INTO employees (employee_code, name, designation, department, work_location, date_of_joining, email, payment_mode, pan, bank_name, bank_account, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      employee_code ? employee_code.trim() : '',
      name.trim(),
      designation.trim(),
      department.trim(),
      finalLocation.trim(),
      date_of_joining,
      email ? email.trim() : '',
      payment_mode || 'Bank Transfer',
      pan ? pan.trim().toUpperCase() : '',
      bank_name ? bank_name.trim() : '',
      bank_account ? bank_account.trim() : ''
    );

    const empId = result.lastInsertRowid;

    // Default salary structure
    const baseSal = parseFloat(monthly_salary) || 15000;
    db.prepare(`
      INSERT INTO salary_components (employee_id, component_name, type, amount)
      VALUES (?, 'Basic Salary', 'earning', ?)
    `).run(empId, baseSal);

    db.exec('COMMIT');
    logAction((req.user || req.session?.user || {}).email || 'system', 'CREATE_EMPLOYEE', 'Employee', empId, { name: name.trim() });

    res.redirect('/employees?success=' + encodeURIComponent(`Employee ${name.trim()} created successfully.`));
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    const locations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);
    res.status(500).render('employees/form', {
      employee: req.body,
      locations,
      isEdit: false,
      error: err.message
    });
  }
});

// GET /employees/:id/edit
router.get('/:id/edit', (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!employee) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Employee not found.' });
  }

  const locations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);
  res.render('employees/form', {
    employee,
    locations,
    isEdit: true,
    error: null
  });
});

// POST /employees/:id/edit
router.post('/:id/edit', (req, res) => {
  const {
    employee_code,
    name,
    designation,
    department,
    work_location,
    work_location_new,
    date_of_joining,
    email,
    payment_mode,
    pan,
    bank_name,
    bank_account,
    status
  } = req.body;

  let finalLocation = work_location;
  if (work_location === '__new__' && work_location_new) {
    finalLocation = work_location_new.trim();
  }

  try {
    db.prepare(`
      UPDATE employees
      SET employee_code = ?, name = ?, designation = ?, department = ?, work_location = ?, date_of_joining = ?, email = ?, payment_mode = ?, pan = ?, bank_name = ?, bank_account = ?, status = ?
      WHERE id = ?
    `).run(
      employee_code ? employee_code.trim() : '',
      name.trim(),
      designation.trim(),
      department.trim(),
      finalLocation.trim(),
      date_of_joining,
      email ? email.trim() : '',
      payment_mode || 'Bank Transfer',
      pan ? pan.trim().toUpperCase() : '',
      bank_name ? bank_name.trim() : '',
      bank_account ? bank_account.trim() : '',
      status || 'active',
      req.params.id
    );

    logAction((req.user || req.session?.user || {}).email || 'system', 'UPDATE_EMPLOYEE', 'Employee', req.params.id, { name: name.trim(), status: status || 'active' });

    res.redirect('/employees?success=' + encodeURIComponent(`Employee ${name.trim()} updated successfully.`));
  } catch (err) {
    const locations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);
    res.status(500).render('employees/form', {
      employee: { ...req.body, id: req.params.id },
      locations,
      isEdit: true,
      error: err.message
    });
  }
});

// GET /employees/:id/salary
router.get('/:id/salary', (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!employee) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Employee not found.' });
  }

  const components = db.prepare('SELECT * FROM salary_components WHERE employee_id = ? ORDER BY type ASC, id ASC').all(req.params.id);

  res.render('employees/salary', {
    employee,
    components,
    error: null,
    success: req.query.saved ? 'Salary structure saved successfully!' : null
  });
});

// POST /employees/:id/salary
router.post('/:id/salary', (req, res) => {
  const employeeId = req.params.id;
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
  if (!employee) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Employee not found.' });
  }

  const names = Array.isArray(req.body.component_name) ? req.body.component_name : (req.body.component_name ? [req.body.component_name] : []);
  const types = Array.isArray(req.body.type) ? req.body.type : (req.body.type ? [req.body.type] : []);
  const amounts = Array.isArray(req.body.amount) ? req.body.amount : (req.body.amount ? [req.body.amount] : []);

  try {
    db.exec('BEGIN TRANSACTION');
    db.prepare('DELETE FROM salary_components WHERE employee_id = ?').run(employeeId);

    const insertStmt = db.prepare(`
      INSERT INTO salary_components (employee_id, component_name, type, amount)
      VALUES (?, ?, ?, ?)
    `);

    for (let i = 0; i < names.length; i++) {
      const compName = names[i] ? names[i].trim() : '';
      const compType = types[i] || 'earning';
      const compAmt = parseFloat(amounts[i]) || 0;

      if (compName) {
        insertStmt.run(employeeId, compName, compType, compAmt);
      }
    }

    // Immediately recalculate and reflect changes across existing payslips for this employee!
    const existingPayslips = db.prepare(`
      SELECT p.*, r.period, r.status as run_status
      FROM payslips p
      JOIN payroll_runs r ON p.payroll_run_id = r.id
      WHERE p.employee_id = ?
    `).all(employeeId);

    const updatedComponents = db.prepare('SELECT * FROM salary_components WHERE employee_id = ?').all(employeeId);

    existingPayslips.forEach(ps => {
      const breakdown = JSON.parse(ps.breakdown_json);
      const daysInMonth = breakdown.days_in_month || 30;
      const lopDays = breakdown.days_lop || 0;

      const earnings = [];
      const deductions = [];
      let grossPay = 0;
      let basicSalary = 0;
      let totalDeductions = 0;

      updatedComponents.forEach(comp => {
        if (comp.type === 'earning') {
          const compAmount = Math.round(comp.amount * 100) / 100;
          earnings.push({
            name: comp.component_name,
            base_amount: compAmount,
            prorated_amount: compAmount
          });
          grossPay += compAmount;
          if (comp.component_name.toLowerCase().includes('basic')) {
            basicSalary += compAmount;
          }
        } else if (comp.type === 'deduction') {
          const deductionAmount = Math.round(comp.amount * 100) / 100;
          deductions.push({
            name: comp.component_name,
            amount: deductionAmount
          });
          totalDeductions += deductionAmount;
        }
      });

      if (basicSalary === 0) {
        basicSalary = grossPay;
      }

      if (lopDays > 0 && basicSalary > 0) {
        const lopDeductionAmount = Math.round((basicSalary * lopDays / daysInMonth) * 100) / 100;
        deductions.unshift({
          name: `Loss of Pay (${lopDays} LOP Days)`,
          amount: lopDeductionAmount
        });
        totalDeductions += lopDeductionAmount;
      }

      grossPay = Math.round(grossPay * 100) / 100;
      totalDeductions = Math.round(totalDeductions * 100) / 100;
      const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;
      const netPayInWords = numberToIndianWords(netPay);

      breakdown.earnings = earnings;
      breakdown.deductions = deductions;
      breakdown.gross_pay = grossPay;
      breakdown.total_deductions = totalDeductions;
      breakdown.net_pay = netPay;
      breakdown.net_pay_in_words = netPayInWords;

      db.prepare(`
        UPDATE payslips
        SET gross_pay = ?, total_deductions = ?, net_pay = ?, breakdown_json = ?
        WHERE id = ?
      `).run(grossPay, totalDeductions, netPay, JSON.stringify(breakdown), ps.id);
    });

    db.exec('COMMIT');
    logAction((req.user || req.session?.user || {}).email || 'system', 'UPDATE_SALARY', 'Employee', employeeId, { num_components: names.length });

    res.redirect('/employees?success=' + encodeURIComponent(`Salary structure for ${employee.name} saved and payslips updated successfully.`));
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    const components = db.prepare('SELECT * FROM salary_components WHERE employee_id = ?').all(employeeId);
    res.status(500).render('employees/salary', {
      employee,
      components,
      error: err.message,
      success: null
    });
  }
});

module.exports = router;
