-- ============================================
-- Employee Management System - Database Schema
-- MySQL 8.0+
-- ============================================

CREATE DATABASE IF NOT EXISTS employee_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE employee_db;

-- ============================================
-- Tabel Users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)                      NOT NULL,
  email         VARCHAR(100)                      NOT NULL UNIQUE,
  password      VARCHAR(255)                      NOT NULL,
  role          ENUM('admin','user')              NOT NULL DEFAULT 'user',
  status        ENUM('active','inactive')         NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP                         DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP                         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Tabel Employees
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id                          INT AUTO_INCREMENT PRIMARY KEY,

  -- Identitas Karyawan
  employee_id                 VARCHAR(20)                                           NOT NULL UNIQUE COMMENT 'Nomor Induk Karyawan',
  first_name                  VARCHAR(50)                                           NOT NULL,
  last_name                   VARCHAR(50)                                           NOT NULL,
  email                       VARCHAR(100)                                          UNIQUE,
  phone                       VARCHAR(20),

  -- Data Pribadi
  birth_place                 VARCHAR(100),
  birth_date                  DATE,
  gender                      ENUM('male','female')                                NOT NULL,
  blood_type                  ENUM('A','B','AB','O','A+','A-','B+','B-','AB+','AB-','O+','O-'),
  religion                    ENUM('Islam','Kristen','Katholik','Hindu','Buddha','Konghucu','Lainnya'),
  marital_status              ENUM('single','married','divorced','widowed')        DEFAULT 'single',
  nationality                 VARCHAR(50)                                           DEFAULT 'Indonesia',
  nik                         VARCHAR(20)                                           COMMENT 'Nomor Induk Kependudukan (KTP)',
  npwp                        VARCHAR(20)                                           COMMENT 'Nomor Pokok Wajib Pajak',

  -- Alamat
  address                     TEXT,
  city                        VARCHAR(100),
  province                    VARCHAR(100),
  postal_code                 VARCHAR(10),

  -- Data Pekerjaan
  department                  VARCHAR(100),
  position                    VARCHAR(100)                                           COMMENT 'Jabatan',
  employment_status           ENUM('permanent','contract','internship','freelance') DEFAULT 'permanent',
  employment_type             ENUM('full-time','part-time','remote')               DEFAULT 'full-time',
  hire_date                   DATE                                                   COMMENT 'Tanggal Bergabung',
  contract_end_date           DATE                                                   COMMENT 'Akhir Kontrak',

  -- Data Keuangan
  salary                      DECIMAL(15,2)                                          DEFAULT 0,
  bank_name                   VARCHAR(50),
  bank_account                VARCHAR(30),
  bank_account_holder         VARCHAR(100),

  -- Kontak Darurat
  emergency_contact_name      VARCHAR(100),
  emergency_contact_phone     VARCHAR(20),
  emergency_contact_relation  VARCHAR(50),

  -- Lainnya
  photo                       VARCHAR(255),
  status                      ENUM('active','inactive','resigned','terminated')    DEFAULT 'active',
  notes                       TEXT,
  created_at                  TIMESTAMP                                             DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP                                             DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_employee_id (employee_id),
  INDEX idx_department (department),
  INDEX idx_status (status),
  INDEX idx_name (first_name, last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
