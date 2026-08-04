const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
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
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'hidden_lamp_payroll_secret_key_change_in_production';

// Trust proxy on Render / HTTPS reverse proxies
app.set('trust proxy', 1);

// CORS Middleware
const allowedOrigins = [
  'https://ems.hiddenlamp.in',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true
}));

// Body Parser Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Health Check Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Hidden Lamp Payroll Management System', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'Hidden Lamp Payroll Backend API is active' });
});

// Serve Static Public Assets (CSS, Images, Logos, Client JS)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Set EJS View Engine (100% Original Working Frontend)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

// Session Configuration
const isProd = process.env.NODE_ENV === 'production';
app.use(session({
  store: new SqliteSessionStore(),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  }
}));

// Attach User Info to Views
app.use(attachUser);

// Mount EJS & API Application Routes
app.use('/api', apiRouter);
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
  console.log(`  🎨 Full EJS Frontend Assets  : ./frontend`);
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
