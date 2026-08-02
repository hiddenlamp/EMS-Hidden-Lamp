const bcrypt = require('bcryptjs');
const db = require('./backend/db/database');

console.log('Seeding Hidden Lamp Location-Wise Employee Payroll Database (July 2026 Register)...');

const locationData = [
  // 1. Hazaribagh (9 heads · Rs. 151,300)
  { location: 'Hazaribagh', name: 'Arjun', designation: 'Staff', dept: 'Operations', salary: 12000 },
  { location: 'Hazaribagh', name: 'Premeshwar', designation: 'Staff', dept: 'Operations', salary: 16000 },
  { location: 'Hazaribagh', name: 'Rahul', designation: 'Senior Staff', dept: 'Operations', salary: 19000 },
  { location: 'Hazaribagh', name: 'Aasca', designation: 'Staff', dept: 'Operations', salary: 18000 },
  { location: 'Hazaribagh', name: 'Supriya', designation: 'Location Head', dept: 'Management', salary: 40000 },
  { location: 'Hazaribagh', name: 'Sumesh', designation: 'Assistant Head', dept: 'Management', salary: 25000 },
  { location: 'Hazaribagh', name: 'Cleaner (Hazaribagh)', designation: 'Support Staff', dept: 'Maintenance', salary: 2500 },
  { location: 'Hazaribagh', name: 'Sweeper (Hazaribagh)', designation: 'Support Staff', dept: 'Maintenance', salary: 800 },
  { location: 'Hazaribagh', name: 'Office Rent (Hazaribagh)', designation: 'Fixed Facility Expense', dept: 'Administration', salary: 18000 },

  // 2. Khunti (1 head · Rs. 21,000)
  { location: 'Khunti', name: 'Priyanshu', designation: 'Location Head', dept: 'Operations', salary: 21000 },

  // 3. Ranchi (1 head · Rs. 18,000)
  { location: 'Ranchi', name: 'Abhishek', designation: 'Location Head', dept: 'Operations', salary: 18000 },

  // 4. Sahibganj (4 heads · Rs. 25,000)
  { location: 'Sahibganj', name: 'Mamta', designation: 'Staff', dept: 'Operations', salary: 9000 },
  { location: 'Sahibganj', name: 'Day Guard (Sahibganj)', designation: 'Security Guard', dept: 'Security', salary: 7000 },
  { location: 'Sahibganj', name: 'Night Guard (Sahibganj)', designation: 'Security Guard', dept: 'Security', salary: 6000 },
  { location: 'Sahibganj', name: 'Cleaner (Sahibganj)', designation: 'Support Staff', dept: 'Maintenance', salary: 3000 },

  // 5. Deoghar (1 head · Rs. 12,000)
  { location: 'Deoghar', name: 'Rajeev', designation: 'Location Head', dept: 'Operations', salary: 12000 },

  // 6. Dantewada (6 heads · Rs. 93,500)
  { location: 'Dantewada', name: 'Upender', designation: 'Location Head', dept: 'Management', salary: 52000 },
  { location: 'Dantewada', name: 'Dikesh', designation: 'Staff', dept: 'Operations', salary: 12000 },
  { location: 'Dantewada', name: 'Roshni', designation: 'Staff', dept: 'Operations', salary: 9000 },
  { location: 'Dantewada', name: 'Cleaner (Dantewada)', designation: 'Support Staff', dept: 'Maintenance', salary: 6000 },
  { location: 'Dantewada', name: 'Sweeper (Dantewada)', designation: 'Support Staff', dept: 'Maintenance', salary: 2500 },
  { location: 'Dantewada', name: 'Bus Driver (Dantewada)', designation: 'Transport Driver', dept: 'Logistics', salary: 12000 },

  // 7. Gumla (3 heads · Rs. 23,000)
  { location: 'Gumla', name: 'Ankita', designation: 'Staff', dept: 'Operations', salary: 10000 },
  { location: 'Gumla', name: 'Bipasha', designation: 'Staff', dept: 'Operations', salary: 10000 },
  { location: 'Gumla', name: 'Cleaner (Gumla)', designation: 'Support Staff', dept: 'Maintenance', salary: 3000 },

  // 8. Patna (1 head · Rs. 27,000)
  { location: 'Patna', name: 'Subham', designation: 'Location Head', dept: 'Operations', salary: 27000 },

  // 9. Gomia (2 heads · Rs. 43,500)
  { location: 'Gomia', name: 'Piyush Kumar', designation: 'Staff', dept: 'Operations', salary: 23000 },
  { location: 'Gomia', name: 'Roshan Kumar', designation: 'Staff', dept: 'Operations', salary: 20500 }
];

