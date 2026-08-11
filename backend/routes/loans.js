const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { calculateLoanEMISchedule, calculateMonthlyCashOutflowProjections } = require('../utils/financials');

router.use(requireAuth);
router.use(requireRole(['admin', 'hr']));

// GET /loans (Corporate Loans, Vendor Credit Lines & Fund Rotations Dashboard)
router.get('/', (req, res) => {
  const selectedProject = (req.query.project || '').trim();
  const selectedStatus = (req.query.status || '').trim();
  const searchQuery = (req.query.search || '').trim();

  let cSql = 'SELECT * FROM company_loans WHERE 1=1';
  let cParams = [];
  if (selectedProject) { cSql += ' AND project_name = ?'; cParams.push(selectedProject); }
  if (selectedStatus) { cSql += ' AND status = ?'; cParams.push(selectedStatus); }
  if (searchQuery) { cSql += ' AND (lender_name LIKE ? OR notes LIKE ?)'; cParams.push(`%${searchQuery}%`, `%${searchQuery}%`); }
  cSql += ' ORDER BY created_at DESC';

  let rSql = 'SELECT * FROM fund_rotations WHERE 1=1';
  let rParams = [];
  if (selectedProject) { rSql += ' AND (source_pool = ? OR destination_project = ?)'; rParams.push(selectedProject, selectedProject); }
  if (selectedStatus) { rSql += ' AND status = ?'; rParams.push(selectedStatus); }
  if (searchQuery) { rSql += ' AND (source_pool LIKE ? OR destination_project LIKE ? OR rotation_purpose LIKE ? OR reference_no LIKE ? OR managed_by LIKE ?)'; rParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`); }
  rSql += ' ORDER BY created_at DESC';

  const companyLoans = db.prepare(cSql).all(...cParams);
  const fundRotations = db.prepare(rSql).all(...rParams);

  const allLoans = db.prepare('SELECT * FROM company_loans').all();
  const allRotations = db.prepare('SELECT * FROM fund_rotations').all();

  // Distinct projects for dropdown selection
  const projects = db.prepare("SELECT DISTINCT project_name FROM company_expenses WHERE project_name IS NOT NULL AND TRIM(project_name) != '' ORDER BY project_name ASC").all().map(p => p.project_name);
  if (!projects.includes('Gomia Project Site')) projects.unshift('Gomia Project Site');
  if (!projects.includes('General Corporate Treasury')) projects.unshift('General Corporate Treasury');

  // Company Loan Metrics
  const totalDebt = allLoans.reduce((sum, l) => sum + (l.principal_amount || 0), 0);
  const totalRepaidDebt = allLoans.reduce((sum, l) => sum + (l.repaid_amount || 0), 0);
  const outstandingDebt = allLoans.reduce((sum, l) => sum + (l.remaining_balance || 0), 0);

  // Financial EMI Projections & 6-Month Forecast
  const financialProjections = calculateMonthlyCashOutflowProjections(allLoans);

  // Fund Rotation Metrics
  const totalRotatedCapital = allRotations.reduce((sum, r) => sum + (r.amount || 0), 0);
  const activeRotationsCount = allRotations.filter(r => r.status === 'In Rotation').length;
  const activeRotatedAmount = allRotations.filter(r => r.status === 'In Rotation').reduce((sum, r) => sum + Math.max(0, (r.amount || 0) - (r.settled_amount || 0)), 0);

  // Project-wise Capital Summary
  const projectSummaries = projects.map(proj => {
    const projLoans = allLoans.filter(l => l.project_name === proj);
    const projRotations = allRotations.filter(r => r.destination_project === proj);

    const pDebt = projLoans.reduce((sum, l) => sum + (l.remaining_balance || 0), 0);
    const pRotated = projRotations.filter(r => r.status === 'In Rotation').reduce((sum, r) => sum + Math.max(0, (r.amount || 0) - (r.settled_amount || 0)), 0);
    const pTotalAllocated = pDebt + pRotated;

    return {
      projectName: proj,
      totalDebt: pDebt,
      activeRotation: pRotated,
      totalAllocated: pTotalAllocated,
      loanCount: projLoans.length,
      rotationCount: projRotations.length
    };
  }).filter(s => s.totalAllocated > 0 || s.loanCount > 0 || s.rotationCount > 0);

  const success = req.query.success || null;
  const error = req.query.error || null;
  const activeTab = req.query.tab || 'company_loans';

  res.render('loans/index', {
    companyLoans,
    fundRotations,
    projects,
    projectSummaries,
    financialProjections,
    totalDebt,
    totalRepaidDebt,
    outstandingDebt,
    totalRotatedCapital,
    activeRotationsCount,
    activeRotatedAmount,
    selectedProject,
    selectedStatus,
    searchQuery,
    activeTab,
    success,
    error
  });
});

// EXPORT COMPANY LOANS REPORT CSV
router.get('/export/company-loans', (req, res) => {
  const loans = db.prepare('SELECT * FROM company_loans ORDER BY created_at DESC').all();
  let csv = 'ID,Lender Name,Credit Type,Allocated Project,Principal Amount,Tenure (Months),Monthly EMI,Interest Rate %,Total Payable,Repaid Amount,Remaining Balance,Disbursed Date,Due Date,Status,Notes\n';

  loans.forEach(l => {
    csv += [
      l.id,
      `"${(l.lender_name || '').replace(/"/g, '""')}"`,
      `"${(l.lender_type || '').replace(/"/g, '""')}"`,
      `"${(l.project_name || '').replace(/"/g, '""')}"`,
      l.principal_amount,
      l.tenure_months || 12,
      l.calculated_emi || 0,
      l.interest_rate || 0,
      l.total_payable,
      l.repaid_amount,
      l.remaining_balance,
      `"${l.disbursed_date || ''}"`,
      `"${l.due_date || ''}"`,
      `"${l.status || ''}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ].join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="Corporate_Loans_Statement.csv"');
  res.send(csv);
});

// EXPORT FUND ROTATIONS REPORT CSV
router.get('/export/fund-rotations', (req, res) => {
  const rotations = db.prepare('SELECT * FROM fund_rotations ORDER BY created_at DESC').all();
  let csv = 'ID,Source Pool,Destination Project,Rotation Purpose,Amount,Settled Amount,Unsettled Balance,Transfer Date,Ref No,Managed By,Status,Notes\n';

  rotations.forEach(r => {
    const unsettled = Math.max(0, (r.amount || 0) - (r.settled_amount || 0));
    csv += [
      r.id,
      `"${(r.source_pool || '').replace(/"/g, '""')}"`,
      `"${(r.destination_project || '').replace(/"/g, '""')}"`,
      `"${(r.rotation_purpose || '').replace(/"/g, '""')}"`,
      r.amount,
      r.settled_amount,
      unsettled,
      `"${r.transfer_date || ''}"`,
      `"${(r.reference_no || '').replace(/"/g, '""')}"`,
      `"${(r.managed_by || '').replace(/"/g, '""')}"`,
      `"${r.status || ''}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ].join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="Fund_Rotations_Audit_Report.csv"');
  res.send(csv);
});

// POST /loans/company-loan (Disburse Corporate Loan or Vendor Credit Line with Real Financial Amortization)
router.post('/company-loan', (req, res) => {
  const { lender_name, lender_type, project_name, principal_amount, interest_rate, tenure_months, disbursed_date, due_date, notes } = req.body;
  const principal = parseFloat(principal_amount) || 0;
  const rate = parseFloat(interest_rate) || 0;
  const tenure = parseInt(tenure_months) || 12;

  if (!lender_name || principal <= 0 || !disbursed_date) {
    return res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent('Please enter valid lender name, principal amount, and disbursed date.'));
  }

  // Calculate Real Standard Banking EMI & Amortization Schedule
  const fin = calculateLoanEMISchedule(principal, rate, tenure, disbursed_date);

  try {
    const result = db.prepare(`
      INSERT INTO company_loans (lender_name, lender_type, project_name, principal_amount, interest_rate, tenure_months, calculated_emi, total_interest, total_payable, repaid_amount, remaining_balance, disbursed_date, due_date, status, notes, repayment_schedule_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'Active', ?, ?)
    `).run(
      lender_name,
      lender_type || 'Bank / NBFC',
      project_name || 'General Corporate Treasury',
      principal,
      rate,
      tenure,
      fin.emi,
      fin.totalInterest,
      fin.totalPayable,
      fin.totalPayable,
      disbursed_date,
      due_date || null,
      notes || '',
      JSON.stringify(fin.schedule)
    );

    logAction((req.user || req.session?.user || {}).email || 'system', 'CREATE_COMPANY_LOAN', 'Corporate Loan', result.lastInsertRowid, { lender_name, principal, emi: fin.emi });
    res.redirect('/loans?tab=company_loans&success=' + encodeURIComponent(`Corporate loan recorded with monthly EMI of ₹${fin.emi.toLocaleString('en-IN')} across ${tenure} months!`));
  } catch (err) {
    res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/company-loan/:id/edit (Edit Corporate Loan)
router.post('/company-loan/:id/edit', (req, res) => {
  const loan = db.prepare('SELECT * FROM company_loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent('Loan record not found.'));

  const { lender_name, lender_type, project_name, principal_amount, interest_rate, tenure_months, repaid_amount, disbursed_date, due_date, status, notes } = req.body;
  const principal = parseFloat(principal_amount) || loan.principal_amount;
  const rate = parseFloat(interest_rate) || 0;
  const tenure = parseInt(tenure_months) || loan.tenure_months || 12;
  const repaid = parseFloat(repaid_amount) >= 0 ? parseFloat(repaid_amount) : loan.repaid_amount;

  const fin = calculateLoanEMISchedule(principal, rate, tenure, disbursed_date || loan.disbursed_date);
  const remaining = Math.max(0, Math.round((fin.totalPayable - repaid) * 100) / 100);
  const updatedStatus = remaining <= 0 ? 'Fully Repaid' : (status || loan.status);

  try {
    db.prepare(`
      UPDATE company_loans 
      SET lender_name = ?, lender_type = ?, project_name = ?, principal_amount = ?, interest_rate = ?, tenure_months = ?, calculated_emi = ?, total_interest = ?, total_payable = ?, repaid_amount = ?, remaining_balance = ?, disbursed_date = ?, due_date = ?, status = ?, notes = ?, repayment_schedule_json = ?
      WHERE id = ?
    `).run(
      lender_name,
      lender_type,
      project_name,
      principal,
      rate,
      tenure,
      fin.emi,
      fin.totalInterest,
      fin.totalPayable,
      repaid,
      remaining,
      disbursed_date,
      due_date || null,
      updatedStatus,
      notes || '',
      JSON.stringify(fin.schedule),
      loan.id
    );

    logAction((req.user || req.session?.user || {}).email || 'system', 'EDIT_COMPANY_LOAN', 'Corporate Loan', loan.id, { lender_name });
    res.redirect('/loans?tab=company_loans&success=' + encodeURIComponent('Corporate loan record and amortization schedule updated!'));
  } catch (err) {
    res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/company-loan/:id/pay-installment (1-Click Mark Amortization Installment as Paid)
router.post('/company-loan/:id/pay-installment', (req, res) => {
  const loan = db.prepare('SELECT * FROM company_loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent('Loan record not found.'));

  const installmentNo = parseInt(req.body.installment) || 0;
  if (!installmentNo) return res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent('Invalid installment number.'));

  try {
    let schedule = JSON.parse(loan.repayment_schedule_json || '[]');
    let paidAmountToAdd = 0;

    schedule = schedule.map(item => {
      if (item.installment === installmentNo && item.status !== 'Paid') {
        item.status = 'Paid';
        paidAmountToAdd = item.emi;
      }
      return item;
    });

    const newRepaid = Math.round((loan.repaid_amount + paidAmountToAdd) * 100) / 100;
    const newRemaining = Math.max(0, Math.round((loan.total_payable - newRepaid) * 100) / 100);
    const newStatus = newRemaining <= 0 ? 'Fully Repaid' : 'Active';

    db.prepare(`
      UPDATE company_loans 
      SET repaid_amount = ?, remaining_balance = ?, status = ?, repayment_schedule_json = ?
      WHERE id = ?
    `).run(newRepaid, newRemaining, newStatus, JSON.stringify(schedule), loan.id);

    logAction((req.user || req.session?.user || {}).email || 'system', 'PAY_LOAN_INSTALLMENT', 'Corporate Loan', loan.id, { installmentNo, paidAmountToAdd });
    res.redirect('/loans?tab=company_loans&success=' + encodeURIComponent(`Installment #${installmentNo} marked as PAID (₹${paidAmountToAdd.toLocaleString('en-IN')})!`));
  } catch (err) {
    res.redirect('/loans?tab=company_loans&error=' + encodeURIComponent(err.message));
  }
});

