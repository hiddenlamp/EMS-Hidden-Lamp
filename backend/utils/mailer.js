const nodemailer = require('nodemailer');

async function getTransporter() {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const service = (process.env.SMTP_SERVICE || '').trim();

  // 1. Gmail or custom SMTP service configured
  if (service.toLowerCase() === 'gmail' || host.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: pass
      }
    });
  }

  // 2. Custom SMTP Host & Credentials
  if (host && user && pass) {
    return nodemailer.createTransport({
      host: host,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  // 3. Fallback: Auto Real Ethereal Email Test Account (Sends real email & returns preview link)
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log(`💡 Initialized Ethereal SMTP Test Transporter: ${testAccount.user}`);
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (err) {
    console.error('Failed to create Ethereal SMTP account:', err);
    throw new Error('Email transport service is unavailable.');
  }
}

async function sendPayslipEmail(data) {
  const { to, employeeName, period, payDate, grossPay, totalDeductions, netPay, netPayInWords, breakdown, payslipUrl } = data;

  const transporter = await getTransporter();
  if (!transporter) {
    throw new Error('Could not initialize email transporter.');
  }

  const from = process.env.EMAIL_FROM || (process.env.SMTP_USER ? `Hidden Lamp Payroll <${process.env.SMTP_USER}>` : 'Hidden Lamp Payroll <payroll@hiddenlamp.com>');
  const subject = `Salary Payslip for Period ${period} - Hidden Lamp Pvt. Ltd.`;

  const earningsRows = (breakdown.earnings || []).map(e => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${e.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">₹${e.prorated_amount.toFixed(2)}</td>
    </tr>
  `).join('');

  const deductionsRows = (breakdown.deductions || []).map(d => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${d.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #dc2626;">₹${d.amount.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: #0f172a; color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.03em; }
        .header p { margin: 6px 0 0 0; color: #94a3b8; font-size: 14px; font-weight: 500; }
        .content { padding: 28px 24px; }
        .meta-grid { background: #f1f5f9; padding: 14px 18px; border-radius: 8px; font-size: 14px; margin-bottom: 22px; }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .meta-row:last-child { margin-bottom: 0; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
        .table th { background: #f8fafc; text-align: left; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 700; }
        .net-box { background: #ecfdf5; border: 1px solid #d1fae5; padding: 18px; border-radius: 10px; text-align: center; margin-bottom: 18px; }
        .net-amount { font-size: 26px; font-weight: 800; color: #0f172a; margin-top: 4px; }
        .words { font-size: 13px; color: #475569; text-align: center; margin-bottom: 24px; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px rgba(37,99,235,0.2); }
        .footer { text-align: center; padding: 18px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>HIDDEN LAMP PRIVATE LIMITED</h1>
          <p>Employee Salary Slip for ${period}</p>
        </div>
        <div class="content">
          <p style="font-size: 15px;">Dear <strong>${employeeName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your salary payslip for <strong>${period}</strong> has been generated and processed. Below is the summary of your earnings and deductions:</p>

          <div class="meta-grid">
            <div class="meta-row"><strong>Employee Name:</strong> <span>${employeeName}</span></div>
            <div class="meta-row"><strong>Work Location:</strong> <span>${breakdown.employee.work_location || 'Main Branch'}</span></div>
            <div class="meta-row"><strong>Pay Period:</strong> <span>${period}</span></div>
            <div class="meta-row"><strong>Pay Date:</strong> <span>${payDate}</span></div>
            <div class="meta-row"><strong>Paid Days:</strong> <span>${breakdown.days_present} / ${breakdown.days_in_month || 30} days (${breakdown.days_lop || 0} LOP)</span></div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Earnings Component</th>
                <th style="text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${earningsRows}
              <tr style="background: #f8fafc; font-weight: 700;">
                <td style="padding: 10px 12px; border-top: 2px solid #cbd5e1;">Gross Earnings</td>
                <td style="padding: 10px 12px; border-top: 2px solid #cbd5e1; text-align: right; color: #059669;">₹${grossPay.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <table class="table">
            <thead>
              <tr>
                <th>Deduction Component</th>
                <th style="text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${deductionsRows.length > 0 ? deductionsRows : '<tr><td style="padding: 8px 12px; color: #94a3b8;">Nil</td><td style="padding: 8px 12px; text-align: right; color: #94a3b8;">₹0.00</td></tr>'}
              <tr style="background: #f8fafc; font-weight: 700;">
                <td style="padding: 10px 12px; border-top: 2px solid #cbd5e1;">Total Deductions</td>
                <td style="padding: 10px 12px; border-top: 2px solid #cbd5e1; text-align: right; color: #dc2626;">₹${totalDeductions.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="net-box">
            <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #059669;">Total Net Payable Salary</div>
            <div class="net-amount">₹${netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>

          <div class="words">
            Amount In Words: <strong>${netPayInWords}</strong>
          </div>

          <div style="text-align: center; margin: 24px 0 10px 0;">
            <a href="${payslipUrl}" class="btn" target="_blank">📄 View / Download Printable Payslip</a>
          </div>
        </div>
        <div class="footer">
          This is an automated salary notification from Hidden Lamp Employee Payroll Management System.<br>
          Hidden Lamp Pvt. Ltd. | 26, UIT Pratap Nagar, Jodhpur Rajasthan, 342001 India
        </div>
      </div>
    </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('====================================================');
    console.log(` ✉️  REAL EMAIL DISPATCHED TO ETHEREAL INBOX`);
    console.log(` TO          : ${to}`);
    console.log(` PREVIEW URL : ${previewUrl}`);
    console.log('====================================================');
  } else {
    console.log(`✅ Real SMTP Email sent successfully to ${to} (MessageID: ${info.messageId})`);
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || null
  };
}

module.exports = {
  sendPayslipEmail
};
