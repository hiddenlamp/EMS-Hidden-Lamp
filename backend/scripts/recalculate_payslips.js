const db = require('./backend/db/database');
const { numberToIndianWords } = require('./backend/utils/numberToWords');

console.log('Recalculating all existing payslips to calculate LOP Deductions strictly from BASIC SALARY...\n');

try {
  db.exec('BEGIN TRANSACTION');

  const runs = db.prepare('SELECT * FROM payroll_runs').all();

  runs.forEach(run => {
    const period = run.period;
    const daysInMonth = (period.includes('-')) ? new Date(period.split('-')[0], period.split('-')[1], 0).getDate() : 30;

    const payslips = db.prepare('SELECT * FROM payslips WHERE payroll_run_id = ?').all(run.id);

    payslips.forEach(ps => {
      const breakdown = JSON.parse(ps.breakdown_json);
      const empId = ps.employee_id;
      const lopDays = breakdown.days_lop || 0;
      const daysPresent = daysInMonth - lopDays;

      const components = db.prepare('SELECT * FROM salary_components WHERE employee_id = ?').all(empId);

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

      console.log(`  Updated Payslip #${ps.id} (${breakdown.employee.name}): Gross ₹${grossPay}, Basic ₹${basicSalary}, LOP Deduction (on Basic) ₹${totalDeductions}, Net Pay ₹${netPay}`);
    });
  });

  db.exec('COMMIT');
  console.log('\n====================================================');
  console.log('   ALL PAYSLIPS RECALCULATED ON BASIC SALARY 100%!  ');
  console.log('====================================================');
} catch (err) {
  try { db.exec('ROLLBACK'); } catch (_) {}
  console.error('Error recalculating payslips:', err);
}
