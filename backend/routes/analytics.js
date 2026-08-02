const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const Groq = require('groq-sdk');

const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
let groq = null;
if (groqApiKey && groqApiKey !== 'missing_key') {
  try {
    groq = new Groq({ apiKey: groqApiKey });
  } catch (e) {
    console.log('Groq SDK Init fallback');
  }
}

router.use(requireAuth);
router.use(requireRole(['admin', 'hr']));

// GET /analytics (BI Dashboard with Dynamic Month, Year, and Location Filters)
router.get('/', (req, res) => {
  const activeTab = req.query.tab || 'payroll';
  const selectedYear = req.query.year || '';
  const selectedMonth = req.query.month || '';
  const selectedLocation = req.query.location || 'all';

  // Build dynamic SQL filters for Payslips
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

  // 1. KPI Summaries
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

  const kpiStaff = db.prepare(`
    SELECT 
      COUNT(id) as total_staff, 
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_staff
    FROM employees
    ${selectedLocation !== 'all' ? 'WHERE work_location = ?' : ''}
  `).get(...(selectedLocation !== 'all' ? [selectedLocation] : []));

  // 2. Monthly Payroll Trend
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

  // 3. Department Wise Salary Spend
  const deptSpend = db.prepare(`
    SELECT COALESCE(e.department, 'Unassigned') as department, COUNT(DISTINCT e.id) as staff_count, COALESCE(SUM(p.gross_pay), 0) as total_gross, COALESCE(SUM(p.net_pay), 0) as total_net
    FROM payslips p
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    JOIN employees e ON p.employee_id = e.id
    ${payslipWhere}
    GROUP BY e.department
    ORDER BY total_net DESC
  `).all(...payslipParams);

  // 4. Location Wise Salary Spend
  const locationSpend = db.prepare(`
    SELECT COALESCE(e.work_location, 'Main Office') as work_location, COUNT(DISTINCT e.id) as staff_count, COALESCE(SUM(p.gross_pay), 0) as total_gross, COALESCE(SUM(p.total_deductions), 0) as total_deductions, COALESCE(SUM(p.net_pay), 0) as total_net
    FROM payslips p
    JOIN payroll_runs r ON p.payroll_run_id = r.id
    JOIN employees e ON p.employee_id = e.id
    ${payslipWhere}
    GROUP BY e.work_location
    ORDER BY total_net DESC
  `).all(...payslipParams);

  // 5. Employee Expenses Category Breakdown
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

  // 6. Top Employee Expense Claimants
  const topExpenseEmployees = db.prepare(`
    SELECT e.name, e.employee_code, e.work_location, COUNT(t.id) as claim_count, COALESCE(SUM(t.total_amount), 0) as total_claimed, COALESCE(SUM(t.dues_amount), 0) as total_dues
    FROM travel_expenses t
    JOIN employees e ON t.employee_id = e.id
    ${expWhere}
    GROUP BY e.id
    ORDER BY total_claimed DESC
    LIMIT 5
  `).all(...expParams);

  // 7. Company Operational Overhead Categories
  const companyCategorySpend = db.prepare(`
    SELECT category, COUNT(id) as bill_count, COALESCE(SUM(amount), 0) as total_amount
    FROM company_expenses
    ${compWhere}
    GROUP BY category
    ORDER BY total_amount DESC
  `).all(...compParams);

  // Filter Dropdown Options
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

  const locations = db.prepare('SELECT DISTINCT work_location FROM employees ORDER BY work_location ASC').all().map(r => r.work_location);

  res.render('analytics/index', {
    activeTab,
    selectedYear,
    selectedMonth,
    selectedLocation,
    years,
    monthNames,
    locations,
    kpiPayroll,
    kpiExpenses,
    kpiCompany,
    kpiStaff,
    payrollTrend,
    deptSpend,
    departmentSpend: deptSpend,
    locationSpend,
    expenseCategoryBreakdown,
    topExpenseEmployees,
    companyCategorySpend
  });
});

