const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { numberToIndianWords } = require('../utils/numberToWords');
const { sendPayslipEmail } = require('../utils/mailer');
const { generatePayslipPDFBuffer } = require('../utils/pdfGenerator');
const { logAction } = require('../middleware/audit');
const htmlPdf = require('html-pdf-node');

// Helper to get total days in a given YYYY-MM period
function getDaysInMonth(periodStr) {
  if (!periodStr || !periodStr.includes('-')) return 30;
  const [year, month] = periodStr.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

// ----------------------------------------------------
// PUBLIC DIRECT PDF DOWNLOAD (No Login Required For Email Links)
// ----------------------------------------------------
router.get('/download/payslip/:id/:employeeId', async (req, res) => {
  const payslip = db.prepare(`
    SELECT p.*, e.employee_code, r.period, r.pay_date, r.status as run_status
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    WHERE p.payroll_run_id = ? AND p.employee_id = ?
  `).get(req.params.id, req.params.employeeId);

  if (!payslip) {
    return res.status(404).send('Payslip record not found.');
  }

  const breakdown = JSON.parse(payslip.breakdown_json);
  if (breakdown.employee) {
    breakdown.employee.employee_code = breakdown.employee.employee_code || payslip.employee_code || '';
  }
  breakdown.payment_status = payslip.payment_status || 'Pending';
  breakdown.payment_date = payslip.payment_date || null;

  try {
    const pdfBuffer = await generatePayslipPDFBuffer({
      breakdown,
      period: payslip.period,
      payDate: payslip.pay_date,
      grossPay: payslip.gross_pay,
      totalDeductions: payslip.total_deductions,
      netPay: payslip.net_pay,
      netPayInWords: breakdown.net_pay_in_words
    });

    const safeEmpName = (breakdown.employee?.name || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${safeEmpName}_${payslip.period}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).send('Error generating PDF: ' + err.message);
  }
});

// GET /payroll (List all runs & Calendar Month Picker)
router.get('/', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  const runs = db.prepare('SELECT * FROM payroll_runs ORDER BY period DESC').all();
  const selectedYear = parseInt(req.query.year) || 2026;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calendarMonths = monthNames.map((name, index) => {
    const monthNum = String(index + 1).padStart(2, '0');
    const period = `${selectedYear}-${monthNum}`;
    const daysInMonth = getDaysInMonth(period);
    const existingRun = runs.find(r => r.period === period);
    const lastDay = new Date(selectedYear, index + 1, 0).toISOString().substring(0, 10);

    return {
      name,
      monthNum,
      period,
      daysInMonth,
      lastDay,
      existingRun: existingRun || null
    };
  });

  res.render('payroll/index', {
    runs,
    selectedYear,
    calendarMonths,
    error: null,
    success: req.query.success || null
  });
});

// POST /payroll (Create new run)
router.post('/', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  const { period, pay_date } = req.body;
  if (!period || !pay_date) {
    return res.redirect('/payroll');
  }

  try {
    const result = db.prepare(`
      INSERT INTO payroll_runs (period, pay_date, status)
      VALUES (?, ?, 'draft')
    `).run(period.trim(), pay_date.trim());

    logAction((req.user || req.session?.user || {}).email || 'system', 'CREATE_PAYROLL', 'Payroll Run', result.lastInsertRowid, { period: period.trim() });
    res.redirect(`/payroll/${result.lastInsertRowid}`);
  } catch (err) {
    const isDuplicate = err.message.includes('UNIQUE');
    if (isDuplicate) {
      const existing = db.prepare('SELECT id FROM payroll_runs WHERE period = ?').get(period.trim());
      if (existing) return res.redirect(`/payroll/${existing.id}`);
    }
    res.status(400).render('error', { title: 'Error', message: err.message });
  }
});

// GET /payroll/:id (View run details, Calendar days & LOP entry)
router.get('/:id', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  if (!run) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Payroll run not found.' });
  }

  const daysInMonth = getDaysInMonth(run.period);
  const employees = db.prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY work_location ASC, name ASC").all();

  const attendanceRows = db.prepare('SELECT * FROM attendance WHERE period = ?').all(run.period);
  const attendanceMap = {};
  attendanceRows.forEach(row => {
    attendanceMap[row.employee_id] = row.days_lop;
  });

  const payslips = db.prepare(`
    SELECT p.*, e.name as employee_name, e.designation, e.department, e.work_location, e.email as user_email
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    WHERE p.payroll_run_id = ?
    ORDER BY e.work_location ASC, e.name ASC
  `).all(run.id);

  res.render('payroll/show', {
    run,
    daysInMonth,
    employees,
    attendanceMap,
    payslips,
    error: null,
    success: req.query.success ? req.query.success : null
  });
});

