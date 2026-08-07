const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generates a clean, professional, print-ready PDF buffer for an employee payslip.
 * Matches the website's HTML design with actual Company Logo, Signature Image, and Rs. currency formatting.
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

      // 1. Header Banner
      doc.rect(36, 36, 523, 72).fill('#0f172a');
      
      // Draw Logo Image if available
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 48, 44, { fit: [140, 56] });
        } catch (e) {}
      }

      doc.fillColor('#ffffff')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('HIDDEN LAMP PRIVATE LIMITED', 190, 48, { align: 'right', width: 350 });
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#94a3b8')
         .text(`Employee Salary Slip for ${period} | Pay Date: ${payDate || 'End of Month'}`, 190, 70, { align: 'right', width: 350 });

      let y = 120;

      // 2. Employee Metadata Box
      doc.rect(36, y, 523, 75).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a');

      doc.fontSize(9).font('Helvetica-Bold').text(`Employee Name:`, 48, y + 12);
      doc.font('Helvetica').text(`${emp.name || 'Staff Member'}`, 150, y + 12);

      doc.font('Helvetica-Bold').text(`Employee Code:`, 320, y + 12);
      doc.font('Helvetica').text(`${emp.employee_code || 'EMP-' + emp.id}`, 420, y + 12);

      doc.font('Helvetica-Bold').text(`Designation:`, 48, y + 32);
      doc.font('Helvetica').text(`${emp.designation || 'Staff'}`, 150, y + 32);

      doc.font('Helvetica-Bold').text(`Work Location:`, 320, y + 32);
      doc.font('Helvetica').text(`${emp.work_location || 'Main Office'}`, 420, y + 32);

      doc.font('Helvetica-Bold').text(`Days Present / LOP:`, 48, y + 52);
      doc.font('Helvetica').text(`${breakdown.days_present || 30} Days (${breakdown.days_lop || 0} LOP Days)`, 150, y + 52);

      doc.font('Helvetica-Bold').text(`Pay Period:`, 320, y + 52);
      doc.font('Helvetica').text(`${period}`, 420, y + 52);

      y += 92;

      // 3. Earnings & Deductions Tables (Side by Side)
      const tableWidth = 250;
      const earningsX = 36;
      const deductionsX = 309;

      // Earnings Table Header
      doc.rect(earningsX, y, tableWidth, 22).fill('#2563eb');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
         .text('EARNINGS COMPONENT', earningsX + 8, y + 6)
         .text('AMOUNT (Rs.)', earningsX + 150, y + 6, { align: 'right', width: 90 });

      // Deductions Table Header
      doc.rect(deductionsX, y, tableWidth, 22).fill('#dc2626');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
         .text('DEDUCTIONS COMPONENT', deductionsX + 8, y + 6)
         .text('AMOUNT (Rs.)', deductionsX + 150, y + 6, { align: 'right', width: 90 });

      y += 22;

      const earningsList = breakdown.earnings || [];
      const deductionsList = breakdown.deductions || [];
      const maxRows = Math.max(earningsList.length, deductionsList.length, 1);
      const rowHeight = 20;

      for (let i = 0; i < maxRows; i++) {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(earningsX, y, tableWidth, rowHeight).fillAndStroke(rowBg, '#e2e8f0');
        doc.rect(deductionsX, y, tableWidth, rowHeight).fillAndStroke(rowBg, '#e2e8f0');

        doc.fillColor('#334155').font('Helvetica').fontSize(9);

        // Render Earning Item
        if (earningsList[i]) {
          const e = earningsList[i];
          const amt = (e.prorated_amount !== undefined ? e.prorated_amount : e.amount) || 0;
          doc.text(e.name, earningsX + 8, y + 5, { width: 140 });
          doc.font('Helvetica-Bold').fillColor('#0f172a')
             .text(`Rs. ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, earningsX + 145, y + 5, { align: 'right', width: 95 });
        }

        // Render Deduction Item
        if (deductionsList[i]) {
          const d = deductionsList[i];
          const amt = d.amount || 0;
          doc.font('Helvetica').fillColor('#334155')
             .text(d.name, deductionsX + 8, y + 5, { width: 140 });
          doc.font('Helvetica-Bold').fillColor('#dc2626')
             .text(`Rs. ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, deductionsX + 145, y + 5, { align: 'right', width: 95 });
        } else if (i === 0 && deductionsList.length === 0) {
          doc.fillColor('#94a3b8').text('Nil', deductionsX + 8, y + 5);
          doc.text('Rs. 0.00', deductionsX + 145, y + 5, { align: 'right', width: 95 });
        }

        y += rowHeight;
      }

      // Total Earnings & Total Deductions Summary Row
      doc.rect(earningsX, y, tableWidth, 22).fillAndStroke('#ecfdf5', '#a7f3d0');
      doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(9)
         .text('TOTAL GROSS EARNINGS', earningsX + 8, y + 6)
         .text(`Rs. ${grossPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, earningsX + 130, y + 6, { align: 'right', width: 110 });

      doc.rect(deductionsX, y, tableWidth, 22).fillAndStroke('#fff1f2', '#fecdd3');
      doc.fillColor('#9f1239').font('Helvetica-Bold').fontSize(9)
         .text('TOTAL DEDUCTIONS', deductionsX + 8, y + 6)
         .text(`Rs. ${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, deductionsX + 130, y + 6, { align: 'right', width: 110 });

      y += 30;

      // 4. Net Salary Highlight Banner
      doc.rect(36, y, 523, 58).fillAndStroke('#f0fdf4', '#86efac');
      
      doc.fillColor('#166534').font('Helvetica-Bold').fontSize(10)
         .text('NET SALARY PAYABLE', 48, y + 10, { align: 'center', width: 499 });

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18)
         .text(`Rs. ${netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 48, y + 26, { align: 'center', width: 499 });

      y += 68;

      // Amount In Words
      doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(9)
         .text(`Amount in Words: ${netPayInWords || ''}`, 36, y, { align: 'center', width: 523 });

      y += 28;

      // 5. PROMINENT AUTHORIZED SIGNATURE & STAMP SEAL BOX
      const sigWidth = 230;
      const leftSigX = 36;
      const rightSigX = 329;

      // Left Box: Employee Acknowledgement
      doc.rect(leftSigX, y, sigWidth, 75).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
         .text('EMPLOYEE ACKNOWLEDGEMENT', leftSigX, y + 8, { align: 'center', width: sigWidth });
      doc.fillColor('#94a3b8').font('Helvetica-Oblique').fontSize(8)
         .text('Employee Signature', leftSigX, y + 36, { align: 'center', width: sigWidth });
      doc.strokeColor('#64748b').lineWidth(1).moveTo(leftSigX + 20, y + 58).lineTo(leftSigX + sigWidth - 20, y + 58).stroke();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8)
         .text('Signature of Employee', leftSigX, y + 61, { align: 'center', width: sigWidth });

      // Right Box: Prominent Company Seal & Authorized Signatory Image
      doc.rect(rightSigX, y, sigWidth, 75).fillAndStroke('#eff6ff', '#93c5fd');
      doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(8)
         .text('FOR HIDDEN LAMP PRIVATE LIMITED', rightSigX, y + 8, { align: 'center', width: sigWidth });
      
      // Draw Signature Image if file exists
      if (fs.existsSync(signaturePath)) {
        try {
          doc.image(signaturePath, rightSigX + 35, y + 20, { fit: [160, 36] });
        } catch (e) {
          doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(8)
             .text('HIDDEN LAMP PVT LTD (SEAL)', rightSigX, y + 30, { align: 'center', width: sigWidth });
        }
      } else {
        doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(8)
           .text('HIDDEN LAMP PVT LTD (SEAL)', rightSigX, y + 30, { align: 'center', width: sigWidth });
      }

      doc.strokeColor('#1d4ed8').lineWidth(1.5).moveTo(rightSigX + 20, y + 58).lineTo(rightSigX + sigWidth - 20, y + 58).stroke();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8)
         .text('Authorized Signatory / Director', rightSigX, y + 61, { align: 'center', width: sigWidth });

      y += 85;

      // 6. Footer Note
      doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(36, y).lineTo(559, y).stroke();
      y += 8;

      doc.fillColor('#64748b').font('Helvetica').fontSize(8)
         .text('This is an official computer-generated salary payslip statement of Hidden Lamp Pvt. Ltd.', 36, y, { align: 'center', width: 523 });
      
      doc.text('Hidden Lamp Private Limited | Registered Office: 26, UIT Pratap Nagar, Jodhpur Rajasthan 342001 India', 36, y + 10, { align: 'center', width: 523 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePayslipPDFBuffer
};
