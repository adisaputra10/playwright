const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi multer untuk upload foto
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/uploads/employees');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|jpg|png|gif)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Format foto tidak didukung. Gunakan JPEG, PNG, atau GIF'));
  }
}).single('photo');

// Helper: format nilai dari req.body atau null
const n = v => (v === '' || v === undefined) ? null : v;

const employeeController = {
  // GET /employees
  index: async (req, res) => {
    try {
      const search = req.query.search || '';
      const department = req.query.department || '';
      const status = req.query.status || '';

      let query = 'SELECT * FROM employees WHERE 1=1';
      const params = [];

      if (search) {
        query += ' AND (first_name LIKE ? OR last_name LIKE ? OR employee_id LIKE ? OR email LIKE ? OR position LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (department) { query += ' AND department = ?'; params.push(department); }
      if (status) { query += ' AND status = ?'; params.push(status); }

      query += ' ORDER BY created_at DESC';
      const [employees] = await db.query(query, params);
      const [departments] = await db.query(
        'SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department'
      );
      res.render('employees/index', {
        title: 'Manajemen Karyawan', employees, departments,
        search, selectedDept: department, selectedStatus: status
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Gagal memuat data karyawan');
      res.redirect('/dashboard');
    }
  },

  // GET /employees/create
  showCreate: (req, res) => res.render('employees/create', { title: 'Tambah Karyawan' }),

  // POST /employees
  create: (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        req.flash('error_msg', err.message || 'Gagal upload foto');
        return res.redirect('/employees/create');
      }
      const b = req.body;
      if (!b.employee_id || !b.first_name || !b.last_name || !b.gender) {
        req.flash('error_msg', 'ID Karyawan, nama depan, nama belakang, dan jenis kelamin wajib diisi');
        return res.redirect('/employees/create');
      }
      try {
        const [exists] = await db.query('SELECT id FROM employees WHERE employee_id = ?', [b.employee_id]);
        if (exists.length) {
          req.flash('error_msg', 'ID Karyawan sudah digunakan');
          return res.redirect('/employees/create');
        }
        const photo = req.file ? `/uploads/employees/${req.file.filename}` : null;
        await db.query(
          `INSERT INTO employees
          (employee_id, first_name, last_name, email, phone,
           birth_place, birth_date, gender, blood_type, religion, marital_status, nationality, nik, npwp,
           address, city, province, postal_code,
           department, position, employment_status, employment_type, hire_date, contract_end_date,
           salary, bank_name, bank_account, bank_account_holder,
           emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
           photo, status, notes)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            b.employee_id, b.first_name, b.last_name, n(b.email), n(b.phone),
            n(b.birth_place), n(b.birth_date), b.gender, n(b.blood_type), n(b.religion),
            b.marital_status || 'single', b.nationality || 'Indonesia', n(b.nik), n(b.npwp),
            n(b.address), n(b.city), n(b.province), n(b.postal_code),
            n(b.department), n(b.position), b.employment_status || 'permanent',
            b.employment_type || 'full-time', n(b.hire_date), n(b.contract_end_date),
            b.salary || 0, n(b.bank_name), n(b.bank_account), n(b.bank_account_holder),
            n(b.emergency_contact_name), n(b.emergency_contact_phone), n(b.emergency_contact_relation),
            photo, b.status || 'active', n(b.notes)
          ]
        );
        req.flash('success_msg', 'Data karyawan berhasil ditambahkan');
        res.redirect('/employees');
      } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menyimpan data karyawan: ' + err.message);
        res.redirect('/employees/create');
      }
    });
  },

  // GET /employees/:id
  show: async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
      if (!rows.length) {
        req.flash('error_msg', 'Karyawan tidak ditemukan');
        return res.redirect('/employees');
      }
      res.render('employees/detail', {
        title: `${rows[0].first_name} ${rows[0].last_name}`,
        emp: rows[0]
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Gagal memuat data karyawan');
      res.redirect('/employees');
    }
  },

  // GET /employees/:id/edit
  showEdit: async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
      if (!rows.length) {
        req.flash('error_msg', 'Karyawan tidak ditemukan');
        return res.redirect('/employees');
      }
      res.render('employees/edit', {
        title: `Edit - ${rows[0].first_name} ${rows[0].last_name}`,
        emp: rows[0]
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Gagal memuat data karyawan');
      res.redirect('/employees');
    }
  },

  // PUT /employees/:id
  update: (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        req.flash('error_msg', err.message || 'Gagal upload foto');
        return res.redirect(`/employees/${req.params.id}/edit`);
      }
      const empId = req.params.id;
      const b = req.body;
      try {
        const [existing] = await db.query(
          'SELECT id FROM employees WHERE employee_id = ? AND id != ?', [b.employee_id, empId]
        );
        if (existing.length) {
          req.flash('error_msg', 'ID Karyawan sudah digunakan karyawan lain');
          return res.redirect(`/employees/${empId}/edit`);
        }
        const [current] = await db.query('SELECT photo FROM employees WHERE id = ?', [empId]);
        let photo = current[0]?.photo || null;
        if (req.file) {
          if (photo) {
            const oldPath = path.join(__dirname, '../public', photo);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          photo = `/uploads/employees/${req.file.filename}`;
        }
        await db.query(
          `UPDATE employees SET
          employee_id=?, first_name=?, last_name=?, email=?, phone=?,
          birth_place=?, birth_date=?, gender=?, blood_type=?, religion=?, marital_status=?, nationality=?, nik=?, npwp=?,
          address=?, city=?, province=?, postal_code=?,
          department=?, position=?, employment_status=?, employment_type=?, hire_date=?, contract_end_date=?,
          salary=?, bank_name=?, bank_account=?, bank_account_holder=?,
          emergency_contact_name=?, emergency_contact_phone=?, emergency_contact_relation=?,
          photo=?, status=?, notes=?
          WHERE id=?`,
          [
            b.employee_id, b.first_name, b.last_name, n(b.email), n(b.phone),
            n(b.birth_place), n(b.birth_date), b.gender, n(b.blood_type), n(b.religion),
            b.marital_status || 'single', b.nationality || 'Indonesia', n(b.nik), n(b.npwp),
            n(b.address), n(b.city), n(b.province), n(b.postal_code),
            n(b.department), n(b.position), b.employment_status || 'permanent',
            b.employment_type || 'full-time', n(b.hire_date), n(b.contract_end_date),
            b.salary || 0, n(b.bank_name), n(b.bank_account), n(b.bank_account_holder),
            n(b.emergency_contact_name), n(b.emergency_contact_phone), n(b.emergency_contact_relation),
            photo, b.status || 'active', n(b.notes), empId
          ]
        );
        req.flash('success_msg', 'Data karyawan berhasil diperbarui');
        res.redirect(`/employees/${empId}`);
      } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal memperbarui data karyawan');
        res.redirect(`/employees/${empId}/edit`);
      }
    });
  },

  // DELETE /employees/:id
  delete: async (req, res) => {
    try {
      const [rows] = await db.query('SELECT photo FROM employees WHERE id = ?', [req.params.id]);
      if (rows.length && rows[0].photo) {
        const photoPath = path.join(__dirname, '../public', rows[0].photo);
        if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
      }
      await db.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
      req.flash('success_msg', 'Data karyawan berhasil dihapus');
      res.redirect('/employees');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Gagal menghapus data karyawan');
      res.redirect('/employees');
    }
  }
};

module.exports = employeeController;
