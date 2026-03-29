const bcrypt = require('bcryptjs');
const db = require('../config/database');

const authController = {
  // GET /
  home: async (req, res) => {
    try {
      const [[{ empCount }]] = await db.query('SELECT COUNT(*) AS empCount FROM employees WHERE status = "active"');
      const [[{ userCount }]] = await db.query('SELECT COUNT(*) AS userCount FROM users WHERE status = "active"');
      res.render('index', { title: 'Home', empCount, userCount });
    } catch {
      res.render('index', { title: 'Home', empCount: 0, userCount: 0 });
    }
  },

  // GET /dashboard
  dashboard: async (req, res) => {
    try {
      const [[{ empCount }]] = await db.query('SELECT COUNT(*) AS empCount FROM employees');
      const [[{ activeEmpCount }]] = await db.query('SELECT COUNT(*) AS activeEmpCount FROM employees WHERE status = "active"');
      const [[{ userCount }]] = await db.query('SELECT COUNT(*) AS userCount FROM users');
      const [deptStats] = await db.query(
        'SELECT department, COUNT(*) AS count FROM employees WHERE department IS NOT NULL GROUP BY department ORDER BY count DESC LIMIT 5'
      );
      const [recentEmps] = await db.query('SELECT * FROM employees ORDER BY created_at DESC LIMIT 5');
      res.render('dashboard', { title: 'Dashboard', empCount, activeEmpCount, userCount, deptStats, recentEmps });
    } catch (err) {
      console.error(err);
      res.render('dashboard', { title: 'Dashboard', empCount: 0, activeEmpCount: 0, userCount: 0, deptStats: [], recentEmps: [] });
    }
  },

  // GET /login
  showLogin: (req, res) => res.render('auth/login', { title: 'Login' }),

  // POST /login
  login: async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash('error_msg', 'Email dan password wajib diisi');
      return res.redirect('/login');
    }
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND status = "active"', [email]);
      if (!rows.length) {
        req.flash('error_msg', 'Email atau password salah');
        return res.redirect('/login');
      }
      const user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        req.flash('error_msg', 'Email atau password salah');
        return res.redirect('/login');
      }
      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      req.flash('success_msg', `Selamat datang, ${user.name}!`);
      res.redirect('/dashboard');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Terjadi kesalahan server');
      res.redirect('/login');
    }
  },

  // GET /register
  showRegister: (req, res) => res.render('auth/register', { title: 'Registrasi' }),

  // POST /register
  register: async (req, res) => {
    const { name, email, password, confirm_password } = req.body;
    if (!name || !email || !password || !confirm_password) {
      req.flash('error_msg', 'Semua field wajib diisi');
      return res.redirect('/register');
    }
    if (password !== confirm_password) {
      req.flash('error_msg', 'Password dan konfirmasi password tidak cocok');
      return res.redirect('/register');
    }
    if (password.length < 6) {
      req.flash('error_msg', 'Password minimal 6 karakter');
      return res.redirect('/register');
    }
    try {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length) {
        req.flash('error_msg', 'Email sudah terdaftar');
        return res.redirect('/register');
      }
      const hashed = await bcrypt.hash(password, 12);
      await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "user")', [name, email, hashed]);
      req.flash('success_msg', 'Registrasi berhasil! Silakan login.');
      res.redirect('/login');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Terjadi kesalahan saat registrasi');
      res.redirect('/register');
    }
  },

  // GET /logout
  logout: (req, res) => {
    req.session.destroy(() => res.redirect('/'));
  }
};

module.exports = authController;
