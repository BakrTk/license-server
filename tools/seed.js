import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const dbPath = process.env.DB_PATH || "./data/licenses.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

// جداول مبسّطة
db.exec(`
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  seats INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' -- active|blocked
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  hw TEXT NOT NULL,
  activated_at TEXT NOT NULL,
  FOREIGN KEY(license_id) REFERENCES licenses(id)
);
`);

// أضف مفتاح اختبار
const licId = "lic_" + Math.random().toString(36).slice(2, 10);
const key =
  "ALY-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-2025";
db.prepare("INSERT INTO licenses(id, key, seats, status) VALUES(?,?,?,?)").run(
  licId,
  key,
  1,
  "active"
);

console.log("تم إنشاء قاعدة البيانات.");
console.log("License ID:", licId);
console.log("License KEY:", key);
