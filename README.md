# Hidden Lamp Employee Payroll Management System

A self-hosted, single-company employee payroll management web application built for **Hidden Lamp**.

## Features

1. **Role-Based Access Control**:
   - `admin`: Full access to employee CRUD, salary structure editor, payroll calculations, and approvals.
   - `hr`: Full access to manage employee profiles, set salary structures, and run payrolls.
   - `employee`: Self-service portal restricted to viewing the employee's own approved payslips.
2. **Dynamic Salary Component Editor**: Free-form earnings and deductions (Basic, HRA, Special Allowance, PF, PT, TDS, etc.) per employee with dynamic line-item add/remove.
3. **Monthly Payroll Lifecycle**:
   - Create period runs (e.g. `2026-07`).
   - Enter Leave Without Pay (LOP) days per employee (default 0).
   - Proration calculation:
     - Earnings are scaled by `(30 - LOP_days) / 30`.
     - Deductions are applied at full amount (unprorated).
     - Net Pay = Gross Earnings - Total Deductions.
   - Indian Currency & Amount-in-Words rendering (e.g., `Rupees Forty-Four Thousand Six Hundred and Sixty-Six and Paise Sixty-Seven only`).
   - Run Approval Lock: Locks attendance inputs and prevents recalculation once approved.
4. **Printable Payslip Views**:
   - Single printable payslip view for high quality individual printing.
   - 2-up per A4 sheet printable batch view with a dashed cut line dividing upper and lower payslips.

## Technology Stack

- **Server**: Node.js + Express
- **Database**: SQLite (`node:sqlite` native `DatabaseSync` for Node 24+, zero native compilation required)
- **Views**: EJS server-rendered templates + Vanilla CSS
- **Authentication**: `bcryptjs` password hashing + server-side SQLite-backed session store

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Seed Database**:
   ```bash
   npm run seed
   ```

4. **Start Application**:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your web browser.

## Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hiddenlamp.com` | `admin123` |
| HR | `hr@hiddenlamp.com` | `hr123` |
| Employee | `john@hiddenlamp.com` | `emp123` |

## Payroll Proration Rule Test Case

- **Employee**: Gross ₹50,000 (Basic ₹30,000 + HRA ₹15,000 + Special ₹5,000), Deductions ₹2,000 (PF ₹1,800 + PT ₹200).
- **Attendance**: 2 LOP Days (28 Days Present out of 30).
- **Prorated Earnings**:
  - Basic: `30000 * 28/30` = ₹28,000.00
  - HRA: `15000 * 28/30` = ₹14,000.00
  - Special: `5000 * 28/30` = ₹4,666.67
  - **Prorated Gross**: ₹46,666.67
- **Deductions (Unprorated)**: ₹2,000.00
- **Net Pay**: ₹44,666.67
- **Amount in Words**: `Rupees Forty-Four Thousand Six Hundred and Sixty-Six and Paise Sixty-Seven only`
