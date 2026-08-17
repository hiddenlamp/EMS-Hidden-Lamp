const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireRole(['admin', 'hr']));

// GET /payslips/live-status (Lightweight JSON endpoint for zero-reload AJAX badge polling)
router.get('/live-status', (req, res) => {
  try {
    const statuses = db.prepare(`
      SELECT id, email_status, email_sent_at, email_error, payment_status, payment_date
      FROM payslips 
      ORDER BY id DESC
    `).all();
    res.json({ success: true, statuses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /payslips (Global Payslip Directory with Month, Year, Location & Payment Status Filtering)
router.get('/', (req, res) => {
  const selectedYear = req.query.year || '';
  const selectedMonth = req.query.month || '';
  const selectedLocation = req.query.location || '';
  const selectedPaymentStatus = req.query.payment_status || '';
  const searchQuery = (req.query.search || '').trim();

  let sql = `
    SELECT p.*, e.name as employee_name, e.employee_code, e.designation, e.department, e.work_location, e.email as user_email, r.period, r.status as run_status
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    WHERE 1=1
  `;
  const params = [];

  if (selectedYear && selectedMonth) {
    const periodTarget = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    sql += ` AND r.period = ?`;
    params.push(periodTarget);
  } else if (selectedYear) {
    sql += ` AND r.period LIKE ?`;
    params.push(`${selectedYear}-%`);
  } else if (selectedMonth) {
    sql += ` AND r.period LIKE ?`;
    params.push(`%-${String(selectedMonth).padStart(2, '0')}`);
  }

  if (selectedLocation) {
    sql += ` AND e.work_location = ?`;
    params.push(selectedLocation);
  }

  if (selectedPaymentStatus === 'Paid') {
    sql += ` AND p.payment_status = 'Paid'`;
  } else if (selectedPaymentStatus === 'Pending') {
    sql += ` AND (p.payment_status IS NULL OR p.payment_status = 'Pending')`;
  }

  if (searchQuery) {
    sql += ` AND (e.name LIKE ? OR e.employee_code LIKE ? OR e.work_location LIKE ?)`;
    params.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
  }

  sql += ` ORDER BY r.period DESC, e.name ASC`;

  const payslips = db.prepare(sql).all(...params);

  // Available distinct locations, periods & years for dropdown filters
  let locations = db.prepare("SELECT DISTINCT work_location FROM employees WHERE work_location IS NOT NULL AND TRIM(work_location) != '' ORDER BY work_location ASC").all().map(r => r.work_location);
  if (!locations || locations.length === 0) {
    locations = ['Dantewada', 'Deoghar', 'Gomia', 'Gumla', 'Hazaribagh', 'Jaipur', 'Khunti', 'Patna', 'Ranchi', 'Sahibganj'];
  }
  const periods = db.prepare('SELECT DISTINCT period FROM payroll_runs ORDER BY period DESC').all().map(r => r.period);
  const years = db.prepare("SELECT DISTINCT SUBSTR(period, 1, 4) as yr FROM payroll_runs ORDER BY yr DESC").all().map(r => r.yr);
  if (!years.includes('2026')) years.unshift('2026');

  const monthNames = [
    { num: '01', name: 'January' },
    { num: '02', name: 'February' },
    { num: '03', name: 'March' },
    { num: '04', name: 'April' },
    { num: '05', name: 'May' },
    { num: '06', name: 'June' },
    { num: '07', name: 'July' },
    { num: '08', name: 'August' },
    { num: '09', name: 'September' },
    { num: '10', name: 'October' },
    { num: '11', name: 'November' },
    { num: '12', name: 'December' }
  ];

  const totalGenerated = payslips.length;
  const totalAmount = payslips.reduce((sum, p) => sum + p.net_pay, 0);
  const totalPaidAmount = payslips.reduce((sum, p) => sum + (p.payment_status === 'Paid' ? p.net_pay : 0), 0);
  const totalPendingAmount = payslips.reduce((sum, p) => sum + (p.payment_status !== 'Paid' ? p.net_pay : 0), 0);
  const paidCount = payslips.filter(p => p.payment_status === 'Paid').length;
  const pendingCount = payslips.filter(p => p.payment_status !== 'Paid').length;

  const success = req.query.success || null;
  const error = req.query.error || null;

  res.render('payslips/index', {
    payslips,
    totalGenerated,
    totalAmount,
    totalPaidAmount,
    totalPendingAmount,
    paidCount,
    pendingCount,
    locations,
    selectedLocation,
    selectedYear,
    selectedMonth,
    selectedPaymentStatus,
    searchQuery,
    periods,
    years,
    monthNames,
    success,
    error
  });
});

// POST /payslips/:id/delete (Delete a single payslip record)
router.post('/:id/delete', (req, res) => {
  try {
    db.prepare('DELETE FROM payslips WHERE id = ?').run(req.params.id);
    res.redirect('/payslips?success=' + encodeURIComponent('Payslip deleted successfully.'));
  } catch (err) {
    res.redirect('/payslips?error=' + encodeURIComponent(err.message));
  }
});

// POST /payslips/reset-test-data (Clear All Test Payroll Runs & Payslips)
router.post('/reset-test-data', (req, res) => {
  const confirmText = (req.body.confirm || '').trim();
  if (confirmText !== 'CONFIRM RESET') {
    return res.redirect('/payslips?error=' + encodeURIComponent('Safety check failed! Please type "CONFIRM RESET" to wipe test data.'));
  }

  try {
    db.prepare('DELETE FROM payslips').run();
    db.prepare('DELETE FROM payroll_runs').run();
    db.prepare('DELETE FROM employee_loans').run();
    db.prepare('DELETE FROM loan_repayments').run();
    db.prepare('DELETE FROM company_expenses').run();
    db.prepare('DELETE FROM travel_expenses').run();

    res.redirect('/payslips?success=' + encodeURIComponent('All test payroll runs, payslips, expenses, and loan records have been wiped cleanly! System is ready for live production data.'));
  } catch (err) {
    res.redirect('/payslips?error=' + encodeURIComponent(err.message));
  }
});

module.exports = router;