// POST /payroll/:id/calculate (Calendar-day basis proration)
router.post('/:id/calculate', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  if (!run) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Payroll run not found.' });
  }

  if (run.status === 'approved') {
    return res.status(400).render('error', { title: 'Action Locked', message: 'This payroll run is approved and locked.' });
  }

  const daysInMonth = getDaysInMonth(run.period);
  const lopData = req.body.lop || {};
  const activeEmployees = db.prepare("SELECT * FROM employees WHERE status = 'active'").all();

  try {
    db.exec('BEGIN TRANSACTION');
    db.prepare('DELETE FROM payslips WHERE payroll_run_id = ?').run(run.id);

    const upsertAttendance = db.prepare(`
      INSERT INTO attendance (employee_id, period, days_present, days_lop)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(employee_id, period) DO UPDATE SET
        days_present = excluded.days_present,
        days_lop = excluded.days_lop
    `);

    const insertPayslip = db.prepare(`
      INSERT INTO payslips (payroll_run_id, employee_id, gross_pay, total_deductions, net_pay, breakdown_json, email_status)
      VALUES (?, ?, ?, ?, ?, ?, 'Not Sent')
    `);

    for (const emp of activeEmployees) {
      let rawLop;
      if (lopData[emp.id] !== undefined && lopData[emp.id] !== '') {
        rawLop = parseFloat(lopData[emp.id]);
      } else {
        const autoLop = db.prepare(`
          SELECT 
            SUM(CASE WHEN status = 'Absence' THEN 1 ELSE 0 END) +
            SUM(CASE WHEN status = 'Half Day' THEN 0.5 ELSE 0 END) as total_lop
          FROM attendance_logs
          WHERE employee_id = ? AND date LIKE ?
        `).get(emp.id, `${run.period}%`);
        rawLop = (autoLop && autoLop.total_lop) ? autoLop.total_lop : 0;
      }
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

      // Check for active loan / salary advance for this employee
      const activeLoan = db.prepare("SELECT * FROM employee_loans WHERE employee_id = ? AND status = 'Active' AND remaining_balance > 0").get(emp.id);
      if (activeLoan && activeLoan.monthly_emi > 0) {
        const emiToDeduct = Math.min(activeLoan.monthly_emi, activeLoan.remaining_balance);
        const roundedEmi = Math.round(emiToDeduct * 100) / 100;
        deductions.push({
          name: `Loan / Advance EMI (${activeLoan.loan_type})`,
          amount: roundedEmi,
          loan_id: activeLoan.id
        });
        totalDeductions += roundedEmi;
      }

      grossPay = Math.round(grossPay * 100) / 100;
      totalDeductions = Math.round(totalDeductions * 100) / 100;
      const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;
      const netPayInWords = numberToIndianWords(netPay);

      const breakdown = {
        employee: {
          id: emp.id,
          employee_code: emp.employee_code || '',
          name: emp.name,
          designation: emp.designation,
          department: emp.department,
          work_location: emp.work_location,
          pan: emp.pan,
          bank_name: emp.bank_name,
          bank_account: emp.bank_account
        },
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
        net_pay_in_words: netPayInWords
      };

      insertPayslip.run(
        run.id,
        emp.id,
        grossPay,
        totalDeductions,
        netPay,
        JSON.stringify(breakdown)
      );
    }

    db.exec('COMMIT');
    logAction((req.user || req.session?.user || {}).email || 'system', 'CALCULATE_PAYROLL', 'Payroll Run', run.id, { period: run.period });
    res.redirect(`/payroll/${run.id}?success=Payroll+calculated+successfully+on+${daysInMonth}-day+calendar+basis.`);
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    res.status(500).render('error', { title: 'Calculation Error', message: err.message });
  }
});

