const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  req.flash('error_msg', 'Silakan login terlebih dahulu');
  res.redirect('/login');
};

const ensureGuest = (req, res, next) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  next();
};

module.exports = { ensureAuthenticated, ensureGuest };
