const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');

router.use(requireAuth);
router.use(requireRole(['admin', 'hr']));

// GET /loans (Corporate Loans, Vendor Credit Lines & Fund Rotations Dashboard)
router.get('/', (req, res) => {
  const companyLoans = db.prepare('SELECT * FROM company_loans ORDER BY created_at DESC').all();
  const fundRotations = db.prepare('SELECT * FROM fund_rotations ORDER BY created_at DESC').all();

  // Distinct projects for dropdown selection
  const projects = db.prepare("SELECT DISTINCT project_name FROM company_expenses WHERE project_name IS NOT NULL AND TRIM(project_name) != '' ORDER BY project_name ASC").all().map(p => p.project_name);
  if (!projects.includes('Gomia Project Site')) projects.unshift('Gomia Project Site');
  if (!projects.includes('General Corporate Treasury')) projects.unshift('General Corporate Treasury');

  // Company Loan Metrics
  const totalDebt = companyLoans.reduce((sum, l) => sum + (l.principal_amount || 0), 0);
  const totalRepaidDebt = companyLoans.reduce((sum, l) => sum + (l.repaid_amount || 0), 0);
  const outstandingDebt = companyLoans.reduce((sum, l) => sum + (l.remaining_balance || 0), 0);

  // Fund Rotation Metrics
  const totalRotatedCapital = fundRotations.reduce((sum, r) => sum + (r.amount || 0), 0);
  const activeRotationsCount = fundRotations.filter(r => r.status === 'In Rotation').length;
  const activeRotatedAmount = fundRotations.filter(r => r.status === 'In Rotation').reduce((sum, r) => sum + Math.max(0, (r.amount || 0) - (r.settled_amount || 0)), 0);

  const success = req.query.success || null;
  const error = req.query.error || null;
  const activeTab = req.query.tab || 'company_loans';

  res.render('loans/index', {
    companyLoans,
    fundRotations,
    projects,
    totalDebt,
    totalRepaidDebt,
    outstandingDebt,
    totalRotatedCapital,
    activeRotationsCount,
    activeRotatedAmount,
    activeTab,
    success,
    error
  });
});