// POST /payroll/:id/approve (Lock run & Non-blocking Async Bulk Email Dispatch)
router.post('/:id/approve', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  if (!run) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Payroll run not found.' });
  }

  db.prepare("UPDATE payroll_runs SET status = 'approved' WHERE id = ?").run(run.id);
  logAction((req.user || req.session?.user || {}).email || 'system', 'APPROVE_PAYROLL', 'Payroll Run', run.id, { period: run.period });

  // Process Loan Repayments for all payslips in this approved run
  const payslipsForRun = db.prepare('SELECT * FROM payslips WHERE payroll_run_id = ?').all(run.id);
  for (const ps of payslipsForRun) {
    try {
      const breakdown = JSON.parse(ps.breakdown_json);
      if (breakdown && Array.isArray(breakdown.deductions)) {
        for (const d of breakdown.deductions) {
          if (d.loan_id && d.amount > 0) {
            const loan = db.prepare('SELECT * FROM employee_loans WHERE id = ?').get(d.loan_id);
            if (loan && loan.status === 'Active') {
              const actualRepay = Math.min(d.amount, loan.remaining_balance);
              const newRepaid = loan.repaid_amount + actualRepay;
              const newRemaining = Math.max(0, loan.remaining_balance - actualRepay);
              const newStatus = newRemaining <= 0 ? 'Completed' : 'Active';

              db.prepare('UPDATE employee_loans SET repaid_amount = ?, remaining_balance = ?, status = ? WHERE id = ?')
                .run(newRepaid, newRemaining, newStatus, loan.id);

              db.prepare(`
                INSERT INTO loan_repayments (loan_id, payroll_run_id, amount, payment_date, payment_type, notes)
                VALUES (?, ?, ?, ?, 'Payroll EMI Deduction', ?)
              `).run(loan.id, run.id, actualRepay, run.pay_date || new Date().toISOString().substring(0, 10), `Payroll deduction for period ${run.period}`);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Loan repayment update error:', e.message);
    }
  }

  // NOTE: Emails are NEVER sent automatically on approval.
  // Emails are strictly sent ON-DEMAND when clicking 'Email' for an individual employee.
  res.redirect(`/payroll/${run.id}?success=Payroll+run+approved+and+locked.`);
});

// POST /payroll/:id/send-email/:employeeId (Instant Non-Blocking Single Email Dispatch)
router.post('/:id/send-email/:employeeId', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  const payslip = db.prepare(`
    SELECT p.*, e.name as employee_name, e.email as user_email
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    WHERE p.payroll_run_id = ? AND p.employee_id = ?
  `).get(req.params.id, req.params.employeeId);

  if (!run || !payslip) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Payslip record not found.' });
  }

  const targetEmail = payslip.user_email || `${payslip.employee_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@hiddenlamp.com`;
  const breakdown = JSON.parse(payslip.breakdown_json);
  const protocol = req.protocol;
  const host = req.get('host');
  const payslipDownloadUrl = `${protocol}://${host}/payroll/download/payslip/${run.id}/${payslip.employee_id}`;
  const redirectPath = req.body.redirect || `/payroll/${run.id}`;

  // Update status in DB to 'Sending...' immediately
  db.prepare("UPDATE payslips SET email_status = 'Sending...' WHERE id = ?").run(payslip.id);

  const targetRedirectUrl = redirectPath === '/payslips' 
    ? `/payslips?search=${encodeURIComponent(payslip.employee_name)}&success=${encodeURIComponent('Email dispatch started for ' + payslip.employee_name + ' (' + targetEmail + ')! Check status badge below.')}`
    : `${redirectPath}?success=${encodeURIComponent('Email dispatch started for ' + payslip.employee_name + ' (' + targetEmail + ')! Check status badge.')}`;

  // ⚡ INSTANT RESPONSE IN 5ms!
  res.redirect(targetRedirectUrl);

  // Asynchronous Background Worker Execution
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
      console.log(`✅ Single Email dispatched to ${targetEmail}`);
    } catch (err) {
      db.prepare("UPDATE payslips SET email_status = 'Failed', email_error = ? WHERE id = ?").run(err.message, payslip.id);
      console.error(`⚠️ Single Email error for ${targetEmail}:`, err.message);
    }
  });
});

// POST /payroll/:id/send-all-emails (Instant Non-Blocking Bulk Email Dispatch)
router.post('/:id/send-all-emails', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  if (!run) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Payroll run not found.' });
  }

  const payslips = db.prepare(`
    SELECT p.*, e.name as employee_name, e.email as user_email
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    WHERE p.payroll_run_id = ?
  `).all(run.id);

  // Update status in DB to 'Sending...' for all payslips
  db.prepare("UPDATE payslips SET email_status = 'Sending...' WHERE payroll_run_id = ?").run(run.id);

  const protocol = req.protocol;
  const host = req.get('host');

  // ⚡ INSTANT RESPONSE IN 5ms!
  res.redirect(`/payroll/${run.id}?success=${encodeURIComponent('Bulk email dispatch initiated for ' + payslips.length + ' employees! Track status badges below.')}`);

  // Asynchronous Background Worker Execution
  setImmediate(async () => {
    console.log(`🚀 Starting Bulk Background Email Dispatch for ${payslips.length} employees...`);
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
        console.error(`⚠️ Bulk Email error for ${targetEmail}:`, e.message);
      }
    }
    console.log(`✅ Bulk Email Dispatch Complete!`);
  });
});

