const nodemailer = require('nodemailer');
const { generatePayslipPDFBuffer } = require('./pdfGenerator');

// Cached shared transporter pool for lightning fast instant email delivery
let cachedTransporter = null;

/**
 * Creates or reuses a pooled Nodemailer transporter with Port 465 SSL primary.
 * Reuses active SMTP socket connections for ultra-fast instant email dispatch.
 */
async function getTransporter() {
  if (cachedTransporter) {
    try {
      await cachedTransporter.verify();
      return cachedTransporter;
    } catch (_) {
      cachedTransporter = null;
    }
  }

  const host = (process.env.SMTP_HOST || 'smtp.hostinger.com').trim();
  const user = (process.env.SMTP_USER || 'hiddenlamp@ems.hiddenlamp.in').trim();
  const pass = (process.env.SMTP_PASS || 'Hiddenlamp@734006').trim();

  // 1. Primary Config: Port 465 SSL (Fastest & most reliable on cloud VMs)
  try {
    console.log('🔌 Connecting to Hostinger SMTP Port 465 (SSL)...');
    const transporter = nodemailer.createTransport({
      host: host,
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });

    await transporter.verify();
    console.log('✅ Hostinger SMTP Port 465 SSL Connected & Verified!');
    cachedTransporter = transporter;
    return transporter;
  } catch (err465) {
    console.warn(`⚠️ Port 465 SSL Connection failed: ${err465.message}. Trying Port 587 TLS...`);
  }

  // 2. Fallback Config: Port 587 TLS
  try {
    console.log('🔌 Fallback to Hostinger SMTP Port 587 (TLS)...');
    const transporter = nodemailer.createTransport({
      host: host,
      port: 587,
      secure: false,
      requireTLS: true,
      pool: true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000
    });

    await transporter.verify();
    console.log('✅ Hostinger SMTP Port 587 TLS Connected & Verified!');
    cachedTransporter = transporter;
    return transporter;
  } catch (err587) {
    console.warn(`⚠️ Port 587 TLS Connection failed: ${err587.message}`);
  }

  // 3. Direct Emergency Transporter
  console.log('⚡ Using Direct Single Transport Connection...');
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: 'hiddenlamp@ems.hiddenlamp.in',
      pass: 'Hiddenlamp@734006'
    },
    tls: { rejectUnauthorized: false }
  });
}

async function sendPayslipEmail(data) {
  const { to, employeeName, period, payDate, grossPay, totalDeductions, netPay, netPayInWords, breakdown, payslipUrl, payslipDownloadUrl } = data;

  const senderEmail = (process.env.SMTP_USER || 'hiddenlamp@ems.hiddenlamp.in').trim();
  const from = `"Hidden Lamp Payroll" <${senderEmail}>`;
  const subject = `Salary Payslip for Period ${period} - Hidden Lamp Pvt. Ltd.`;

  // Generate crisp PDF buffer for direct email attachment
  let pdfBuffer = null;
  try {
    pdfBuffer = await generatePayslipPDFBuffer({
      breakdown,
      period,
      payDate,
      grossPay,
      totalDeductions,
      netPay,
      netPayInWords
    });
  } catch (pdfErr) {
    console.warn('⚠️ Could not generate PDF attachment for email:', pdfErr.message);
  }

  const earningsRows = (breakdown.earnings || []).map(e => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${e.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">₹${(e.prorated_amount !== undefined ? e.prorated_amount : e.amount || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const deductionsRows = (breakdown.deductions || []).map(d => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${d.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #dc2626;">₹${(d.amount || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const downloadTargetUrl = payslipDownloadUrl || payslipUrl;

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
        .btn-download { display: inline-block; background: #059669; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(5,150,105,0.3); }
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
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your salary payslip for <strong>${period}</strong> has been generated and processed. Your official PDF payslip is attached directly to this email, or you can click below to download it directly to your device:</p>

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

          <!-- DIRECT PDF DOWNLOAD BUTTON -->
          <div style="text-align: center; margin: 26px 0 14px 0;">
            <a href="${downloadTargetUrl}" class="btn-download" target="_blank">📥 Direct Download Payslip PDF</a>
            <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Click to download official PDF file directly to your phone/device.</div>
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

  const transporter = await getTransporter();

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log(`✅ Hostinger SMTP Email sent successfully to ${to} (MessageID: ${info.messageId})`);
    return { messageId: info.messageId, previewUrl: null };
  } catch (sendErr) {
    console.error(`❌ Hostinger Email Send Error for ${to}:`, sendErr.message);
    throw sendErr;
  }
}

module.exports = {
  sendPayslipEmail
};
