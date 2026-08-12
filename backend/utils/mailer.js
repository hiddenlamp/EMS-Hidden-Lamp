const nodemailer = require('nodemailer');
const { generatePayslipPDFBuffer } = require('./pdfGenerator');

// Cached shared transporter pool for lightning fast instant email delivery
let cachedTransporter = null;

/**
 * Creates or reuses a pooled Nodemailer transporter supporting Resend.com, Zoho Mail, Hostinger, or Custom SMTP.
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

  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const rawHost = (process.env.SMTP_HOST || '').trim();
  const rawUser = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || '').trim();

  let host = 'smtp.hostinger.com';
  let user = rawUser;
  let pass = rawPass;
  let port = parseInt(process.env.SMTP_PORT) || 465;
  let secure = process.env.SMTP_SECURE === 'true' || port === 465;

  // Auto-detect Resend.com
  if (resendApiKey || rawHost.includes('resend') || rawPass.startsWith('re_')) {
    host = 'smtp.resend.com';
    user = 'resend';
    pass = resendApiKey || rawPass;
    port = 465;
    secure = true;
    console.log('⚡ Using Resend.com Transactional Email API/SMTP Service!');
  } else if (rawHost && rawHost !== 'missing') {
    host = rawHost;
  } else if (rawUser.endsWith('@zoho.com') || rawUser.includes('zoho.com')) {
    host = 'smtp.zoho.com';
  } else if (rawUser.includes('zoho')) {
    host = 'smtp.zoho.in';
  }

  if (!user || user === 'missing') user = 'hiddenlamp@ems.hiddenlamp.in';
  if (!pass || pass === 'missing') pass = 'Hiddenlamp@734006';

  console.log(`🔌 Initializing SMTP connection (${host}:${port})...`);

  // 1. Primary Config: Port 465 SSL (or specified port)
  try {
    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: secure,
      pool: false,
      auth: { user, pass },
      family: 4, // IPv4 resolution
      tls: {
        rejectUnauthorized: false,
        servername: host
      },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 15000
    });

    await transporter.verify();
    console.log(`✅ SMTP Port ${port} SSL (${host}) Connected & Verified!`);
    cachedTransporter = transporter;
    return transporter;
  } catch (errPrimary) {
    console.warn(`⚠️ Primary Port ${port} connection failed on ${host}: ${errPrimary.message}. Trying TLS fallback...`);
  }

  // 2. Fallback Config: Port 587 TLS
  const fallbackPort = port === 465 ? 587 : 465;
  const fallbackSecure = fallbackPort === 465;

  try {
    console.log(`🔌 Fallback to ${host}:${fallbackPort}...`);
    const transporter = nodemailer.createTransport({
      host: host,
      port: fallbackPort,
      secure: fallbackSecure,
      requireTLS: !fallbackSecure,
      family: 4,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
        servername: host
      },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 15000
    });

    await transporter.verify();
    console.log(`✅ SMTP Port ${fallbackPort} Fallback Verified!`);
    cachedTransporter = transporter;
    return transporter;
  } catch (errFallback) {
    console.warn(`⚠️ Fallback Port ${fallbackPort} connection failed: ${errFallback.message}`);
  }

  // 3. Direct Transporter Fallback
  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    family: 4,
    auth: { user, pass },
    tls: { rejectUnauthorized: false, servername: host },
    connectionTimeout: 15000
  });
}

async function sendPayslipEmail(data) {
  const { to, employeeName, period, payDate, grossPay, totalDeductions, netPay, netPayInWords, breakdown, payslipUrl, payslipDownloadUrl } = data;

  const rawUser = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || '').trim();
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();

  let senderEmail = process.env.RESEND_FROM_EMAIL || 'hiddenlamp@ems.hiddenlamp.in';
  if (resendApiKey || rawPass.startsWith('re_') || rawUser === 'resend') {
    if (process.env.RESEND_FROM_EMAIL) {
      senderEmail = process.env.RESEND_FROM_EMAIL;
    } else if (rawUser && rawUser.includes('@') && rawUser !== 'resend') {
      senderEmail = rawUser;
    } else {
      senderEmail = 'hiddenlamp@ems.hiddenlamp.in';
    }
  }

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

  const mailOptions = { from, to, subject, html };

  if (pdfBuffer) {
    const safeEmpName = (employeeName || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    mailOptions.attachments = [
      {
        filename: `Payslip_${safeEmpName}_${period}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];
  }

  const transporter = await getTransporter();

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to} (MessageID: ${info.messageId})`);
    return { messageId: info.messageId, previewUrl: null };
  } catch (sendErr) {
    console.error(`❌ Email Send Error for ${to}:`, sendErr.message);
    throw sendErr;
  }
}

module.exports = {
  sendPayslipEmail
};
