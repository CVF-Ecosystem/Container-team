# 🚢 Tan Thuan Port API

REST API backend for Tan Thuan Port Management System.

## Tech Stack

- **Runtime**: Node.js 22+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 16
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### 1. Start PostgreSQL (using Docker)

```bash
docker compose up -d postgres
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Install Dependencies

```bash
npm ci
```

### 3.1 Verify Build Tooling

```bash
npm run typecheck
npm run build
```

### 4. Run Migrations

```bash
npm run db:migrate
```

### 5. Seed Database (Optional)

```bash
npm run db:seed
```

Creates:

- Admin user: `admin` / `admin123`
- Sample employees
- 30 days of sample data
- Sample vessels

### 6. Start Development Server

```bash
npm run dev
```

API runs at: http://localhost:3001

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/password` - Change password

### Daily Data

- `GET /api/daily-data` - List (filters: year, month, startDate, endDate, limit)
- `GET /api/daily-data/:date` - Get by date
- `POST /api/daily-data` - Upsert
- `POST /api/daily-data/bulk` - Bulk upsert
- `DELETE /api/daily-data/:date` - Delete

### Employees

- `GET /api/employees` - List (filters: department, shift, active, search)
- `GET /api/employees/departments` - Get departments
- `GET /api/employees/shifts` - Get shifts
- `POST /api/employees` - Create
- `PUT /api/employees/:id` - Update
- `DELETE /api/employees/:id` - Delete (admin only)
- `POST /api/employees/bulk` - Bulk upsert employees

### Reports

- `GET /api/reports` - List (filters: reportType, date, shift, department, status)
- `POST /api/reports` - Create
- `PUT /api/reports/:id` - Update
- `DELETE /api/reports/:id` - Delete

### Vessels

- `GET /api/vessels` - List vessels
- `POST /api/vessels` - Create vessel
- `PUT /api/vessels/:id` - Update vessel
- `GET /api/vessels/data/list` - Get vessel operation data
- `POST /api/vessels/data` - Create or update vessel data entry
- `POST /api/vessels/data/bulk` - Bulk upsert vessel data

### Statistics

- `GET /api/stats/summary` - Dashboard summary
- `GET /api/stats/monthly` - Monthly breakdown
- `GET /api/stats/quarterly` - Quarterly breakdown
- `GET /api/stats/compare` - Year-over-year comparison

### Operations / KPI

- `GET /api/ops/dashboard` - Realtime admin operations overview
- `GET /api/ops/executive-kpis` - Leadership KPI rollup for selected date
- `GET /api/ops/executive-report` - Leadership KPI report pack for month-to-date (`format=csv|json`)

### Integrations

- `GET /api/integrations/readiness` - Integration readiness metadata
- `GET /api/integrations/bi/daily-summary` - Flat daily BI dataset
  - Auth: `x-integration-key: <INTEGRATION_API_KEY>` or `Authorization: Bearer <INTEGRATION_API_KEY>`
  - Query: `startDate`, `endDate`, `format=json|csv`

## Authentication

All write operations require a valid JWT token.

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Use token in subsequent requests
curl http://localhost:3001/api/daily-data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Production Deployment

### Using Docker Compose

```bash
# Build and start all services
docker compose up -d

# Check logs
docker compose logs -f api
```

### Environment Variables

| Variable       | Description                  | Default               |
| -------------- | ---------------------------- | --------------------- |
| DATABASE_URL   | PostgreSQL connection string | -                     |
| DB_HOST        | Database host                | localhost             |
| DB_PORT        | Database port                | 5432                  |
| DB_NAME        | Database name                | tanthuan              |
| DB_USER        | Database user                | postgres              |
| DB_PASSWORD    | Database password            | postgres              |
| JWT_SECRET     | Secret for JWT signing       | (required)            |
| JWT_EXPIRES_IN | Token expiration             | 7d                    |
| PORT           | Server port                  | 3001                  |
| NODE_ENV       | Environment                  | development           |
| CORS_ORIGIN    | Allowed CORS origin          | http://localhost:3000 |
| VAPID_PUBLIC_KEY | Web Push public key        | -                     |
| VAPID_PRIVATE_KEY | Web Push private key      | -                     |
| VAPID_SUBJECT  | Web Push contact subject     | mailto:admin@tanthuanport.local |
| INTEGRATION_API_KEY | Machine-to-machine key for BI/ETL connectors | - |

Generate VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

## Project Structure

```
src/
├── config/
│   └── env.ts          # Environment configuration
├── db/
│   ├── index.ts        # Database connection & queries
│   ├── migrate.ts      # Database migrations
│   └── seed.ts         # Seed data
├── middleware/
│   ├── auth.ts         # JWT authentication
│   └── error.ts        # Error handling
├── routes/
│   ├── auth.ts         # Auth routes
│   ├── daily-data.ts   # Daily data CRUD
│   ├── employees.ts    # Employee management
│   ├── reports.ts      # Shift reports
│   ├── vessels.ts      # Vessel operations
│   └── stats.ts        # Statistics/analytics
└── index.ts            # App entry point
```
