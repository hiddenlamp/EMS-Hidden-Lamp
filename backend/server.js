const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const session = require('express-session');
const SqliteSessionStore = require('./utils/session-store');
const { attachUser } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const employeesRouter = require('./routes/employees');
const payrollRouter = require('./routes/payroll');
const payslipsRouter = require('./routes/payslips');
const analyticsRouter = require('./routes/analytics');
const auditRouter = require('./routes/audit');
const expensesRouter = require('./routes/expenses');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'hidden_lamp_payroll_secret_key_change_in_production';

// Body Parser Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve Static Frontend Assets (CSS, Client JS, Logos, Signatures)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Set EJS View Engine Frontend Directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

// Session Configuration
app.use(session({
  store: new SqliteSessionStore(),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  }
}));

// Attach User Info to Views
app.use(attachUser);

// Backend Modular API & Controller Routes
app.use('/', authRoutes);
app.use('/employees', employeesRouter);
app.use('/payroll', payrollRouter);
app.use('/payslips', payslipsRouter);
app.use('/analytics', analyticsRouter);
app.use('/audit-logs', auditRouter);
app.use('/expenses', expensesRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 Not Found',
    message: 'The requested page could not be found.'
  });
});

// 500 Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    title: '500 Server Error',
    message: 'An unexpected internal error occurred.'
  });
});

const server = app.listen(PORT, () => {
  console.log(`Hidden Lamp Payroll Management System running at http://localhost:${PORT}`);
  console.log(`  📂 Backend Core Application  : ./backend`);
  console.log(`  🎨 Frontend UI & Public Assets: ./frontend`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = Number(PORT) + 1;
    console.log(`⚠️ Port ${PORT} is already in use. Automatically starting on port ${nextPort}...`);
    const fallbackServer = app.listen(nextPort, () => {
      console.log(`Hidden Lamp Payroll Management System running at http://localhost:${nextPort}`);
    });
    fallbackServer.on('error', (fErr) => {
      console.error('Server listen error:', fErr);
      process.exit(1);
    });
  } else {
    console.error('Server listen error:', err);
    process.exit(1);
  }
});
