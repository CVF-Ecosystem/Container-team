/**
 * Database Seed - Initial Data
 * Run: npm run db:seed
 */

import bcrypt from "bcryptjs";
import { pool, query } from "./index.js";

async function seed() {
  console.log("🌱 Seeding database...\n");

  // 1. Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  await query(
    `INSERT INTO users (username, password_hash, name, role, department)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (username) DO NOTHING`,
    ["admin", adminPassword, "Administrator", "admin", "IT"]
  );
  console.log("✅ Admin user created (username: admin, password: admin123)");

  // 2. Create sample employees
  const employees = [
    {
      mscd: "NV001",
      name: "Nguyễn Văn A",
      department: "Cầu tàu",
      shift: "Ca 1",
      role: "Công nhân",
    },
    {
      mscd: "NV002",
      name: "Trần Thị B",
      department: "Cầu tàu",
      shift: "Ca 2",
      role: "Công nhân",
    },
    {
      mscd: "NV003",
      name: "Lê Văn C",
      department: "Bãi",
      shift: "Ca 1",
      role: "Lái xe nâng",
    },
    {
      mscd: "NV004",
      name: "Phạm Thị D",
      department: "Bãi",
      shift: "Ca 2",
      role: "Lái xe nâng",
    },
    {
      mscd: "NV005",
      name: "Hoàng Văn E",
      department: "CFS",
      shift: "Ca 1",
      role: "Công nhân",
    },
    {
      mscd: "NV006",
      name: "Ngô Thị F",
      department: "Văn phòng",
      shift: "Hành chính",
      role: "Kế toán",
    },
  ];

  for (const emp of employees) {
    await query(
      `INSERT INTO employees (mscd, name, department, shift, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (mscd) DO NOTHING`,
      [emp.mscd, emp.name, emp.department, emp.shift, emp.role]
    );
  }
  console.log(`✅ ${employees.length} employees created`);

  // 3. Create sample daily data (last 30 days)
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    await query(
      `INSERT INTO daily_data (date, year, month, day, xe_ha, xe_giao, xe_cfs, xalan_ha, xalan_giao, xalan_cfs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (date) DO NOTHING`,
      [
        dateStr,
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        Math.floor(Math.random() * 100) + 50, // xe_ha
        Math.floor(Math.random() * 80) + 40, // xe_giao
        Math.floor(Math.random() * 30) + 10, // xe_cfs
        Math.floor(Math.random() * 60) + 20, // xalan_ha
        Math.floor(Math.random() * 50) + 20, // xalan_giao
        Math.floor(Math.random() * 20) + 5, // xalan_cfs
      ]
    );
  }
  console.log("✅ 30 days of daily data created");

  // 4. Create sample vessels
  const vessels = [
    { name: "EVER GIVEN", shipping_line: "Evergreen", imo: "IMO9811000" },
    { name: "MSC OSCAR", shipping_line: "MSC", imo: "IMO9703291" },
    { name: "OOCL HONG KONG", shipping_line: "OOCL", imo: "IMO9776171" },
    { name: "COSCO SHIPPING", shipping_line: "COSCO", imo: "IMO9783473" },
  ];

  for (const vessel of vessels) {
    await query(
      `INSERT INTO vessels (name, shipping_line, imo_number)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING`,
      [vessel.name, vessel.shipping_line, vessel.imo]
    );
  }
  console.log(`✅ ${vessels.length} vessels created`);

  console.log("\n✅ Database seeded successfully!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