// POST /loans/company-loan/:id/repay (Manual Repayment towards Corporate Loan)
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

// POST /loans/fund-rotation/:id/edit (Edit Fund Rotation)
router.post('/fund-rotation/:id/edit', (req, res) => {
  const rotation = db.prepare('SELECT * FROM fund_rotations WHERE id = ?').get(req.params.id);
  if (!rotation) return res.redirect('/loans?tab=fund_rotations&error=' + encodeURIComponent('Rotation record not found.'));

  const { source_pool, destination_project, rotation_purpose, amount, settled_amount, transfer_date, reference_no, managed_by, status, notes } = req.body;
  const transferAmount = parseFloat(amount) || rotation.amount;
  const settled = parseFloat(settled_amount) >= 0 ? parseFloat(settled_amount) : rotation.settled_amount;

  const updatedStatus = settled >= transferAmount ? 'Settled / Returned' : (status || rotation.status);

  try {
    db.prepare(`
      UPDATE fund_rotations
      SET source_pool = ?, destination_project = ?, rotation_purpose = ?, amount = ?, settled_amount = ?, transfer_date = ?, reference_no = ?, managed_by = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(source_pool, destination_project, rotation_purpose, transferAmount, settled, transfer_date, reference_no || '', managed_by || '', updatedStatus, notes || '', rotation.id);

    logAction((req.user || req.session?.user || {}).email || 'system', 'EDIT_FUND_ROTATION', 'Fund Rotation', rotation.id, { destination_project });
    res.redirect('/loans?tab=fund_rotations&success=' + encodeURIComponent('Fund rotation record updated successfully!'));
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
