# 🏥 Nurse Record System API

A high-performance hospital nursing record management system built with **Bun**, **Elysia**, and **TypeScript**. Designed for secure intranet use in healthcare facilities.

---

## ✨ Features

### 👥 **Patient Management**
- ✅ Register new patients into the system
- ✅ View patients by ward with real-time data
- ✅ Retrieve patient information by AN (Account Number) or HN (Hospital Number)
- ✅ Track patient admission records with shift history
- ✅ Support for patient shift assignments and transfers between wards

### 📋 **Shift Management**
- ✅ Record comprehensive shift assessments (vitals, pain, risk levels)
- ✅ Bulk patient-in-shift updates with transaction support
- ✅ Track shift types and assignments with time logging
- ✅ Ventilator usage tracking with status monitoring
- ✅ Oxygen support type management (room air, oxygen, HFNC, C/S)
- ✅ Safety precautions and special care requirements

### 🏢 **System Management**
- ✅ Ward/department management and configuration
- ✅ Specialty/department lookup and filtering
- ✅ Admission type and severity level management
- ✅ Staff management with position tracking
- ✅ Dynamic staff-to-ward assignments
- ✅ Shift type configuration

### 🔐 **Security Features** (Latest: March 2026)
- ✅ **JWT Authentication** - Secure token-based auth (8h expiration)
  - Environment-based secret (no hardcoded defaults)
  - Proper expiration enforcement
  - Token verification on every protected route
- ✅ **XSS Protection** - Using `sanitize-html` library
  - Removes all HTML tags and attributes
  - Protects against encoded XSS attempts
  - Applied to all user-input fields
- ✅ **SQL Injection Prevention** - 100% parameterized queries
  - No string concatenation in SQL statements
  - Automatic parameter escaping
- ✅ **CORS Protection** - Configurable for intranet
  - Restricted to authorized origins
  - Support for credentials
  - Limited to safe HTTP methods
- ✅ **Rate Limiting** - 50 requests/minute per IP
  - Prevents abuse and DoS attacks
  - Suitable for intranet environment
- ✅ **Security Headers**
  - Content-Security-Policy: 'self'
  - X-Frame-Options: DENY (prevents clickjacking)
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: enabled
  - Referrer-Policy: strict-origin-when-cross-origin

### 📊 **Logging & Monitoring**
- ✅ Request/response logging with detailed metrics
- ✅ **Daily log rotation** - Automatic file separation by date
- ✅ **Auto-cleanup** - Logs older than 45 days are automatically deleted
- ✅ Performance metrics - Request duration tracking
- ✅ User tracking - Login name per request
- ✅ HTTP status monitoring with color-coded output
- ✅ Colored console output for quick debugging
- ✅ File format: `access-YYYY-MM-DD.log`

### ⚡ **Performance**
- ✅ Async/await non-blocking operations
- ✅ Database connection pooling (50 connections)
- ✅ Efficient JSON serialization
- ✅ Optimized query execution
- ✅ Average response time: 200-350ms (database-bound)
- ✅ Support for bulk operations with transactions

---

## 🛠️ Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Runtime** | Bun.js | Latest |
| **Framework** | Elysia | v1.4.27 |
| **Database** | MySQL | 3.19.0 (2 databases: HIS + Nurse) |
| **Authentication** | JWT | @elysiajs/jwt v1.4.1 |
| **Security** | XSS Sanitizer | sanitize-html v2.17.2 |
| **CORS** | CORS Middleware | @elysiajs/cors v1.4.1 |
| **Rate Limiting** | Rate Limiter | elysia-rate-limit v4.5.0 |
| **Language** | TypeScript | Latest |

---

## 🚀 Quick Start

### Prerequisites
- Bun runtime (v1.3.0+)
- MySQL/MariaDB (2 instances - HIS and Nurse Record databases)
- Node.js 18+ (optional, if not using Bun)

### Installation

```bash
# Install dependencies
bun install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets
```

### Environment Variables (Required)

```env
# HIS Database Configuration
DB_HOST=192.168.xxx.xxx
DB_PORT=3306
DB_USER=xxxx
DB_PASSWORD=your_password
DB_NAME=his

# Nurse Record Database Configuration
NURSE_RECORD_HOST=192.168.1.xxx
NURSE_RECORD_PORT=3306
NURSE_RECORD_USER=xxxx
NURSE_RECORD_PASSWORD=your_password
NURSE_RECORD_NAME=nurse

# JWT Secret (REQUIRED - minimum 32 characters recommended)
# Generate with: openssl rand -base64 32
JWT_SECRET=your_secure_random_secret_min_32_chars

# CORS Origins (comma-separated for intranet)
# Example for intranet: http://localhost:3000,http://192.168.*.*
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Running

```bash
# Development mode with hot reload
bun run dev

