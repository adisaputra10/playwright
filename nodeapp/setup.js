/**
 * setup.js - Jalankan sekali untuk membuat database, tabel, dan user admin
 * Perintah: node setup.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function setup() {
  console.log('\n=== Employee Management System - Setup ===\n');

  let conn;
  try {
    // Koneksi tanpa database dulu
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'rootpassword',
      port: parseInt(process.env.DB_PORT) || 3306,
      multipleStatements: true
    });

    const dbName = process.env.DB_NAME || 'employee_db';

    console.log('  [1/4] Membuat database...');
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${dbName}\``);
    console.log(`        ✅  Database '${dbName}' siap`);

    console.log('  [2/4] Membuat tabel...');
    const schema = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');
    // Jalankan per statement (skip CREATE DATABASE & USE yang sudah dijalankan)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.toUpperCase().startsWith('CREATE DATABASE') && !s.toUpperCase().startsWith('USE '));

    for (const stmt of statements) {
      await conn.query(stmt);
    }
    console.log('        ✅  Tabel users dan employees berhasil dibuat');

    console.log('  [3/4] Membuat user admin default...');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await conn.query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES ('Administrator', 'admin@example.com', ?, 'admin', 'active')
       ON DUPLICATE KEY UPDATE name=name`,
      [hashedPassword]
    );
    console.log('        ✅  Admin user dibuat');

    console.log('  [4/4] Membuat folder upload...');
    const uploadDir = path.join(__dirname, 'public', 'uploads', 'employees');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    console.log('        ✅  Folder public/uploads/employees siap');

    console.log('\n  ===================================================');
    console.log('  ✅  Setup selesai!');
    console.log('  ===================================================');
    console.log('  🔐  Login menggunakan:');
    console.log('      Email   : admin@example.com');
    console.log('      Password: admin123');
    console.log('\n  🚀  Jalankan aplikasi dengan: npm start');
    console.log('  ===================================================\n');

  } catch (err) {
    console.error('\n  ❌  Setup gagal:', err.message);
    console.error('      Pastikan MySQL berjalan dan konfigurasi .env benar\n');
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

setup();
