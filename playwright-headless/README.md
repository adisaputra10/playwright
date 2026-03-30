# Playwright Headless — Browserless

Playwright E2E test suite untuk **Employee Management System** yang berjalan menggunakan [Browserless](https://github.com/browserless/chromium) sebagai remote headless Chrome — tanpa perlu menginstall browser secara lokal.

---

## Prasyarat

- [Node.js](https://nodejs.org) v18+
- [Docker](https://www.docker.com) (untuk menjalankan Browserless)
- Aplikasi EMS berjalan di `http://localhost:3000`

---

## 1. Jalankan Browserless

Jalankan container Browserless sekali, container ini bisa terus berjalan di background dan dipakai berulang kali.

```bash
docker run -d \
  -p 3001:3000 \
  --name always-running-chromium \
  --shm-size="2g" \
  -e "MAX_CONCURRENT_SESSIONS=10" \
  ghcr.io/browserless/chromium:latest
```

| Parameter | Keterangan |
|---|---|
| `-d` | Jalankan di background (detached) |
| `-p 3001:3000` | Expose port Browserless ke host port `3001` |
| `--shm-size="2g"` | Shared memory 2GB agar Chrome tidak crash |
| `MAX_CONCURRENT_SESSIONS=10` | Maksimum 10 sesi browser berjalan bersamaan |

### Cek status container

```bash
docker ps --filter "name=always-running-chromium"
```

### Stop / Start container

```bash
# Stop
docker stop always-running-chromium

# Start kembali (tanpa perlu docker run ulang)
docker start always-running-chromium

# Hapus container
docker rm -f always-running-chromium
```

---

## 2. Install dependencies

```bash
cd playwright-headless
npm install
```

---

## 3. Jalankan Tests

### Semua tests

```bash
npx playwright test
```

### Per file

```bash
npx playwright test tests/auth.spec.js
npx playwright test tests/dashboard.spec.js
npx playwright test tests/employees.spec.js
npx playwright test tests/users.spec.js
```

### Dengan output verbose

```bash
npx playwright test --reporter=list
```

---

## 4. Lihat Laporan HTML

Setelah test selesai, buka laporan interaktif:

```bash
npx playwright show-report
```

Laporan tersimpan di folder `playwright-report/`.

---

## 5. Environment Variables

| Variable | Default | Keterangan |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | URL aplikasi yang diuji |
| `BROWSERLESS_WS` | `ws://localhost:3001` | WebSocket endpoint Browserless |

Contoh penggunaan custom URL:

```bash
BASE_URL=http://192.168.1.100:3000 npx playwright test

BROWSERLESS_WS=ws://remote-server:3001 npx playwright test
```

---

## Struktur Folder

```
playwright-headless/
├── playwright.config.js     # Konfigurasi Playwright + koneksi Browserless
├── package.json
├── README.md
├── playwright-report/       # Laporan HTML (dibuat setelah test)
└── tests/
    ├── auth.spec.js          # Login, Register, Logout, Protected routes
    ├── dashboard.spec.js     # Dashboard & navigasi navbar
    ├── employees.spec.js     # CRUD karyawan
    ├── users.spec.js         # CRUD pengguna
    └── helpers/
        └── auth.js           # Helper loginAsAdmin & logout
```

---

## Coverage Tests

| File | Jumlah Test | Fitur |
|---|---|---|
| `auth.spec.js` | 15 | Home page, Login, Register, Logout, Protected routes |
| `dashboard.spec.js` | 5 | Dashboard stats, navigasi navbar |
| `employees.spec.js` | 9 | List, Create, Detail, Edit, Delete karyawan |
| `users.spec.js` | 9 | List, Create, Edit, Delete pengguna |
| **Total** | **38** | |
