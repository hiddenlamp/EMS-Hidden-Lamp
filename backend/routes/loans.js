const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');

router.use(requireAuth);
router.use(requireRole(['admin', 'hr']));

// GET /loans (View all loans & salary advances)
router.get('/', (req, res) => {
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
  const activeLoansCount = loans.filter(l => l.status === 'Active').length;

  const success = req.query.success || null;
  const error = req.query.error || null;

  res.render('loans/index', {
    loans,
    employees,
    totalLoansDisbursed,
    totalRepaid,
    totalOutstanding,
    activeLoansCount,
    success,
    error
  });
});

// POST /loans (Create / Disburse new loan or advance)
router.post('/', (req, res) => {
  const { employee_id, loan_type, loan_amount, monthly_emi, disbursed_date, notes } = req.body;
  const amount = parseFloat(loan_amount) || 0;
  const emi = parseFloat(monthly_emi) || 0;

  if (!employee_id || amount <= 0 || emi <= 0 || !disbursed_date) {
    return res.redirect('/loans?error=' + encodeURIComponent('Please enter valid employee, loan amount, monthly EMI, and disbursed date.'));
  }

  try {
    const result = db.prepare(`
      INSERT INTO employee_loans (employee_id, loan_type, loan_amount, monthly_emi, repaid_amount, remaining_balance, disbursed_date, status, notes)
      VALUES (?, ?, ?, ?, 0, ?, ?, 'Active', ?)
    `).run(employee_id, loan_type || 'Salary Advance', amount, emi, amount, disbursed_date, notes || '');

    logAction((req.user || req.session?.user || {}).email || 'system', 'CREATE_LOAN', 'Employee Loan', result.lastInsertRowid, { employee_id, loan_amount: amount, monthly_emi: emi });
    res.redirect('/loans?success=' + encodeURIComponent('Loan / Salary advance disbursed successfully!'));
  } catch (err) {
    res.redirect('/loans?error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/:id/repay (Manual Cash/Bank Repayment)
router.post('/:id/repay', (req, res) => {
  const loan = db.prepare('SELECT * FROM employee_loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.redirect('/loans?error=' + encodeURIComponent('Loan record not found.'));

  const repayAmount = parseFloat(req.body.amount) || 0;
  if (repayAmount <= 0) {
    return res.redirect('/loans?error=' + encodeURIComponent('Please enter a valid repayment amount.'));
  }

  const actualRepay = Math.min(repayAmount, loan.remaining_balance);
  const newRepaid = loan.repaid_amount + actualRepay;
  const newRemaining = Math.max(0, loan.remaining_balance - actualRepay);
  const newStatus = newRemaining <= 0 ? 'Completed' : 'Active';

  try {
    db.prepare(`
      UPDATE employee_loans 
      SET repaid_amount = ?, remaining_balance = ?, status = ?
      WHERE id = ?
    `).run(newRepaid, newRemaining, newStatus, loan.id);

    db.prepare(`
      INSERT INTO loan_repayments (loan_id, amount, payment_date, payment_type, notes)
      VALUES (?, ?, ?, 'Manual Cash/Bank', ?)
    `).run(loan.id, actualRepay, new Date().toISOString().substring(0, 10), req.body.notes || 'Manual repayment');

    logAction((req.user || req.session?.user || {}).email || 'system', 'REPAY_LOAN', 'Employee Loan', loan.id, { repaid: actualRepay, remaining: newRemaining });
    res.redirect('/loans?success=' + encodeURIComponent(`Repayment of ₹${actualRepay.toLocaleString('en-IN')} recorded successfully!`));
  } catch (err) {
    res.redirect('/loans?error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/:id/cancel (Cancel an active loan)
router.post('/:id/cancel', (req, res) => {
  try {
    db.prepare("UPDATE employee_loans SET status = 'Cancelled' WHERE id = ?").run(req.params.id);
    res.redirect('/loans?success=' + encodeURIComponent('Loan cancelled successfully.'));
  } catch (err) {
    res.redirect('/loans?error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/:id/delete (Delete a loan record)
router.post('/:id/delete', (req, res) => {
  try {
    db.prepare('DELETE FROM employee_loans WHERE id = ?').run(req.params.id);
    res.redirect('/loans?success=' + encodeURIComponent('Loan record deleted.'));
  } catch (err) {
    res.redirect('/loans?error=' + encodeURIComponent(err.message));
  }
});

module.exports = router;