// POST /loans/company-loan (Disburse Corporate Loan or Vendor Credit Line)
router.post('/company-loan', (req, res) => {
  const { lender_name, lender_type, project_name, principal_amount, interest_rate, disbursed_date, due_date, notes } = req.body;
  const principal = parseFloat(principal_amount) || 0;
  const rate = parseFloat(interest_rate) || 0;

  if (!lender_name || principal <= 0 || !disbursed_date) {
    return res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent('Please enter valid lender name, principal amount, and disbursed date.'));
  }

  const totalPayable = Math.round((principal + (principal * (rate / 100))) * 100) / 100;

  try {
    const result = db.prepare(`
      INSERT INTO company_loans (lender_name, lender_type, project_name, principal_amount, interest_rate, total_payable, repaid_amount, remaining_balance, disbursed_date, due_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'Active', ?)
    `).run(lender_name, lender_type || 'Bank / NBFC', project_name || 'General Corporate Treasury', principal, rate, totalPayable, totalPayable, disbursed_date, due_date || null, notes || '');

    logAction((req.user || req.session?.user || {}).email || 'system', 'CREATE_COMPANY_LOAN', 'Corporate Loan', result.lastInsertRowid, { lender_name, principal });
    res.redirect('/loans?tab=company_loans&success=' + encodeURIComponent('Corporate loan / credit line recorded successfully!'));
  } catch (err) {
    res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/company-loan/:id/repay (Repay Corporate Loan)
router.post('/company-loan/:id/repay', (req, res) => {
  const loan = db.prepare('SELECT * FROM company_loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent('Loan record not found.'));

  const amount = parseFloat(req.body.amount) || 0;
  if (amount <= 0) return res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent('Please enter a valid repayment amount.'));

  const actualRepay = Math.min(amount, loan.remaining_balance);
  const newRepaid = Math.round((loan.repaid_amount + actualRepay) * 100) / 100;
  const newRemaining = Math.max(0, Math.round((loan.remaining_balance - actualRepay) * 100) / 100);
  const newStatus = newRemaining <= 0 ? 'Fully Repaid' : 'Active';

  try {
    db.prepare('UPDATE company_loans SET repaid_amount = ?, remaining_balance = ?, status = ? WHERE id = ?')
      .run(newRepaid, newRemaining, newStatus, loan.id);

    res.redirect('/loans?tab=company_loans&success=' + encodeURIComponent(`Repayment of ₹${actualRepay.toLocaleString('en-IN')} recorded successfully!`));
  } catch (err) {
    res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/company-loan/:id/delete (Delete Corporate Loan)
router.post('/company-loan/:id/delete', (req, res) => {
  try {
    db.prepare('DELETE FROM company_loans WHERE id = ?').run(req.params.id);
    res.redirect('/loans?tab=company_loans&success=' + encodeURIComponent('Corporate loan record deleted.'));
  } catch (err) {
    res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/fund-rotation (Record Inter-Project Fund Rotation / Transfer)
router.post('/fund-rotation', (req, res) => {
  const { source_pool, destination_project, rotation_purpose, amount, transfer_date, reference_no, managed_by, notes } = req.body;
  const transferAmount = parseFloat(amount) || 0;

  if (!source_pool || !destination_project || transferAmount <= 0 || !transfer_date) {
    return res.redirect('/loans?tab=fund_rotations&error=' + encodeURIComponent('Please enter valid source, destination project, amount, and date.'));
  }

  try {
    const result = db.prepare(`
      INSERT INTO fund_rotations (source_pool, destination_project, rotation_purpose, amount, transfer_date, settled_amount, status, reference_no, managed_by, notes)
      VALUES (?, ?, ?, ?, ?, 0, 'In Rotation', ?, ?, ?)
    `).run(source_pool, destination_project, rotation_purpose || 'Working Capital Rotation', transferAmount, transfer_date, reference_no || '', managed_by || '', notes || '');

    logAction((req.user || req.session?.user || {}).email || 'system', 'CREATE_FUND_ROTATION', 'Fund Rotation', result.lastInsertRowid, { source_pool, destination_project, amount: transferAmount });
    res.redirect('/loans?tab=fund_rotations&success=' + encodeURIComponent('Inter-project fund rotation recorded successfully!'));
  } catch (err) {
    res.redirect('/loans?tab=fund_rotations&error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/fund-rotation/:id/settle (Settle / Return Fund Rotation)
router.post('/fund-rotation/:id/settle', (req, res) => {
  const rotation = db.prepare('SELECT * FROM fund_rotations WHERE id = ?').get(req.params.id);
  if (!rotation) return res.redirect('/loans?tab=fund_rotations&error=' + encodeURIComponent('Rotation record not found.'));

  const amount = parseFloat(req.body.amount) || 0;
  if (amount <= 0) return res.redirect('/loans?tab=fund_rotations&error=' + encodeURIComponent('Please enter a valid settlement amount.'));

  const actualSettled = Math.min(amount, rotation.amount - rotation.settled_amount);
  const newSettled = Math.round((rotation.settled_amount + actualSettled) * 100) / 100;
  const newStatus = newSettled >= rotation.amount ? 'Settled / Returned' : 'In Rotation';

  try {
    db.prepare('UPDATE fund_rotations SET settled_amount = ?, status = ? WHERE id = ?')
      .run(newSettled, newStatus, rotation.id);

    res.redirect('/loans?tab=fund_rotations&success=' + encodeURIComponent(`Fund rotation settlement of ₹${actualSettled.toLocaleString('en-IN')} recorded!`));
  } catch (err) {
    res.redirect('/loans?tab=fund_rotations&error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/fund-rotation/:id/delete (Delete Fund Rotation Record)
router.post('/fund-rotation/:id/delete', (req, res) => {
  try {
    db.prepare('DELETE FROM fund_rotations WHERE id = ?').run(req.params.id);
    res.redirect('/loans?tab=fund_rotations&success=' + encodeURIComponent('Fund rotation record deleted.'));
  } catch (err) {
    res.redirect('/loans?tab=fund_rotations&error=' + encodeURIComponent(err.message));
  }
});

module.exports = router;
