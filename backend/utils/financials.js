/**
 * Standard Banking Financial Calculation Engine for Corporate Loans & Amortization Schedules
 */

/**
 * Generates exact Monthly EMI, Total Payable, Total Interest, and Month-by-Month Amortization Schedule
 * @param {number} principal - Principal Loan Amount
 * @param {number} annualRatePercent - Annual Interest Rate % (e.g. 12 for 12% p.a.)
 * @param {number} tenureMonths - Loan Tenure in Months (e.g. 12, 24, 36)
 * @param {string} startDateStr - Disbursed Date / EMI Start Date (YYYY-MM-DD)
 * @returns {object} { emi, totalPayable, totalInterest, schedule }
 */
function calculateLoanEMISchedule(principal, annualRatePercent, tenureMonths, startDateStr) {
  const P = Math.max(0, parseFloat(principal) || 0);
  const annualRate = Math.max(0, parseFloat(annualRatePercent) || 0);
  const n = Math.max(1, parseInt(tenureMonths) || 12);
  const startDate = startDateStr ? new Date(startDateStr) : new Date();

  const r = annualRate / 12 / 100;
  let emi = 0;

  if (r > 0) {
    const rateFactor = Math.pow(1 + r, n);
    emi = Math.round(P * r * (rateFactor / (rateFactor - 1)));
  } else {
    emi = Math.round(P / n);
  }

  const schedule = [];
  let currBalance = P;
  let totalInterestAccrued = 0;

  for (let i = 1; i <= n; i++) {
    const dueDate = new Date(startDate.getTime());
    dueDate.setMonth(dueDate.getMonth() + (i - 1));
    const dueDateStr = dueDate.toISOString().substring(0, 10);

    const interestComp = r > 0 ? Math.round(currBalance * r) : 0;
    let principalComp = emi - interestComp;

    if (i === n || principalComp > currBalance) {
      principalComp = currBalance;
    }

    const actualEmi = principalComp + interestComp;
    const endingBalance = Math.max(0, Math.round((currBalance - principalComp) * 100) / 100);
    totalInterestAccrued += interestComp;

    schedule.push({
      installment: i,
      dueDate: dueDateStr,
      beginningBalance: Math.round(currBalance * 100) / 100,
      emi: actualEmi,
      principal: principalComp,
      interest: interestComp,
      endingBalance: endingBalance,
      status: 'Due'
    });

    currBalance = endingBalance;
  }

  const totalPayable = P + totalInterestAccrued;

  return {
    emi,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterestAccrued * 100) / 100,
    schedule
  };
}

/**
 * Calculates 6-Month Debt Cash Outflow Projection across active loans
 * @param {Array} companyLoans - Array of active corporate loan records
 * @returns {object} { next30DaysObligation, monthlyProjections }
 */
function calculateMonthlyCashOutflowProjections(companyLoans) {
  const months = [];
  const today = new Date();

  for (let m = 0; m < 6; m++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const yr = targetDate.getFullYear();
    const mo = String(targetDate.getMonth() + 1).padStart(2, '0');
    const monthKey = `${yr}-${mo}`;
    const monthLabel = targetDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    months.push({ key: monthKey, label: monthLabel, totalEmi: 0, totalPrincipal: 0, totalInterest: 0 });
  }

  let next30DaysObligation = 0;

  companyLoans.forEach(loan => {
    if (loan.status === 'Active' && loan.remaining_balance > 0) {
      try {
        const schedule = typeof loan.repayment_schedule_json === 'string'
          ? JSON.parse(loan.repayment_schedule_json)
          : (loan.repayment_schedule_json || []);

        schedule.forEach(item => {
          if (item.status !== 'Paid' && item.dueDate) {
            const dueMonthKey = item.dueDate.substring(0, 7);
            const matchingMonth = months.find(m => m.key === dueMonthKey);

            if (matchingMonth) {
              matchingMonth.totalEmi += item.emi || 0;
              matchingMonth.totalPrincipal += item.principal || 0;
              matchingMonth.totalInterest += item.interest || 0;
            }

            // Check if due in next 30 days
            const dueTime = new Date(item.dueDate).getTime();
            const nowTime = today.getTime();
            if (dueTime >= nowTime && dueTime <= nowTime + (30 * 24 * 60 * 60 * 1000)) {
              next30DaysObligation += item.emi || 0;
            }
          }
        });
      } catch (e) {}
    }
  });

  return {
    next30DaysObligation: Math.round(next30DaysObligation),
    monthlyProjections: months
  };
}

module.exports = {
  calculateLoanEMISchedule,
  calculateMonthlyCashOutflowProjections
};
