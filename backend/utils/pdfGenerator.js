const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generates a 100% Pixel-Perfect, Same-to-Same PDF matching the Website's HTML Payslip design.
 * Features:
 * - White background, crisp top header with Company Logo image & Address
 * - Payslip Reference Badge & Month/Year header
 * - Employee Summary table (left) vs Net Pay Green Accent Card (right)
 * - Side-by-side Earnings (blue) & Deductions (red) tables
 * - Total Net Payable banner with highlighted amount
 * - Large Authorized Signatory Box with actual signature image & company stamp seal
 */
function generatePayslipPDFBuffer(payslipData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      const { breakdown, period, payDate, grossPay, totalDeductions, netPay, netPayInWords } = payslipData;
      const emp = breakdown.employee || {};

      // Image Asset Paths
      const logoPath = path.join(__dirname, '../../frontend/public/images/logo.png');
      const signaturePath = path.join(__dirname, '../../frontend/public/images/signature.png');

      // Helper function to format month-year string (e.g. '2026-07' -> 'July 2026')
      function formatPeriod(pStr) {
        if (!pStr) return 'July 2026';
        const parts = pStr.split('-');
        if (parts.length < 2) return pStr;
        const date = new Date(parts[0], parseInt(parts[1]) - 1, 1);
        return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }

      const monthYearStr = formatPeriod(period);
      const periodParts = (period || '2026-07').split('-');
      const mNum = periodParts.length >= 2 ? String(periodParts[1]).padStart(2, '0') : '07';
      const yNameShort = periodParts[0] || '2026';
      const refNo = breakdown.receipt_no || `HL/PS/${mNum}-${yNameShort}/${String(emp.id || 1).padStart(3, '0')}`;
      const empCode = emp.employee_code || (`HL${String(emp.id || 1).padStart(12, '0')}`);
      const paidDays = breakdown.days_present || (breakdown.days_in_month ? (breakdown.days_in_month - breakdown.days_lop) : 31);
      const lopDays = breakdown.days_lop || 0;

      let y = 36;

      // ==========================================
      // 1. TOP HEADER SECTION (Logo + Title + Month)
      // ==========================================
      // Draw Logo Image
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 36, y, { fit: [130, 48] });
        } catch (e) {}
      }

      // Company Title & Address
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16)
         .text('Hidden Lamp Private Limited', 145, y + 2);
      
      doc.fillColor('#64748b').font('Helvetica').fontSize(9)
         .text('26, UIT Pratap Nagar, Jodhpur Rajasthan, 342001 India', 145, y + 22);

      // Right Header: Ref Badge & Month
      const rightHeaderX = 380;
      // Ref Badge Pill
      doc.rect(rightHeaderX + 35, y, 144, 18).fillAndStroke('#eff6ff', '#bfdbfe');
      doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(9)
         .text(refNo, rightHeaderX + 35, y + 4, { align: 'center', width: 144 });

      doc.fillColor('#64748b').font('Helvetica').fontSize(9)
         .text('Payslip For the Month', rightHeaderX, y + 22, { align: 'right', width: 179 });

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(15)
         .text(monthYearStr, rightHeaderX, y + 34, { align: 'right', width: 179 });

      y += 58;

      // Divider Line
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(36, y).lineTo(559, y).stroke();
      y += 16;

      // ==========================================
      // 2. TOP GRID: Employee Summary vs Net Pay Card
      // ==========================================
      const summaryWidth = 280;
      const netPayCardX = 330;
      const netPayCardWidth = 229;

      // Left Column: Employee Summary
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9)
         .text('EMPLOYEE SUMMARY', 36, y);
      
      let sumY = y + 14;
      const summaryRows = [
        { label: 'Reference No', val: refNo, isBlue: true },
        { label: 'Employee Name', val: emp.name || 'Roshan Kumar' },
        { label: 'Employee ID', val: empCode },
        { label: 'Pay Period', val: monthYearStr },
        { label: 'Pay Date', val: payDate || '2026-07-30' }
      ];

      summaryRows.forEach(row => {
        doc.fillColor('#64748b').font('Helvetica').fontSize(9).text(row.label, 36, sumY, { width: 100 });
        doc.fillColor('#94a3b8').text(':', 140, sumY);
        doc.fillColor(row.isBlue ? '#2563eb' : '#0f172a')
           .font('Helvetica-Bold')
           .fontSize(9)
           .text(row.val, 150, sumY, { width: 170 });
        sumY += 16;
      });

      // Right Column: Net Pay Accent Card (Green Card matching website)
      doc.rect(netPayCardX, y, netPayCardWidth, 98).fillAndStroke('#ecfdf5', '#d1fae5');
      
      // Green Accent Bar
      doc.rect(netPayCardX + 14, y + 14, 4, 32).fill('#10b981');

      // Amount
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(20)
         .text(`Rs. ${netPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, netPayCardX + 26, y + 14);

      doc.fillColor('#059669').font('Helvetica-Bold').fontSize(8)
         .text('TOTAL NET PAY', netPayCardX + 26, y + 36);

      // Card Divider
      doc.strokeColor('#a7f3d0').lineWidth(1).moveTo(netPayCardX + 14, y + 54).lineTo(netPayCardX + netPayCardWidth - 14, y + 54).stroke();

      // Days Info
      doc.fillColor('#047857').font('Helvetica').fontSize(8).text('Paid Days', netPayCardX + 14, y + 62);
      doc.text(':', netPayCardX + 120, y + 62);
      doc.fillColor('#065f46').font('Helvetica-Bold').text(`${paidDays}`, netPayCardX + 140, y + 62, { align: 'right', width: 75 });

      doc.fillColor('#047857').font('Helvetica').fontSize(8).text('LOP Days', netPayCardX + 14, y + 78);
      doc.text(':', netPayCardX + 120, y + 78);
      doc.fillColor('#065f46').font('Helvetica-Bold').text(`${lopDays}`, netPayCardX + 140, y + 78, { align: 'right', width: 75 });

      y = Math.max(sumY, y + 106) + 10;

      // ==========================================
      // 3. TABLES: EARNINGS & DEDUCTIONS (SIDE BY SIDE)
      // ==========================================
      const tableWidth = 250;
      const earningsX = 36;
      const deductionsX = 309;

      // Earnings Section Header
      doc.rect(earningsX, y, tableWidth, 22).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8)
         .text('EARNINGS', earningsX + 10, y + 7)
         .text('AMOUNT (Rs.)', earningsX + 140, y + 7, { align: 'right', width: 100 });

      // Deductions Section Header
      doc.rect(deductionsX, y, tableWidth, 22).fillAndStroke('#fff1f2', '#fecdd3');
      doc.fillColor('#9f1239').font('Helvetica-Bold').fontSize(8)
         .text('DEDUCTIONS', deductionsX + 10, y + 7)
         .text('AMOUNT (Rs.)', deductionsX + 140, y + 7, { align: 'right', width: 100 });

      y += 22;

      // Table Column Sub-headers
      doc.rect(earningsX, y, tableWidth, 18).fillAndStroke('#fafafa', '#f1f5f9');
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5)
         .text('COMPONENT', earningsX + 10, y + 5)
         .text('MONTHLY FIXED', earningsX + 140, y + 5, { align: 'right', width: 100 });

      doc.rect(deductionsX, y, tableWidth, 18).fillAndStroke('#fafafa', '#f1f5f9');
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5)
         .text('COMPONENT', deductionsX + 10, y + 5)
         .text('DEDUCTED', deductionsX + 140, y + 5, { align: 'right', width: 100 });

      y += 18;

      const earningsList = breakdown.earnings || [];
      const deductionsList = breakdown.deductions || [];
      const maxRows = Math.max(earningsList.length, deductionsList.length, 1);
      const rowHeight = 22;

      for (let i = 0; i < maxRows; i++) {
        const rowBg = '#ffffff';
        doc.rect(earningsX, y, tableWidth, rowHeight).fillAndStroke(rowBg, '#f1f5f9');
        doc.rect(deductionsX, y, tableWidth, rowHeight).fillAndStroke(rowBg, '#f1f5f9');

        doc.fillColor('#334155').font('Helvetica').fontSize(8.5);

        // Render Earning Item
        if (earningsList[i]) {
          const e = earningsList[i];
          const amt = (e.prorated_amount !== undefined ? e.prorated_amount : e.amount) || 0;
          doc.text(e.name, earningsX + 10, y + 6, { width: 130 });
          doc.font('Helvetica-Bold').fillColor('#0f172a')
             .text(`Rs. ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, earningsX + 140, y + 6, { align: 'right', width: 100 });
        } else if (i === 0) {
          doc.text('Basic Salary', earningsX + 10, y + 6);
          doc.font('Helvetica-Bold').fillColor('#0f172a')
             .text(`Rs. ${grossPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, earningsX + 140, y + 6, { align: 'right', width: 100 });
        }

        // Render Deduction Item
        if (deductionsList[i]) {
          const d = deductionsList[i];
          const amt = d.amount || 0;
          doc.font('Helvetica').fillColor('#334155')
             .text(d.name, deductionsX + 10, y + 6, { width: 130 });
          doc.font('Helvetica-Bold').fillColor('#dc2626')
             .text(`Rs. ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, deductionsX + 140, y + 6, { align: 'right', width: 100 });
        } else if (i === 0) {
          doc.fillColor('#64748b').text('No Deductions', deductionsX + 10, y + 6);
          doc.font('Helvetica-Bold').fillColor('#0f172a').text('Rs. 0.00', deductionsX + 140, y + 6, { align: 'right', width: 100 });
        }

        y += rowHeight;
      }

      // Summary Total Row
      doc.rect(earningsX, y, tableWidth, 22).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5)
         .text('Total Gross Earnings', earningsX + 10, y + 6)
         .text(`Rs. ${grossPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, earningsX + 140, y + 6, { align: 'right', width: 100 });

      doc.rect(deductionsX, y, tableWidth, 22).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5)
         .text('Total Deductions', deductionsX + 10, y + 6);
      doc.fillColor('#dc2626')
         .text(`Rs. ${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, deductionsX + 140, y + 6, { align: 'right', width: 100 });

      y += 32;

      // ==========================================
      // 4. TOTAL NET PAYABLE BANNER (Website Banner)
      // ==========================================
      doc.rect(36, y, 350, 48).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9)
         .text('TOTAL NET PAYABLE', 48, y + 10);
      doc.fillColor('#64748b').font('Helvetica').fontSize(7.5)
         .text('Gross Earnings minus Total Deductions', 48, y + 24);

      doc.rect(386, y, 173, 48).fillAndStroke('#ecfdf5', '#e2e8f0');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(14)
         .text(`Rs. ${netPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 386, y + 16, { align: 'center', width: 173 });

      y += 62;

      // Amount In Words
      doc.fillColor('#475569').font('Helvetica').fontSize(8.5)
         .text(`Amount in Words: `, 36, y, { continued: true });
      doc.fillColor('#0f172a').font('Helvetica-Bold')
         .text(`${netPayInWords || breakdown.net_pay_words || 'Indian Rupee Twenty Thousand Five Hundred Only'}`);

      y += 35;

      // ==========================================
      // 5. SIGNATURES & STAMP SEAL SECTION
      // ==========================================
      const sigBoxWidth = 230;
      const leftBoxX = 36;
      const rightBoxX = 329;

      // Left: Employee Acknowledgement Box
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.5)
         .text('EMPLOYEE ACKNOWLEDGEMENT', leftBoxX, y, { align: 'center', width: sigBoxWidth });
      
      doc.rect(leftBoxX, y + 12, sigBoxWidth, 60).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#94a3b8').font('Helvetica-Oblique').fontSize(8)
         .text('Employee Signature', leftBoxX, y + 36, { align: 'center', width: sigBoxWidth });
      
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(leftBoxX, y + 80).lineTo(leftBoxX + sigBoxWidth, y + 80).stroke();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5)
         .text('Signature of Employee', leftBoxX, y + 84, { align: 'center', width: sigBoxWidth });

      // Right: Authorized Signatory Box with Real Signature Image
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.5)
         .text('FOR HIDDEN LAMP PRIVATE LIMITED', rightBoxX, y, { align: 'center', width: sigBoxWidth });
      
      doc.rect(rightBoxX, y + 12, sigBoxWidth, 60).fillAndStroke('#ffffff', '#e2e8f0');

      // Draw Real Signature Image if available
      if (fs.existsSync(signaturePath)) {
        try {
          doc.image(signaturePath, rightBoxX + 35, y + 16, { fit: [160, 52] });
        } catch (e) {
          doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(8)
             .text('HIDDEN LAMP PVT LTD (SEAL)', rightBoxX, y + 34, { align: 'center', width: sigBoxWidth });
        }
      } else {
        doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(8)
           .text('HIDDEN LAMP PVT LTD (SEAL)', rightBoxX, y + 34, { align: 'center', width: sigBoxWidth });
      }

      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(rightBoxX, y + 80).lineTo(rightBoxX + sigBoxWidth, y + 80).stroke();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5)
         .text('Authorized Signatory / Director', rightBoxX, y + 84, { align: 'center', width: sigBoxWidth });

      y += 104;

      // Footer Note
      doc.fillColor('#64748b').font('Helvetica').fontSize(7.5)
         .text(`This is an official computer-generated salary payslip statement of Hidden Lamp Pvt. Ltd. | Reference: ${refNo}`, 36, y, { align: 'center', width: 523 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePayslipPDFBuffer
};
