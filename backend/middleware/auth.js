const db = require('../db/database');

function getUserFromToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  try {
    const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
    if (parts.length >= 2) {
      const userId = parts[0];
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (user) {
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          employee_id: user.employee_id
        };
      }
    }
  } catch (e) {}
  return null;
}

function attachUser(req, res, next) {
  let user = req.session ? req.session.user : null;
  if (!user) {
    user = getUserFromToken(req);
    if (user && req.session) {
      req.session.user = user;
    }
  }
  req.user = user;
  res.locals.user = user;
  res.locals.path = req.path;
  next();
}

function requireAuth(req, res, next) {
  let user = req.session ? req.session.user : null;
  if (!user) {
    user = getUserFromToken(req);
  }

  if (!user) {
    if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('json')) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    return res.redirect('/login');
  }

  if (!req.session.user) {
    req.session.user = user;
  }
  next();
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    let user = req.session ? req.session.user : null;
    if (!user) {
      user = getUserFromToken(req);
    }

    if (!user) {
      if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('json')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(user.role)) {
      if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('json')) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.status(403).render('error', {
        title: '403 Forbidden',
        message: 'You do not have permission to access this resource.'
      });
    }
    next();
  };
}

module.exports = {
  attachUser,
  requireAuth,
  requireRole,
  getUserFromToken
};