// CSV Export: Payroll Summary
router.get('/export/payroll-csv', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        p.id as payslip_id,
        r.period,
        e.employee_code,
        e.name as employee_name,
        e.department,
        e.work_location,
        p.gross_pay,
        p.total_deductions,
        p.net_pay
      FROM payslips p
      JOIN payroll_runs r ON p.payroll_run_id = r.id
      JOIN employees e ON p.employee_id = e.id
      ORDER BY r.period DESC, e.name ASC
    `).all();

    let csv = 'Payslip ID,Period,Employee Code,Employee Name,Department,Location,Gross Pay (INR),Deductions (INR),Net Pay (INR)\n';
    rows.forEach(r => {
      csv += `"${r.payslip_id}","${r.period}","${r.employee_code || ''}","${r.employee_name}","${r.department}","${r.work_location}",${r.gross_pay},${r.total_deductions},${r.net_pay}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Payroll_Summary_Report_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).send('Error generating Payroll CSV Report: ' + err.message);
  }
});

// CSV Export: Employee Expenses Report
router.get('/export/expenses-csv', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        t.id,
        e.employee_code,
        e.name as employee_name,
        t.claim_type,
        COALESCE(t.item_title, t.purpose) as description,
        t.submission_source,
        t.receipt_ref,
        t.start_date,
        t.total_amount,
        t.advance_paid,
        t.dues_amount,
        t.status
      FROM travel_expenses t
      JOIN employees e ON t.employee_id = e.id
      ORDER BY t.start_date DESC
    `).all();

    let csv = 'Claim ID,Employee Code,Employee Name,Type,Description,Source,Receipt Ref,Date,Total Amount (INR),Paid Amount (INR),Dues (INR),Status\n';
    rows.forEach(r => {
      csv += `"${r.id}","${r.employee_code || ''}","${r.employee_name}","${r.claim_type}","${r.description}","${r.submission_source || ''}","${r.receipt_ref || ''}","${r.start_date}",${r.total_amount},${r.advance_paid},${r.dues_amount},"${r.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Employee_Expenses_Report_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).send('Error generating Expenses CSV Report: ' + err.message);
  }
});

// CSV Export: Company Operational Overhead Report
router.get('/export/company-csv', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, title, category, vendor_name, amount, date, work_location, payment_mode, payment_status, invoice_ref
      FROM company_expenses
      ORDER BY date DESC
    `).all();

    let csv = 'ID,Title,Category,Vendor,Amount (INR),Date,Location,Payment Mode,Payment Status,Invoice Ref\n';
    rows.forEach(r => {
      csv += `"${r.id}","${r.title}","${r.category}","${r.vendor_name || ''}",${r.amount},"${r.date}","${r.work_location}","${r.payment_mode}","${r.payment_status}","${r.invoice_ref || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Company_Expenses_Report_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).send('Error generating Company Expenses CSV Report: ' + err.message);
  }
});

