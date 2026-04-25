/**
 * Database Migrations
 * Run: npm run db:migrate
 */

import { pool, query } from "./index.js";

interface MigrationStep {
  name: string;
  sql: string;
}

const migrations: MigrationStep[] = [
  {
    name: "Enable pgcrypto extension",
    sql: `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  },
  {
    name: "Create updated_at trigger function",
    sql: `CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`,
  },
  {
    name: "Create users table",
    sql: `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      department VARCHAR(50),
      active BOOLEAN DEFAULT true,
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: "Create employees table",
    sql: `CREATE TABLE IF NOT EXISTS employees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mscd VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      department VARCHAR(50) NOT NULL,
      shift VARCHAR(20) NOT NULL,
      role VARCHAR(50),
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: "Create daily_data table",
    sql: `CREATE TABLE IF NOT EXISTS daily_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE UNIQUE NOT NULL,
      year INT NOT NULL,
      month INT NOT NULL,
      day INT NOT NULL,
      xe_ha INT DEFAULT 0,
      xe_giao INT DEFAULT 0,
      xe_cfs INT DEFAULT 0,
      xe_hb INT DEFAULT 0,
      xe_tr INT DEFAULT 0,
      xe_ln INT DEFAULT 0,
      xe_cr INT DEFAULT 0,
      xe_dh INT DEFAULT 0,
      xe_rr INT DEFAULT 0,
      xalan_ha INT DEFAULT 0,
      xalan_giao INT DEFAULT 0,
      xalan_cfs INT DEFAULT 0,
      xalan_hb INT DEFAULT 0,
      xalan_tr INT DEFAULT 0,
      xalan_ln INT DEFAULT 0,
      xalan_cr INT DEFAULT 0,
      xalan_dh INT DEFAULT 0,
      xalan_rr INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: "Create monthly_summary table",
    sql: `CREATE TABLE IF NOT EXISTS monthly_summary (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      year INT NOT NULL,
      month INT NOT NULL,
      quarter INT NOT NULL,
      xe_ha INT DEFAULT 0,
      xe_giao INT DEFAULT 0,
      xe_cfs INT DEFAULT 0,
      xalan_ha INT DEFAULT 0,
      xalan_giao INT DEFAULT 0,
      xalan_cfs INT DEFAULT 0,
      yoy_change_percent DECIMAL(5,2),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(year, month)
    )`,
  },
  {
    name: "Create reports table",
    sql: `CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_type VARCHAR(30) NOT NULL,
      date DATE NOT NULL,
      shift VARCHAR(20) NOT NULL,
      department VARCHAR(50) NOT NULL,
      reporter_id UUID REFERENCES users(id),
      reporter_name VARCHAR(100),
      data JSONB NOT NULL,
      status VARCHAR(20) DEFAULT 'submitted',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(report_type, date, shift, department)
    )`,
  },
  {
    name: "Create vessels table",
    sql: `CREATE TABLE IF NOT EXISTS vessels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) UNIQUE NOT NULL,
      shipping_line VARCHAR(100),
      imo_number VARCHAR(20),
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: "Create vessel_data table",
    sql: `CREATE TABLE IF NOT EXISTS vessel_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vessel_id UUID REFERENCES vessels(id),
      vessel_name VARCHAR(100) NOT NULL,
      voyage VARCHAR(50),
      shipping_line VARCHAR(100),
      date DATE NOT NULL,
      year INT NOT NULL,
      month INT NOT NULL,
      stt INT,
      atb TIMESTAMPTZ,
      atw TIMESTAMPTZ,
      atc TIMESTAMPTZ,
      atd TIMESTAMPTZ,
      nhap_tau INT DEFAULT 0,
      xuat_tau INT DEFAULT 0,
      shift_in INT DEFAULT 0,
      shift_out INT DEFAULT 0,
      teus INT DEFAULT 0,
      working_hours DECIMAL(6,2),
      berth_hours DECIMAL(6,2),
      berth_name VARCHAR(50),
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: "Create audit_logs table",
    sql: `CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      username VARCHAR(50),
      action VARCHAR(80) NOT NULL,
      resource_type VARCHAR(80) NOT NULL,
      resource_id VARCHAR(120),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: "Create push_subscriptions table",
    sql: `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      username VARCHAR(50),
      role VARCHAR(20),
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: "Create employees indexes",
    sql: `CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
      CREATE INDEX IF NOT EXISTS idx_employees_shift ON employees(shift);
      CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active)`,
  },
  {
    name: "Create daily_data indexes",
    sql: `CREATE INDEX IF NOT EXISTS idx_daily_data_year ON daily_data(year);
      CREATE INDEX IF NOT EXISTS idx_daily_data_month ON daily_data(month);
      CREATE INDEX IF NOT EXISTS idx_daily_data_date ON daily_data(date);
      CREATE INDEX IF NOT EXISTS idx_daily_data_year_month ON daily_data(year, month)`,
  },
  {
    name: "Create reports indexes",
    sql: `CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(date);
      CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`,
  },
  {
    name: "Create vessels indexes",
    sql: `CREATE INDEX IF NOT EXISTS idx_vessels_active ON vessels(active);
      CREATE INDEX IF NOT EXISTS idx_vessels_shipping_line ON vessels(shipping_line)`,
  },
  {
    name: "Create vessel_data indexes",
    sql: `CREATE INDEX IF NOT EXISTS idx_vessel_data_date ON vessel_data(date);
      CREATE INDEX IF NOT EXISTS idx_vessel_data_year_month ON vessel_data(year, month);
      CREATE INDEX IF NOT EXISTS idx_vessel_data_vessel_name ON vessel_data(vessel_name);
      CREATE INDEX IF NOT EXISTS idx_vessel_data_shipping_line ON vessel_data(shipping_line)`,
  },
  {
    name: "Create audit_logs indexes",
    sql: `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)`,
  },
  {
    name: "Create push_subscriptions indexes",
    sql: `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_role ON push_subscriptions(role);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled ON push_subscriptions(enabled)`,
  },
  {
    name: "Create updated_at triggers",
    sql: `DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
      CREATE TRIGGER trg_users_set_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_employees_set_updated_at ON employees;
      CREATE TRIGGER trg_employees_set_updated_at
      BEFORE UPDATE ON employees
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_daily_data_set_updated_at ON daily_data;
      CREATE TRIGGER trg_daily_data_set_updated_at
      BEFORE UPDATE ON daily_data
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_monthly_summary_set_updated_at ON monthly_summary;
      CREATE TRIGGER trg_monthly_summary_set_updated_at
      BEFORE UPDATE ON monthly_summary
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_reports_set_updated_at ON reports;
      CREATE TRIGGER trg_reports_set_updated_at
      BEFORE UPDATE ON reports
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_vessels_set_updated_at ON vessels;
      CREATE TRIGGER trg_vessels_set_updated_at
      BEFORE UPDATE ON vessels
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_vessel_data_set_updated_at ON vessel_data;
      CREATE TRIGGER trg_vessel_data_set_updated_at
      BEFORE UPDATE ON vessel_data
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_push_subscriptions_set_updated_at ON push_subscriptions;
      CREATE TRIGGER trg_push_subscriptions_set_updated_at
      BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()`,
  },
];

async function migrate() {
  console.log("Starting database migration...");

  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];

    try {
      await query(migration.sql);
      console.log(`OK ${i + 1}/${migrations.length}: ${migration.name}`);
    } catch (error) {
      console.error(`FAILED ${i + 1}/${migrations.length}: ${migration.name}`);
      throw error;
    }
  }

  console.log("Database migration completed successfully.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
