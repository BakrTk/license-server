// tools/new-license.js
import Database from "better-sqlite3";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import fs from "fs";

dotenv.config();

const DB_PATH = process.env.DB_PATH || "./data/licenses.db";

// تأكد من وجود المجلد
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// توليد قيم
function randUpper(n) {
  return crypto.randomBytes(n).toString("hex").slice(0, n).toUpperCase();
}

// باراميترات من السطر
const args = process.argv.slice(2);
const seatsArg = parseInt(
  (args.find((a) => a.startsWith("--seats=")) || "").split("=")[1] || "1",
  10
);
const statusArg =
  (args.find((a) => a.startsWith("--status=")) || "").split("=")[1] || "active";
const keyArg =
  (args.find((a) => a.startsWith("--key=")) || "").split("=")[1] || null;

// جهّز الجداول (لو ناقصة)
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

// توليد الهوية والكود
const licId = "lic_" + crypto.randomBytes(6).toString("hex").slice(0, 8);
const licenseKey = keyArg || `ALY-${randUpper(6)}-2025`;
const seats = Number.isFinite(seatsArg) && seatsArg > 0 ? seatsArg : 1;
const status = statusArg === "blocked" ? "blocked" : "active";

// إدخال
db.prepare("INSERT INTO licenses(id, key, seats, status) VALUES (?,?,?,?)").run(
  licId,
  licenseKey,
  seats,
  status
);

// طباعة
console.log("✅ تم إنشاء ترخيص جديد");
console.log("ID   :", licId);
console.log("KEY  :", licenseKey);
console.log("Seats:", seats);
console.log("Status:", status);
