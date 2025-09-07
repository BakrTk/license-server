import Database from "better-sqlite3";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

const DB_PATH = process.env.DB_PATH || "./data/licenses.db";
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  seats INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  hw TEXT NOT NULL,
  activated_at TEXT NOT NULL,
  FOREIGN KEY(license_id) REFERENCES licenses(id)
);
`);

const hasAny = db.prepare("SELECT 1 FROM licenses LIMIT 1").get();
if (hasAny) {
  console.log("ℹ️ Licenses already exist. Skipping seed.");
  process.exit(0);
}

const licId = "lic_" + Math.random().toString(36).slice(2, 10);
const key =
  "ALY-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-2025";
db.prepare("INSERT INTO licenses(id, key, seats, status) VALUES(?,?,?,?)").run(
  licId,
  key,
  1,
  "active"
);

console.log("✅ Seeded one license.");
console.log("License ID :", licId);
console.log("License KEY:", key);
