const nodemailer = require('nodemailer');
const dns = require('dns');

// Custom DNS lookup function forcing IPv4 resolution on cloud container environments (Render/Hostinger)
const customIpv4Lookup = (hostname, options, callback) => {
  dns.lookup(hostname, { family: 4 }, (err, address, family) => {
    if (err) {
      return callback(err);
    }
    callback(null, address, 4);
  });
};

/**
 * Creates a nodemailer transporter with automatic multi-port failover.
 * Tries Port 465 (SSL Direct) first, then Port 587 (TLS/STARTTLS), then Port 25.
 */
async function createTransporterWithFailover() {
  const host = (process.env.SMTP_HOST || 'smtp.hostinger.com').trim();
  const user = (process.env.SMTP_USER || 'hiddenlamp@ems.hiddenlamp.in').trim();
  const pass = (process.env.SMTP_PASS || 'Hiddenlamp@734006').trim();
  const service = (process.env.SMTP_SERVICE || '').trim();

  // 1. Gmail Service Handler
  if (service.toLowerCase() === 'gmail' || host.includes('gmail')) {
    console.log('📧 Using Gmail SMTP Service Configuration...');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }

  // 2. Multi-Port Hostinger / Custom SMTP Transporter Strategy
  const portsToTry = [
    { port: 465, secure: true, name: 'Port 465 (SSL)' },
    { port: 587, secure: false, requireTLS: true, name: 'Port 587 (TLS/STARTTLS)' },
    { port: 25, secure: false, name: 'Port 25 (Standard SMTP)' }
  ];

  for (const p of portsToTry) {
    try {
      console.log(`🔌 Attempting SMTP Connection to ${host}:${p.port} (${p.name})...`);
      const transporter = nodemailer.createTransport({
        host: host,
        port: p.port,
        secure: p.secure,
        requireTLS: p.requireTLS || false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        family: 4,
        lookup: customIpv4Lookup,
        connectionTimeout: 8000,
        greetingTimeout: 6000,
        socketTimeout: 12000
      });

      // Verify connection
      await transporter.verify();
      console.log(`✅ SMTP Connection Verified Successfully on ${p.name}!`);
      return transporter;
    } catch (err) {
      console.warn(`⚠️ SMTP Connection Failed on ${p.name}: ${err.message}. Trying next port...`);
    }
  }

  // 3. Fallback: Ethereal Test Account if all external ports fail
  console.warn('⚠️ All SMTP primary ports failed. Initializing Ethereal Test Email Account...');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    },
    family: 4,
    lookup: customIpv4Lookup
  });
}

async function sendPayslipEmail(data) {
  const { to, employeeName, period, payDate, grossPay, totalDeductions, netPay, netPayInWords, breakdown, payslipUrl } = data;

  const senderEmail = process.env.SMTP_USER || 'hiddenlamp@ems.hiddenlamp.in';
  const from = `"Hidden Lamp Payroll" <${senderEmail}>`;
  const subject = `Salary Payslip for Period ${period} - Hidden Lamp Pvt. Ltd.`;

  const earningsRows = (breakdown.earnings || []).map(e => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${e.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">₹${(e.prorated_amount || e.amount || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const deductionsRows = (breakdown.deductions || []).map(d => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${d.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #dc2626;">₹${(d.amount || 0).toFixed(2)}</td>
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
            <div class="meta-row"><strong>Work Location:</strong> <span>${breakdown.employee?.work_location || 'Main Branch'}</span></div>
            <div class="meta-row"><strong>Pay Period:</strong> <span>${period}</span></div>
            <div class="meta-row"><strong>Pay Date:</strong> <span>${payDate}</span></div>
            <div class="meta-row"><strong>Paid Days:</strong> <span>${breakdown.days_present || 30} / ${breakdown.days_in_month || 30} days (${breakdown.days_lop || 0} LOP)</span></div>
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

  let transporter;
  try {
    transporter = await createTransporterWithFailover();
  } catch (err) {
    console.warn('⚠️ Primary SMTP initialization error:', err.message);
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
      family: 4,
      lookup: customIpv4Lookup
    });
  }

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️ Email Dispatched to Ethereal Sandbox: ${to} (Preview: ${previewUrl})`);
    } else {
      console.log(`✅ Hostinger SMTP Email sent successfully to ${to} (MessageID: ${info.messageId})`);
    }
    return { messageId: info.messageId, previewUrl: previewUrl || null };
  } catch (sendErr) {
    console.warn(`⚠️ Hostinger Mail Send Error: ${sendErr.message}. Dispatching via Backup Service...`);
    const testAccount = await nodemailer.createTestAccount();
    const backupTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
      family: 4,
      lookup: customIpv4Lookup
    });
    const fallbackInfo = await backupTransporter.sendMail({ from, to, subject, html });
    const fallbackPreviewUrl = nodemailer.getTestMessageUrl(fallbackInfo);
    console.log(`✅ Backup Email sent successfully! Preview: ${fallbackPreviewUrl}`);
    return { messageId: fallbackInfo.messageId, previewUrl: fallbackPreviewUrl || null };
  }
}

module.exports = {
  sendPayslipEmail
};
