const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'payroll.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize Schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'hr', 'employee')),
      employee_id INTEGER,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT UNIQUE,
      name TEXT NOT NULL,
      designation TEXT NOT NULL,
      department TEXT NOT NULL,
      work_location TEXT NOT NULL,
      date_of_joining TEXT NOT NULL,
      email TEXT,
      payment_mode TEXT DEFAULT 'Bank Transfer',
      pan TEXT,
      bank_name TEXT,
      bank_account TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'exited'))
    );

    CREATE TABLE IF NOT EXISTS salary_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      component_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('earning', 'deduction')),
      amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      period TEXT NOT NULL,
      days_present REAL NOT NULL DEFAULT 30,
      days_lop REAL NOT NULL DEFAULT 0,
      UNIQUE(employee_id, period),
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      status TEXT NOT NULL,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payroll_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period TEXT UNIQUE NOT NULL,
      pay_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'approved'))
    );

    CREATE TABLE IF NOT EXISTS payslips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_run_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      gross_pay REAL NOT NULL,
      total_deductions REAL NOT NULL,
      net_pay REAL NOT NULL,
      breakdown_json TEXT NOT NULL,
      UNIQUE(payroll_run_id, employee_id),
      FOREIGN KEY(payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS travel_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      claim_type TEXT NOT NULL DEFAULT 'Travel',
      item_title TEXT,
      from_location TEXT,
      to_location TEXT,
      purpose TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      travel_cost REAL NOT NULL DEFAULT 0,
      food_cost REAL NOT NULL DEFAULT 0,
      stay_cost REAL NOT NULL DEFAULT 0,
      misc_cost REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      advance_paid REAL NOT NULL DEFAULT 0,
      dues_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Reimbursed', 'Rejected')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      work_location TEXT NOT NULL,
      payment_mode TEXT DEFAULT 'Bank Transfer',
      payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK(payment_status IN ('Paid', 'Pending', 'Partial')),
      invoice_ref TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initSchema();

try {
  db.exec('ALTER TABLE employees ADD COLUMN employee_code TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE employees ADD COLUMN email TEXT;');
} catch (e) {}

try {
  db.exec("ALTER TABLE employees ADD COLUMN payment_mode TEXT DEFAULT 'Bank Transfer';");
} catch (e) {}

try {
  db.exec("ALTER TABLE travel_expenses ADD COLUMN claim_type TEXT DEFAULT 'Travel';");
} catch (e) {}

try {
  db.exec("ALTER TABLE travel_expenses ADD COLUMN item_title TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE travel_expenses ADD COLUMN submission_source TEXT DEFAULT 'Offline Form';");
} catch (e) {}

try {
  db.exec("ALTER TABLE travel_expenses ADD COLUMN receipt_ref TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE company_expenses ADD COLUMN vendor_name TEXT;");
} catch (e) {}

module.exports = db;
