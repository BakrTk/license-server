// tools/list-licenses.js
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

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
`);

const rows = db
  .prepare("SELECT id, key, seats, status FROM licenses ORDER BY rowid DESC")
  .all();
if (rows.length === 0) {
  console.log("لا توجد تراخيص بعد.");
} else {
  console.table(rows);
}
