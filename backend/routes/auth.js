const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');

// GET / -> Redirect to Login Page
router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// GET /login -> Always Render Login Page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// GET /logout -> Log out and Redirect to Login Page
router.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
});

// POST /login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).render('login', { error: 'Please provide both email and password.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());

  if (!user) {
    return res.status(401).render('login', { error: 'Invalid email or password.' });
  }

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) {
    return res.status(401).render('login', { error: 'Invalid email or password.' });
  }

  // Set session
  req.session.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    employee_id: user.employee_id
  };

  res.redirect('/dashboard');
});

// POST /logout
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
});

// GET /dashboard
router.get('/dashboard', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  // Statistics for Admin & HR
  const activeCount = db.prepare("SELECT COUNT(*) AS count FROM employees WHERE status = 'active'").get().count;
  const exitedCount = db.prepare("SELECT COUNT(*) AS count FROM employees WHERE status = 'exited'").get().count;
  const runCount = db.prepare('SELECT COUNT(*) AS count FROM payroll_runs').get().count;
  const locationCount = db.prepare("SELECT COUNT(DISTINCT work_location) AS count FROM employees").get().count;
  
  const totalBudget = db.prepare(`
    SELECT SUM(c.amount) as total
    FROM salary_components c
    JOIN employees e ON c.employee_id = e.id
    WHERE c.type = 'earning' AND e.status = 'active'
  `).get().total || 0;

  const locationSummary = db.prepare(`
    SELECT e.work_location, COUNT(e.id) as heads, SUM(c.amount) as location_budget
    FROM employees e
    LEFT JOIN salary_components c ON c.employee_id = e.id AND c.type = 'earning'
    WHERE e.status = 'active'
    GROUP BY e.work_location
    ORDER BY heads DESC
  `).all();

  const recentRuns = db.prepare('SELECT * FROM payroll_runs ORDER BY period DESC LIMIT 5').all();

  res.render('dashboard', {
    activeCount,
    exitedCount,
    runCount,
    locationCount,
    totalBudget,
    locationSummary,
    recentRuns
  });
});

module.exports = router;