# Production mode
bun run src/index.ts
```

Server runs on `http://localhost:3000`

---

## 📡 API Endpoints

### Authentication
- `POST /api/v1/login` - User login (returns JWT token)

### Patient Management
- `POST /api/v1/patients-list-by-ward` - Get patients by ward
- `GET /api/v1/view-patient-by-ward/:ward` - View patient list for ward
- `GET /api/v1/patients-register-by-ward/:ward` - Get registered patients with shift records
- `POST /api/v1/patient-by-an` - Get patient by Account Number
- `POST /api/v1/register-patient` - Register new patient (multi-step with transaction)

### Shift Management
- `POST /api/v1/save-patients-in-shift` - Bulk save patients in shift
- `POST /api/v1/save-shift-assessment` - Save shift assessment data
- `POST /api/v1/get-shift-assessment` - Retrieve shift assessment

### System Data
- `GET /api/v1/wards` - List all wards (HIS)
- `GET /api/v1/wardsV1` - List wards (Nurse Record DB)
- `GET /api/v1/spclty` - List medical specialties
- `GET /api/v1/admission-types` - List admission types
- `GET /api/v1/admission-severity-levels` - List severity levels
- `GET /api/v1/admission-change-shift-types` - List shift types

### Staff Management
- `GET /api/v1/staffs` - List all staff members
- `POST /api/v1/staffs` - Add new staff member
- `POST /api/v1/ward-staffs` - Assign staff to wards (bulk)
- `GET /api/v1/ward-staffs/:id` - Get staff assigned to specific ward
- `DELETE /api/v1/ward-staffs-clear/:ward` - Remove all staff from ward

### Nutrition/Dietary
- Various endpoints for meal management and ordering

### IC Unit
- Various endpoints for intensive care unit operations

---

## 📁 Project Structure

```
src/
├── index.ts                      # App entry point with middleware setup
├── db.ts                         # Database connection pools (HIS + Nurse)
├── controllers/
│   ├── patientController.ts      # Patient CRUD operations
│   ├── systemController.ts       # System data management
│   ├── nurseController.ts        # Nurse-specific operations
│   └── icController.ts           # IC unit operations
├── routes/
│   ├── patientRoutes.ts          # Patient endpoints
│   ├── systemRoutes.ts           # System endpoints
│   ├── authRoutes.ts             # Authentication
│   ├── nurseRoutes.ts            # Nurse endpoints
│   ├── icRoutes.ts               # IC endpoints
│   ├── protectedRoutes.ts        # Protected endpoints
│   └── nutritionRoutes.ts        # Nutrition endpoints
├── middlewares/
│   ├── authMiddleware.ts         # JWT verification & user extraction
│   ├── securityMiddleware.ts     # Security headers
│   ├── corsMiddleware.ts         # CORS policy enforcement
│   └── loggerMiddleware.ts       # Request logging with rotation
└── utils/
    └── sanitize.ts              # XSS protection utility
```

---

## 📊 Logging

### Access Logs
Logs are stored in `logs/` directory with **daily rotation**:
- **Format**: `access-YYYY-MM-DD.log`
- **Fields**: Timestamp | IP | User | Method | Path | Duration | Status | Referer | User-Agent
- **Rotation**: New file every 24 hours
- **Auto-cleanup**: Logs older than 45 days are automatically deleted
- **Cleanup Schedule**: On app startup and every 24 hours

### Console Output (Development)
- Colored by HTTP method (GET=🟢green, POST=🔵blue, DELETE=🔴red, etc.)
- Colored by status code (2xx=green, 4xx=yellow, 5xx=red)
- Shows request duration in milliseconds
- Displays authenticated user or "-" if unauthenticated

### Example Log Entry
```
2026-03-27T10:15:30.123Z | ::ffff:127.0.0.1 | fiat | POST | /api/v1/register-patient | 274ms | 200 | "http://localhost:3001/ipd/register" | "Mozilla/5.0..."
```

---

## 🔒 Security Implementation Details

### Recent Security Improvements (March 2026)

#### 1. JWT Security Enhancement
- ❌ **Removed**: Hardcoded default secret (`'your-secret-key'`)
- ✅ **Added**: Required JWT_SECRET from environment variables
- ✅ **Benefit**: Prevents token forgery if code is leaked
- ✅ **Enforcement**: App crashes with clear error if JWT_SECRET not set