// AI Query Handler function
const handleAiQuery = async (req, res) => {
  try {
    const question = req.body.prompt || req.body.question;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    const qLower = question.toLowerCase();

    // 1. Try Groq AI if initialized
    if (groq) {
      try {
        const schema = `
Table employees (id, employee_code, name, designation, department, work_location, status, payment_mode)
Table payroll_runs (id, period, pay_date, status)
Table payslips (id, payroll_run_id, employee_id, gross_pay, total_deductions, net_pay)
Table travel_expenses (id, employee_id, claim_type, total_amount, advance_paid, dues_amount, status)
Table company_expenses (id, title, category, amount, date, work_location, payment_status)
        `;

        const sqlPrompt = `You are a SQLite expert. Given schema: ${schema}. Write a single valid SQLite SELECT query for question: "${question}". Return ONLY raw SQL starting with SELECT.`;

        const sqlCompletion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: sqlPrompt }],
          model: 'llama-3.1-8b-instant',
          temperature: 0,
        });

        let sqlQuery = sqlCompletion.choices[0]?.message?.content?.trim();
        sqlQuery = sqlQuery.replace(/```sql/g, '').replace(/```/g, '').trim();

        const data = db.prepare(sqlQuery).all();

        const answerPrompt = `Question: "${question}". SQL Result: ${JSON.stringify(data).substring(0, 1500)}. Provide a concise 1-sentence answer in English.`;
        const answerCompletion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: answerPrompt }],
          model: 'llama-3.1-8b-instant',
          temperature: 0.3,
        });

        const answer = answerCompletion.choices[0]?.message?.content?.trim();
        return res.json({ answer, sql: sqlQuery, data });
      } catch (aiErr) {
        console.log('Groq API Error, falling back to Local Data Engine:', aiErr.message);
      }
    }

    // 2. Smart Local Database Rule-Based Engine (Fallback)
    if (qLower.includes('it') || qLower.includes('department') || qLower.includes('dept')) {
      const row = db.prepare(`
        SELECT COALESCE(e.department, 'IT') as dept, COUNT(DISTINCT e.id) as staff, SUM(p.gross_pay) as gross, SUM(p.net_pay) as net
        FROM payslips p JOIN employees e ON p.employee_id = e.id
        WHERE LOWER(e.department) LIKE '%it%' OR LOWER(e.department) LIKE '%dept%'
      `).get();

      const sql = "SELECT department, COUNT(id), SUM(gross_pay) FROM payslips JOIN employees ON payslips.employee_id = employees.id GROUP BY department;";
      const answer = row && row.gross ? `The total gross salary spend for the ${row.dept} department across ${row.staff || 1} employees is ₹${row.gross.toLocaleString('en-IN')}.` : "Department payroll data calculated successfully from current records.";
      return res.json({ answer, sql, data: [row] });
    }

    if (qLower.includes('travel') || qLower.includes('expense') || qLower.includes('claim')) {
      const row = db.prepare(`SELECT COUNT(id) as claims, SUM(total_amount) as total, SUM(dues_amount) as dues FROM travel_expenses`).get();
      const sql = "SELECT COUNT(id) as total_claims, SUM(total_amount) as total_claimed, SUM(dues_amount) as total_dues FROM travel_expenses;";
      const answer = `Total employee reimbursement claims filed is ${row.claims} worth ₹${(row.total || 0).toLocaleString('en-IN')}, with ₹${(row.dues || 0).toLocaleString('en-IN')} pending balance dues.`;
      return res.json({ answer, sql, data: [row] });
    }

    if (qLower.includes('overhead') || qLower.includes('company') || qLower.includes('rent') || qLower.includes('bill')) {
      const row = db.prepare(`SELECT COUNT(id) as bills, SUM(amount) as total FROM company_expenses`).get();
      const sql = "SELECT COUNT(id) as total_bills, SUM(amount) as total_overhead FROM company_expenses;";
      const answer = `Total company operational overhead stands at ₹${(row.total || 0).toLocaleString('en-IN')} across ${row.bills} company bills.`;
      return res.json({ answer, sql, data: [row] });
    }

    // Generic Fallback
    const empCount = db.prepare(`SELECT COUNT(id) as c FROM employees`).get().c;
    const payTotal = db.prepare(`SELECT COALESCE(SUM(net_pay),0) as s FROM payslips`).get().s;
    const answer = `Currently, the company manages ${empCount} employees with a total distributed net payroll of ₹${payTotal.toLocaleString('en-IN')}.`;
    const sql = "SELECT COUNT(id) FROM employees; SELECT SUM(net_pay) FROM payslips;";
    res.json({ answer, sql, data: [] });

  } catch (error) {
    console.error("Ask Error:", error);
    res.status(500).json({ error: 'Failed to process data query.' });
  }
};

router.post('/ask', handleAiQuery);
router.post('/ai-query', handleAiQuery);

module.exports = router;
