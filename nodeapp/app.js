require('dotenv').config();
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const path = require('path');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'ems-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true }
}));

// Flash messages
app.use(flash());

// Global variables for all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.currentUser = req.session.user || null;
  next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/employees', require('./routes/employees'));

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Halaman Tidak Ditemukan' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  🚀  Server berjalan di http://localhost:${PORT}`);
  console.log(`  📌  Tekan Ctrl+C untuk berhenti\n`);
});

module.exports = app;