// GET /payroll/:id/payslip/:employeeId (Single printable payslip)
router.get('/:id/payslip/:employeeId', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  const payslip = db.prepare(`
    SELECT p.*, e.employee_code, r.period, r.pay_date, r.status as run_status
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    WHERE p.payroll_run_id = ? AND p.employee_id = ?
  `).get(req.params.id, req.params.employeeId);

  if (!payslip) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Payslip not found for this run.' });
  }

  const breakdown = JSON.parse(payslip.breakdown_json);
  if (breakdown.employee) {
    breakdown.employee.employee_code = breakdown.employee.employee_code || payslip.employee_code || '';
  }
  breakdown.payment_status = payslip.payment_status || 'Pending';
  breakdown.payment_date = payslip.payment_date || null;
  res.render('payslips/single', { payslip, breakdown });
});

// GET /payroll/:id/payslip/:employeeId/pdf (Admin Download PDF payslip via PDFKit)
router.get('/:id/payslip/:employeeId/pdf', requireAuth, requireRole(['admin', 'hr']), async (req, res) => {
  const payslip = db.prepare(`
    SELECT p.*, e.employee_code, r.period, r.pay_date, r.status as run_status
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    WHERE p.payroll_run_id = ? AND p.employee_id = ?
  `).get(req.params.id, req.params.employeeId);

  if (!payslip) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Payslip not found for this run.' });
  }

  const breakdown = JSON.parse(payslip.breakdown_json);
  if (breakdown.employee) {
    breakdown.employee.employee_code = breakdown.employee.employee_code || payslip.employee_code || '';
  }
  breakdown.payment_status = payslip.payment_status || 'Pending';
  breakdown.payment_date = payslip.payment_date || null;

  try {
    const pdfBuffer = await generatePayslipPDFBuffer({
      breakdown,
      period: payslip.period,
      payDate: payslip.pay_date,
      grossPay: payslip.gross_pay,
      totalDeductions: payslip.total_deductions,
      netPay: payslip.net_pay,
      netPayInWords: breakdown.net_pay_in_words
    });

    const safeEmpName = (breakdown.employee?.name || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${safeEmpName}_${payslip.period}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).send('Error generating PDF: ' + err.message);
  }
});

// GET /payroll/:id/print-all (2-up per A4 sheet print view)
router.get('/:id/print-all', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  if (!run) {
    return res.status(404).render('error', { title: '404 Not Found', message: 'Payroll run not found.' });
  }

  const payslips = db.prepare(`
    SELECT p.*, e.employee_code
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    WHERE p.payroll_run_id = ?
    ORDER BY e.work_location ASC, e.name ASC
  `).all(run.id);

  const payslipBreakdowns = payslips.map(p => {
    const bd = JSON.parse(p.breakdown_json);
    if (bd.employee) {
      bd.employee.employee_code = bd.employee.employee_code || p.employee_code || '';
    }
    bd.payment_status = p.payment_status || 'Pending';
    bd.payment_date = p.payment_date || null;
    return {
      ...p,
      breakdown: bd
    };
  });

  res.render('payslips/print_all', {
    run,
    payslips: payslipBreakdowns
  });
});

// POST /payroll/payslips/:id/payment-status (Toggle or set salary payment status: Pending <-> Paid)
router.post('/payslips/:id/payment-status', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  try {
    const payslip = db.prepare('SELECT p.*, e.name as employee_name FROM payslips p JOIN employees e ON p.employee_id = e.id WHERE p.id = ?').get(req.params.id);
    if (!payslip) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
        return res.status(404).json({ success: false, error: 'Payslip not found.' });
      }
      return res.redirect('back');
    }

    const requestedStatus = req.body.status;
    const newStatus = requestedStatus || (payslip.payment_status === 'Paid' ? 'Pending' : 'Paid');
    const paymentDate = newStatus === 'Paid' ? (req.body.payment_date || new Date().toISOString().replace('T', ' ').substring(0, 19)) : null;
    const paymentRef = req.body.payment_reference || payslip.payment_reference || null;

    db.prepare(`
      UPDATE payslips
      SET payment_status = ?, payment_date = ?, payment_reference = ?
      WHERE id = ?
    `).run(newStatus, paymentDate, paymentRef, payslip.id);

    logAction((req.user || req.session?.user || {}).email || 'system', 'UPDATE_PAYSLIP_PAYMENT_STATUS', 'Payslip', payslip.id, {
      employee: payslip.employee_name,
      status: newStatus
    });

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.json({
        success: true,
        payslip_id: payslip.id,
        payment_status: newStatus,
        payment_date: paymentDate
      });
    }

    const redirectUrl = req.body.redirect || req.get('Referrer') || `/payroll/${payslip.payroll_run_id}`;
    res.redirect(redirectUrl);
  } catch (err) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.redirect('back');
  }
});