db.exec('BEGIN TRANSACTION');
try {
  // Clear previous records
  db.exec(`
    DELETE FROM payslips;
    DELETE FROM payroll_runs;
    DELETE FROM attendance;
    DELETE FROM salary_components;
    DELETE FROM users;
    DELETE FROM employees;
  `);

  // Insert Admin User
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);

  db.prepare(`
    INSERT INTO users (email, password_hash, role, employee_id)
    VALUES ('admin@hiddenlamp.com', ?, 'admin', NULL)
  `).run(adminPasswordHash);

  const insertEmpStmt = db.prepare(`
    INSERT INTO employees (employee_code, name, designation, department, work_location, date_of_joining, email, status)
    VALUES (?, ?, ?, ?, ?, '2024-01-01', ?, 'active')
  `);

  const insertCompStmt = db.prepare(`
    INSERT INTO salary_components (employee_id, component_name, type, amount)
    VALUES (?, 'Basic Salary', 'earning', ?)
  `);



  let totalBudget = 0;
  locationData.forEach((item, index) => {
    const empCode = 'HL-' + String(index + 1).padStart(3, '0');
    let email = '';
    if (!item.name.toLowerCase().includes('rent')) {
      email = `${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@hiddenlamp.com`;
    }
    const res = insertEmpStmt.run(empCode, item.name, item.designation, item.dept, item.location, email);
    const empId = Number(res.lastInsertRowid);

    insertCompStmt.run(empId, item.salary);
    totalBudget += item.salary;
  });

  // Seed attendance logs for July 2026 (July 25 to July 31)
  db.exec('DELETE FROM attendance_logs;');
  const insertAttendanceLog = db.prepare(`
    INSERT INTO attendance_logs (employee_id, date, check_in, check_out, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const allEmployees = db.prepare("SELECT id, name FROM employees WHERE status = 'active'").all();
  const dates = ['2026-07-25', '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31'];

  allEmployees.forEach((emp, i) => {
    dates.forEach((dt, dtIdx) => {
      let status = 'On Time';
      let checkIn = '09:00';
      let checkOut = '17:30';

      // Vary status deterministically for realistic data
      if ((i + dtIdx) % 7 === 0) {
        status = 'Late';
        checkIn = '09:45';
      } else if ((i + dtIdx) % 11 === 0 && !emp.name.toLowerCase().includes('rent')) {
        status = 'Absence';
        checkIn = null;
        checkOut = null;
      } else if ((i + dtIdx) % 13 === 0) {
        status = 'Half Day';
        checkIn = '09:00';
        checkOut = '13:00';
      }

      insertAttendanceLog.run(emp.id, dt, checkIn, checkOut, status);
    });
  });

  // Clear Employee Reimbursement Claims & Company Expenses (No demo data)
  db.exec('DELETE FROM travel_expenses;');
  db.exec('DELETE FROM company_expenses;');

  db.exec('COMMIT');

  console.log('Database seeded successfully with July 2026 Register, Attendance & Expenses!');
  console.log(`Total Heads Processed: ${locationData.length}`);
  console.log(`Total Monthly Salary Budget: ₹${totalBudget.toLocaleString('en-IN')}`);
  console.log('----------------------------------------------------');
  console.log('Admin Login    : admin@hiddenlamp.com / admin123');
  console.log('----------------------------------------------------');
} catch (err) {
  try { db.exec('ROLLBACK'); } catch (_) {}
  console.error('Error seeding database:', err);
  process.exit(1);
}
