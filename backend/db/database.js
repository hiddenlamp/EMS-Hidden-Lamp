const sqlite = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'payroll.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite.DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'hr' CHECK(role IN ('admin', 'hr', 'employee')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT UNIQUE,
      name TEXT NOT NULL,
      designation TEXT NOT NULL,
      department TEXT NOT NULL,
      basic_salary REAL NOT NULL DEFAULT 0,
      hra REAL NOT NULL DEFAULT 0,
      conveyance REAL NOT NULL DEFAULT 0,
      medical_allowance REAL NOT NULL DEFAULT 0,
      special_allowance REAL NOT NULL DEFAULT 0,
      pf_deduction REAL NOT NULL DEFAULT 0,
      esi_deduction REAL NOT NULL DEFAULT 0,
      professional_tax REAL NOT NULL DEFAULT 0,
      tds_deduction REAL NOT NULL DEFAULT 0,
      other_deduction REAL NOT NULL DEFAULT 0,
      gross_salary REAL NOT NULL DEFAULT 0,
      net_salary REAL NOT NULL DEFAULT 0,
      bank_account TEXT NOT NULL,
      ifsc_code TEXT NOT NULL,
      pan_number TEXT NOT NULL,
      work_location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      email TEXT,
      payment_mode TEXT DEFAULT 'Bank Transfer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      year INTEGER NOT NULL,
      working_days INTEGER NOT NULL DEFAULT 30,
      present_days REAL NOT NULL DEFAULT 30,
      absent_days REAL NOT NULL DEFAULT 0,
      half_days REAL NOT NULL DEFAULT 0,
      leave_days REAL NOT NULL DEFAULT 0,
      basic_salary REAL NOT NULL DEFAULT 0,
      hra REAL NOT NULL DEFAULT 0,
      conveyance REAL NOT NULL DEFAULT 0,
      medical_allowance REAL NOT NULL DEFAULT 0,
      special_allowance REAL NOT NULL DEFAULT 0,
      gross_salary REAL NOT NULL DEFAULT 0,
      pf_deduction REAL NOT NULL DEFAULT 0,
      esi_deduction REAL NOT NULL DEFAULT 0,
      professional_tax REAL NOT NULL DEFAULT 0,
      tds_deduction REAL NOT NULL DEFAULT 0,
      other_deduction REAL NOT NULL DEFAULT 0,
      total_deductions REAL NOT NULL DEFAULT 0,
      net_salary REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Processed', 'Paid')),
      payment_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, month, year)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS travel_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      employee_name_input TEXT,
      project_name TEXT DEFAULT 'General Corporate',
      claim_type TEXT DEFAULT 'Travel',
      item_title TEXT,
      submission_source TEXT DEFAULT 'Offline Form',
      receipt_ref TEXT,
      from_location TEXT,
      to_location TEXT,
      purpose TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      travel_cost REAL DEFAULT 0,
      food_cost REAL DEFAULT 0,
      stay_cost REAL DEFAULT 0,
      misc_cost REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      advance_paid REAL DEFAULT 0,
      dues_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected', 'Reimbursed')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS company_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      expense_type TEXT DEFAULT 'Project' CHECK(expense_type IN ('Project', 'Company Overhead')),
      project_name TEXT DEFAULT 'General Corporate',
      vendor_name TEXT,
      responsible_employee_id INTEGER,
      amount REAL NOT NULL DEFAULT 0,
      advance_paid REAL DEFAULT 0,
      dues_amount REAL DEFAULT 0,
      date TEXT NOT NULL,
      work_location TEXT NOT NULL,
      payment_mode TEXT DEFAULT 'Bank Transfer',
      payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK(payment_status IN ('Paid', 'Pending', 'Partial')),
      invoice_ref TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (responsible_employee_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS company_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lender_name TEXT NOT NULL,
      lender_type TEXT NOT NULL DEFAULT 'Bank / NBFC',
      project_name TEXT NOT NULL DEFAULT 'General Corporate',
      principal_amount REAL NOT NULL DEFAULT 0,
      interest_rate REAL DEFAULT 0,
      total_payable REAL NOT NULL DEFAULT 0,
      repaid_amount REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL DEFAULT 0,
      disbursed_date TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Fully Repaid', 'Overdue', 'Restructured')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fund_rotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_pool TEXT NOT NULL,
      destination_project TEXT NOT NULL,
      rotation_purpose TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      transfer_date TEXT NOT NULL,
      settled_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'In Rotation' CHECK(status IN ('In Rotation', 'Settled / Returned', 'Absorbed in Expenses')),
      reference_no TEXT,
      managed_by TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initSchema();

// Safely alter existing tables if missing columns
try { db.exec('ALTER TABLE employees ADD COLUMN employee_code TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE employees ADD COLUMN email TEXT;'); } catch (e) {}
try { db.exec("ALTER TABLE employees ADD COLUMN payment_mode TEXT DEFAULT 'Bank Transfer';"); } catch (e) {}
try { db.exec("ALTER TABLE travel_expenses ADD COLUMN claim_type TEXT DEFAULT 'Travel';"); } catch (e) {}
try { db.exec("ALTER TABLE travel_expenses ADD COLUMN item_title TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE travel_expenses ADD COLUMN submission_source TEXT DEFAULT 'Offline Form';"); } catch (e) {}
try { db.exec("ALTER TABLE travel_expenses ADD COLUMN receipt_ref TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE travel_expenses ADD COLUMN employee_name_input TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_expenses ADD COLUMN vendor_name TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_expenses ADD COLUMN project_name TEXT DEFAULT 'General Corporate';"); } catch (e) {}
try { db.exec("ALTER TABLE company_expenses ADD COLUMN expense_type TEXT DEFAULT 'Project';"); } catch (e) {}
try { db.exec("ALTER TABLE company_expenses ADD COLUMN advance_paid REAL DEFAULT 0;"); } catch (e) {}
try { db.exec("ALTER TABLE company_expenses ADD COLUMN dues_amount REAL DEFAULT 0;"); } catch (e) {}
try { db.exec("ALTER TABLE travel_expenses ADD COLUMN project_name TEXT DEFAULT 'General Corporate';"); } catch (e) {}
try { db.exec("ALTER TABLE payslips ADD COLUMN email_status TEXT DEFAULT 'Not Sent';"); } catch (e) {}
try { db.exec("ALTER TABLE payslips ADD COLUMN email_sent_at DATETIME;"); } catch (e) {}
try { db.exec("ALTER TABLE payslips ADD COLUMN email_error TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE payslips ADD COLUMN payment_status TEXT DEFAULT 'Pending';"); } catch (e) {}
try { db.exec("ALTER TABLE payslips ADD COLUMN payment_date DATETIME;"); } catch (e) {}
try { db.exec("ALTER TABLE payslips ADD COLUMN payment_reference TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_loans ADD COLUMN tenure_months INTEGER DEFAULT 12;"); } catch (e) {}
try { db.exec("ALTER TABLE company_loans ADD COLUMN calculated_emi REAL DEFAULT 0;"); } catch (e) {}
try { db.exec("ALTER TABLE company_loans ADD COLUMN total_interest REAL DEFAULT 0;"); } catch (e) {}
try { db.exec("ALTER TABLE company_loans ADD COLUMN repayment_schedule_json TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_loans ADD COLUMN processing_fee REAL DEFAULT 0;"); } catch (e) {}
try { db.exec("ALTER TABLE company_loans ADD COLUMN collateral_details TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_loans ADD COLUMN due_day_of_month INTEGER DEFAULT 5;"); } catch (e) {}
try { db.exec("ALTER TABLE company_loans ADD COLUMN account_number TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_loans ADD COLUMN contact_person TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_loans ADD COLUMN manual_emi REAL DEFAULT 0;"); } catch (e) {}

// Backfill expense_type & dues for existing records
try {
  db.exec("UPDATE company_expenses SET expense_type = 'Company Overhead' WHERE project_name IS NULL OR TRIM(project_name) = '' OR TRIM(project_name) = 'General Corporate';");
  db.exec("UPDATE company_expenses SET expense_type = 'Project' WHERE project_name IS NOT NULL AND TRIM(project_name) != '' AND TRIM(project_name) != 'General Corporate';");
  db.exec("UPDATE company_expenses SET dues_amount = CASE WHEN payment_status = 'Paid' THEN 0 ELSE MAX(0, amount - COALESCE(advance_paid, 0)) END WHERE dues_amount IS NULL OR dues_amount = 0;");
} catch (e) {}

// High Performance DB Indexes for Instant Page Navigation & Fast Queries
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
    CREATE INDEX IF NOT EXISTS idx_employees_location ON employees(work_location);
    CREATE INDEX IF NOT EXISTS idx_company_exp_type ON company_expenses(expense_type);
    CREATE INDEX IF NOT EXISTS idx_company_exp_proj ON company_expenses(project_name);
    CREATE INDEX IF NOT EXISTS idx_travel_exp_emp ON travel_expenses(employee_id);
    CREATE INDEX IF NOT EXISTS idx_travel_exp_status ON travel_expenses(status);
    CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(payroll_run_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_emp ON payslips(employee_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_payment_status ON payslips(payment_status);
    CREATE INDEX IF NOT EXISTS idx_employee_loans_emp ON employee_loans(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employee_loans_status ON employee_loans(status);
  `);
} catch (e) {}

// Seed / Reset Default Admin User
function seedAdmin() {
  const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@hiddenlamp.com');
  const hash = bcrypt.hashSync('admin123', 10);
  if (!existingAdmin) {
    db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run('admin@hiddenlamp.com', hash, 'admin');
    console.log('✅ Default Admin User created: admin@hiddenlamp.com / admin123');
  } else {
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, 'admin@hiddenlamp.com');
    console.log('✅ Default Admin User password reset: admin@hiddenlamp.com / admin123');
  }
}
seedAdmin();

module.exports = db;
