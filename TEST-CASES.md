# Test Cases — Employee Management System (EMS)

Playwright E2E · 38 test cases · Browser: Chromium · Workers: 1 (sequential)

---

## auth.spec.js — 15 test cases

### Home Page
| # | Test Case | File |
|---|-----------|------|
| 1 | should display home page | auth.spec.js:6 |
| 2 | should show Login and Daftar links when guest | auth.spec.js:12 |

### Login
| # | Test Case | File |
|---|-----------|------|
| 3 | should show login form | auth.spec.js:21 |
| 4 | should reject wrong password | auth.spec.js:28 |
| 5 | should reject unknown email | auth.spec.js:37 |
| 6 | should login successfully with valid credentials | auth.spec.js:46 |
| 7 | should redirect already-logged-in user away from /login | auth.spec.js:52 |

### Register
| # | Test Case | File |
|---|-----------|------|
| 8 | should show registration form | auth.spec.js:60 |
| 9 | should register a new user successfully | auth.spec.js:67 |
| 10 | should reject duplicate email | auth.spec.js:79 |

### Protected Routes (Guest Redirect)
| # | Test Case | File |
|---|-----------|------|
| 11 | GET /dashboard should redirect to /login | auth.spec.js:93 |
| 12 | GET /users should redirect to /login | auth.spec.js:93 |
| 13 | GET /employees should redirect to /login | auth.spec.js:93 |

### Logout
| # | Test Case | File |
|---|-----------|------|
| 14 | should logout and redirect away from dashboard | auth.spec.js:101 |
| 15 | after logout /dashboard redirects to /login | auth.spec.js:112 |

---

## dashboard.spec.js — 5 test cases

### Dashboard
| # | Test Case | File |
|---|-----------|------|
| 16 | should display dashboard after login | dashboard.spec.js:10 |
| 17 | should show at least one stats card | dashboard.spec.js:15 |
| 18 | should have navbar links for employees and users | dashboard.spec.js:20 |
| 19 | should navigate to /employees via navbar | dashboard.spec.js:28 |
| 20 | should navigate to /users via navbar | dashboard.spec.js:33 |

---

## users.spec.js — 9 test cases

### Users - List
| # | Test Case | File |
|---|-----------|------|
| 21 | should display users list with table | users.spec.js:8 |
| 22 | should show admin account in list | users.spec.js:13 |
| 23 | should have create user link | users.spec.js:18 |

### Users - Create
| # | Test Case | File |
|---|-----------|------|
| 24 | should show create user form | users.spec.js:27 |
| 25 | should create a new user and show success message | users.spec.js:34 |

### Users - Edit
| # | Test Case | File |
|---|-----------|------|
| 26 | should open edit form with pre-filled name | users.spec.js:51 |
| 27 | should update user name successfully | users.spec.js:61 |

### Users - Delete
| # | Test Case | File |
|---|-----------|------|
| 28 | should delete a newly created user | users.spec.js:76 |
| 29 | own account row should have no delete button | users.spec.js:97 |

---

## employees.spec.js — 10 test cases

### Employees - List
| # | Test Case | File |
|---|-----------|------|
| 30 | should display employees list with table | employees.spec.js:21 |
| 31 | should have create employee link | employees.spec.js:26 |
| 32 | search form should be present | employees.spec.js:31 |

### Employees - Create
| # | Test Case | File |
|---|-----------|------|
| 33 | should show all form sections on create page | employees.spec.js:40 |
| 34 | should create a new employee successfully | employees.spec.js:48 |

### Employees - Detail
| # | Test Case | File |
|---|-----------|------|
| 35 | should open employee detail page | employees.spec.js:76 |

### Employees - Edit
| # | Test Case | File |
|---|-----------|------|
| 36 | should open edit form with pre-filled employee_id | employees.spec.js:93 |
| 37 | should update employee position | employees.spec.js:104 |

### Employees - Delete
| # | Test Case | File |
|---|-----------|------|
| 38 | should delete a test employee | employees.spec.js:123 |

---

## Summary

| File | Group | Tests |
|------|-------|------:|
| auth.spec.js | Home · Login · Register · Protected Routes · Logout | 15 |
| dashboard.spec.js | Dashboard | 5 |
| users.spec.js | List · Create · Edit · Delete | 9 |
| employees.spec.js | List · Create · Detail · Edit · Delete | 10 |
| **Total** | | **38** |