// POST /payroll/:id/mark-all-paid (Bulk mark all payslips in a run as Paid)
router.post('/:id/mark-all-paid', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  try {
    const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
    if (!run) {
      return res.status(404).render('error', { title: '404 Not Found', message: 'Payroll run not found.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare(`
      UPDATE payslips
      SET payment_status = 'Paid', payment_date = COALESCE(payment_date, ?)
      WHERE payroll_run_id = ?
    `).run(now, run.id);

    logAction((req.user || req.session?.user || {}).email || 'system', 'MARK_ALL_PAYSLIPS_PAID', 'Payroll Run', run.id, { period: run.period });

    const redirectUrl = req.body.redirect || `/payroll/${run.id}?success=${encodeURIComponent('All employee salaries for ' + run.period + ' marked as Paid!')}`;
    res.redirect(redirectUrl);
  } catch (err) {
    res.status(500).render('error', { title: 'Error', message: err.message });
  }
});

// GET /payroll/:id/report (CSV Report Download)
router.get('/:id/report', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
  if (!run) {
    return res.status(404).send('Payroll run not found.');
  }

  const payslips = db.prepare(`
    SELECT p.*, e.employee_code, e.name as employee_name, e.designation, e.department, e.work_location, e.bank_name, e.bank_account, e.payment_mode
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    WHERE p.payroll_run_id = ?
    ORDER BY e.work_location ASC, e.name ASC
  `).all(run.id);

  let csvContent = 'Employee ID,Name,Designation,Department,Location,Payment Mode,Bank Name,Account Number,Gross Pay,Total Deductions,Net Pay\n';
  
  payslips.forEach(ps => {
    const code = ps.employee_code || ('#' + ps.employee_id);
    const row = [
      `"${code}"`,
      `"${ps.employee_name}"`,
      `"${ps.designation}"`,
      `"${ps.department}"`,
      `"${ps.work_location}"`,
      `"${ps.payment_mode || 'Bank Transfer'}"`,
      `"${ps.bank_name || ''}"`,
      `"${ps.bank_account || ''}"`,
      ps.gross_pay,
      ps.total_deductions,
      ps.net_pay
    ].join(',');
    csvContent += row + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="Payroll_Report_${run.period}.csv"`);
  res.send(csvContent);
});

// POST /payroll/:id/delete (Delete a payroll run and its payslips)
router.post('/:id/delete', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  try {
    const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
    if (!run) {
      return res.redirect('/payroll?error=' + encodeURIComponent('Payroll run not found.'));
    }

    db.prepare('DELETE FROM payslips WHERE payroll_run_id = ?').run(run.id);
    db.prepare('DELETE FROM payroll_runs WHERE id = ?').run(run.id);

    logAction((req.user || req.session?.user || {}).email || 'system', 'DELETE_PAYROLL_RUN', 'Payroll Run', run.id, { period: run.period });
    res.redirect('/payroll?success=' + encodeURIComponent(`Payroll run for ${run.period} reset & unlocked successfully.`));
  } catch (err) {
    res.redirect('/payroll?error=' + encodeURIComponent(err.message));
  }
});

// POST /payroll/reset-all-runs (Wipe all test payroll runs and payslips)
router.post('/reset-all-runs', requireAuth, requireRole(['admin', 'hr']), (req, res) => {
  try {
    db.prepare('DELETE FROM payslips').run();
    db.prepare('DELETE FROM payroll_runs').run();

    logAction((req.user || req.session?.user || {}).email || 'system', 'RESET_ALL_PAYROLL_RUNS', 'Payroll System', null, {});
    res.redirect('/payroll?success=' + encodeURIComponent('All payroll runs and payslips have been reset successfully!'));
  } catch (err) {
    res.redirect('/payroll?error=' + encodeURIComponent(err.message));
  }
});

module.exports = router;