#### 2. JWT Expiration Enforcement
- ❌ **Removed**: `ignoreExpiration: true` flag
- ✅ **Added**: Proper token expiration validation
- ✅ **Duration**: 8 hours per token
- ✅ **Benefit**: Limits window of exposure if token is stolen

#### 3. XSS Prevention
- ❌ **Removed**: Weak regex-based sanitization
- ✅ **Added**: Industry-standard `sanitize-html` library
- ✅ **Coverage**: Applied to all user-input fields
- ✅ **Benefit**: Protects against encoded and nested XSS attacks

#### 4. CORS Configuration
- ✅ **Added**: Configurable CORS middleware
- ✅ **Feature**: Restrict to authorized origins only
- ✅ **Support**: Credentials and custom headers
- ✅ **Intranet**: Easy to configure for internal network

#### 5. Log Rotation Implementation
- ✅ **Added**: Daily log file rotation
- ✅ **Feature**: Automatic cleanup of old logs (45-day retention)
- ✅ **Benefit**: Prevents disk space issues
- ✅ **Monitor**: Automatic deletion logged to console

---

## 📈 Performance Metrics

### Average Response Times (from production logs)
| Endpoint | Avg Time | Status | Requests |
|----------|----------|--------|----------|
| `/api/v1/nurse-schedules` | 350ms | Investigate | 2 |
| `/api/v1/register-patient` | 274ms | Normal | 45 |
| `/api/v1/ic/result-dep-in-fiscal-year` | 258ms | Normal | 31 |
| `/api/v1/save-shift-assessment` | 249ms | Normal | 75 |
| `/api/v1/wards` | 205ms | Optimal | 486 |

### Bottleneck Analysis
- **Root Cause**: Database queries (I/O-bound, not CPU-bound)
- **Not Required**: Multithreading/Worker threads
- **Recommended**: Database index optimization, query caching

### Optimization Recommendations
1. 🔍 **Add database indexes** on frequently queried columns
   - `ward`, `an`, `hn`, `spclty`, `status`
2. 💾 **Implement query caching** for static data
   - Wards, Specialties, Admission Types (rarely change)
3. 🗂️ **Review N+1 query problems** in controllers
4. 📊 **Monitor slow query logs** from MySQL

---

## 🚦 Rate Limiting

- **Limit**: 50 requests per minute per IP
- **Duration**: 60 seconds rolling window
- **Error Response**: "Rate limit exceeded. Please try again later."
- **Use Case**: Suitable for intranet with typical office usage patterns

---

## 🐛 Troubleshooting

### Database Connection Issues
```
Error: connect ECONNREFUSED
```
**Solutions:**
- Verify `DB_HOST` and `DB_PORT` in `.env`
- Check MySQL services are running
- Confirm firewall allows connection
- Test with: `mysql -h $DB_HOST -u $DB_USER -p $DB_PASSWORD`

### JWT/Authentication Errors
```
Error: JWT_SECRET not set
Error: Unauthorized
```
**Solutions:**
- Set `JWT_SECRET` in `.env` (min 32 chars)
- Generate with: `openssl rand -base64 32`
- Verify token format: `Bearer <token>`

### Log File Errors
```
Error: mkdir fails or permission denied
```
**Solutions:**
- Ensure `logs/` directory exists with write permissions
- Check available disk space
- Fix permissions: `chmod 755 logs/`

---

## 📝 Development Notes

### Type Checking
```bash
bun tsc --noEmit
```

### Building
```bash
bun build src/index.ts --outfile=dist/index.js
```

### Hot Reload
Development mode automatically restarts on file changes.

---

## 📋 Checklist for Production Deployment

- [ ] Set strong `JWT_SECRET` (32+ characters, random)
- [ ] Configure `CORS_ORIGINS` for production domains
- [ ] Verify database connectivity and credentials
- [ ] Enable SSL/TLS for HTTPS
- [ ] Test rate limiting under expected load
- [ ] Monitor logs directory disk usage
- [ ] Set up log backup/archival (beyond 45 days)
- [ ] Configure database backups
- [ ] Add database indexes as recommended
- [ ] Test all critical endpoints
- [ ] Set up monitoring and alerting

---

## 📄 License

Internal Use Only - Hospital System

---

**Last Updated**: March 27, 2026
**System Status**: ✅ Production Ready (Intranet)
**Security Level**: 🔒 Enhanced (March 2026 improvements)