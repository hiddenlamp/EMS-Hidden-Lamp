const PDFDocument = require('pdfkit');

/**
 * Generates a clean, professional, print-ready PDF buffer for an employee payslip.
 * Uses pure PDFKit for fast, 0-dependency generation across all OS/cloud environments.
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

      // 1. Header Banner
      doc.rect(36, 36, 523, 70).fill('#0f172a');
      
      doc.fillColor('#ffffff')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('HIDDEN LAMP PRIVATE LIMITED', 48, 48, { align: 'center', width: 499 });
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#94a3b8')
         .text(`Employee Salary Slip for ${period} | Pay Date: ${payDate || 'End of Month'}`, 48, 72, { align: 'center', width: 499 });

      let y = 120;

      // 2. Employee Metadata Box
      doc.rect(36, y, 523, 75).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a');

      doc.fontSize(10).font('Helvetica-Bold').text(`Employee Name:`, 48, y + 12);
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

      y += 95;

      // 3. Earnings & Deductions Tables (Side by Side)
      const tableWidth = 250;
      const earningsX = 36;
      const deductionsX = 309;

      // Earnings Table Header
      doc.rect(earningsX, y, tableWidth, 22).fill('#2563eb');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
         .text('EARNINGS COMPONENT', earningsX + 8, y + 6)
         .text('AMOUNT (₹)', earningsX + 160, y + 6, { align: 'right', width: 80 });

      // Deductions Table Header
      doc.rect(deductionsX, y, tableWidth, 22).fill('#dc2626');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
         .text('DEDUCTIONS COMPONENT', deductionsX + 8, y + 6)
         .text('AMOUNT (₹)', deductionsX + 160, y + 6, { align: 'right', width: 80 });

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
          doc.text(e.name, earningsX + 8, y + 5, { width: 150 });
          doc.font('Helvetica-Bold').fillColor('#0f172a')
             .text(`₹${amt.toFixed(2)}`, earningsX + 160, y + 5, { align: 'right', width: 80 });
        }

        // Render Deduction Item
        if (deductionsList[i]) {
          const d = deductionsList[i];
          const amt = d.amount || 0;
          doc.font('Helvetica').fillColor('#334155')
             .text(d.name, deductionsX + 8, y + 5, { width: 150 });
          doc.font('Helvetica-Bold').fillColor('#dc2626')
             .text(`₹${amt.toFixed(2)}`, deductionsX + 160, y + 5, { align: 'right', width: 80 });
        } else if (i === 0 && deductionsList.length === 0) {
          doc.fillColor('#94a3b8').text('Nil', deductionsX + 8, y + 5);
          doc.text('₹0.00', deductionsX + 160, y + 5, { align: 'right', width: 80 });
        }

        y += rowHeight;
      }

      // Total Earnings & Total Deductions Summary Row
      doc.rect(earningsX, y, tableWidth, 22).fillAndStroke('#ecfdf5', '#a7f3d0');
      doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(9)
         .text('TOTAL GROSS EARNINGS', earningsX + 8, y + 6)
         .text(`₹${grossPay.toFixed(2)}`, earningsX + 160, y + 6, { align: 'right', width: 80 });

      doc.rect(deductionsX, y, tableWidth, 22).fillAndStroke('#fff1f2', '#fecdd3');
      doc.fillColor('#9f1239').font('Helvetica-Bold').fontSize(9)
         .text('TOTAL DEDUCTIONS', deductionsX + 8, y + 6)
         .text(`₹${totalDeductions.toFixed(2)}`, deductionsX + 160, y + 6, { align: 'right', width: 80 });

      y += 35;

      // 4. Net Salary Highlight Banner
      doc.rect(36, y, 523, 65).fillAndStroke('#f0fdf4', '#86efac');
      
      doc.fillColor('#166534').font('Helvetica-Bold').fontSize(11)
         .text('NET SALARY PAYABLE', 48, y + 12, { align: 'center', width: 499 });

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(20)
         .text(`₹${netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 48, y + 28, { align: 'center', width: 499 });

      y += 75;

      // Amount In Words
      doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(9)
         .text(`Amount in Words: ${netPayInWords || ''}`, 36, y, { align: 'center', width: 523 });

      y += 35;

      // 5. Footer & Signature Line
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(36, y).lineTo(559, y).stroke();
      y += 12;

      doc.fillColor('#64748b').font('Helvetica').fontSize(8)
         .text('This is a computer-generated salary slip and does not require a physical signature.', 36, y, { align: 'center', width: 523 });
      
      doc.text('Hidden Lamp Private Limited | Registered Office: 26, UIT Pratap Nagar, Jodhpur Rajasthan 342001 India', 36, y + 12, { align: 'center', width: 523 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePayslipPDFBuffer
};
