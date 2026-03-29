require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'employee_db',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00'
});

pool.getConnection()
  .then(conn => {
    console.log('  ✅  Database MySQL terhubung');
    conn.release();
  })
  .catch(err => {
    console.error('  ❌  Gagal koneksi database:', err.message);
    console.error('     Pastikan MySQL berjalan dan konfigurasi .env sudah benar');
    process.exit(1);
  });

module.exports = pool;
