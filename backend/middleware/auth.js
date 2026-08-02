function attachUser(req, res, next) {
  req.user = req.session ? req.session.user : null;
  res.locals.user = req.session ? req.session.user : null;
  res.locals.path = req.path;
  next();
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  next();
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
    if (!allowedRoles.includes(req.session.user.role)) {
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
  requireRole
};
