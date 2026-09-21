const PASSWORD_CHANGE_PATHS = ['/change-password', '/logout'];

function blockedByPasswordChange(req) {
  return req.session.user.mustChangePassword && !PASSWORD_CHANGE_PATHS.includes(req.path);
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (blockedByPasswordChange(req)) return res.redirect('/change-password');
    if (req.session.user.role !== role) return res.status(403).render('403');
    next();
  };
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  if (blockedByPasswordChange(req)) return res.redirect('/change-password');
  next();
}

module.exports = { requireRole, requireAuth };
