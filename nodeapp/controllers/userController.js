const bcrypt = require('bcryptjs');
const db = require('../config/database');

const userController = {
  // GET /users
  index: async (req, res) => {
    try {
      const search = req.query.search || '';
      let query = 'SELECT * FROM users';
      let params = [];
      if (search) {
        query += ' WHERE name LIKE ? OR email LIKE ?';
        params = [`%${search}%`, `%${search}%`];
      }
      query += ' ORDER BY created_at DESC';
      const [users] = await db.query(query, params);
      res.render('users/index', { title: 'Manajemen User', users, search });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Gagal memuat data user');
      res.redirect('/dashboard');
    }
  },

  // GET /users/create
  showCreate: (req, res) => res.render('users/create', { title: 'Tambah User' }),

  // POST /users
  create: async (req, res) => {
    const { name, email, password, role, status } = req.body;
    if (!name || !email || !password) {
      req.flash('error_msg', 'Nama, email, dan password wajib diisi');
      return res.redirect('/users/create');
    }
    if (password.length < 6) {
      req.flash('error_msg', 'Password minimal 6 karakter');
      return res.redirect('/users/create');
    }
    try {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length) {
        req.flash('error_msg', 'Email sudah terdaftar');
        return res.redirect('/users/create');
      }
      const hashed = await bcrypt.hash(password, 12);
      await db.query(
        'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashed, role || 'user', status || 'active']
      );
      req.flash('success_msg', 'User berhasil ditambahkan');
      res.redirect('/users');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Gagal menambahkan user');
      res.redirect('/users/create');
    }
  },

  // GET /users/:id/edit
  showEdit: async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
      if (!rows.length) {
        req.flash('error_msg', 'User tidak ditemukan');
        return res.redirect('/users');
      }
      res.render('users/edit', { title: 'Edit User', editUser: rows[0] });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Gagal memuat data user');
      res.redirect('/users');
    }
  },

  // PUT /users/:id
  update: async (req, res) => {
    const { name, email, password, role, status } = req.body;
    const userId = req.params.id;
    try {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existing.length) {
        req.flash('error_msg', 'Email sudah digunakan user lain');
        return res.redirect(`/users/${userId}/edit`);
      }
      if (password && password.trim()) {
        if (password.length < 6) {
          req.flash('error_msg', 'Password minimal 6 karakter');
          return res.redirect(`/users/${userId}/edit`);
        }
        const hashed = await bcrypt.hash(password, 12);
        await db.query(
          'UPDATE users SET name=?, email=?, password=?, role=?, status=? WHERE id=?',
          [name, email, hashed, role, status, userId]
        );
      } else {
        await db.query(
          'UPDATE users SET name=?, email=?, role=?, status=? WHERE id=?',
          [name, email, role, status, userId]
        );
      }
      req.flash('success_msg', 'User berhasil diperbarui');
      res.redirect('/users');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Gagal memperbarui user');
      res.redirect(`/users/${userId}/edit`);
    }
  },

  // DELETE /users/:id
  delete: async (req, res) => {
    const userId = req.params.id;
    if (parseInt(userId) === req.session.user.id) {
      req.flash('error_msg', 'Tidak dapat menghapus akun Anda sendiri');
      return res.redirect('/users');
    }
    try {
      await db.query('DELETE FROM users WHERE id = ?', [userId]);
      req.flash('success_msg', 'User berhasil dihapus');
      res.redirect('/users');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Gagal menghapus user');
      res.redirect('/users');
    }
  }
};

module.exports = userController;
