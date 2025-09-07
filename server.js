// server.js
import express from "express";
import Database from "better-sqlite3";
import dayjs from "dayjs";
import dotenv from "dotenv";
import nacl from "tweetnacl";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "data", "licenses.db");
const PRIV_B64 = process.env.PRIVATE_KEY_B64;
const PUB_B64 = process.env.PUBLIC_KEY_B64;

if (!PRIV_B64 || !PUB_B64) {
  console.error("❌ ضع PRIVATE_KEY_B64 و PUBLIC_KEY_B64 في متغيرات البيئة.");
  process.exit(1);
}

// تأكد وجود مجلد قاعدة البيانات
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// فتح القاعدة
const db = new Database(DB_PATH);

// إنشاء الجداول إن لم توجد
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

// مفاتيح NaCl
const sk = Uint8Array.from(Buffer.from(PRIV_B64, "base64")); // 64 bytes
const pk = Uint8Array.from(Buffer.from(PUB_B64, "base64")); // 32 bytes

// base64url helper
const toB64Url = (buf) =>
  Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

// يوقّع حمولة JSON
function jsonToken(payloadObj) {
  const payloadBytes = Buffer.from(JSON.stringify(payloadObj), "utf8");
  const sig = nacl.sign.detached(payloadBytes, sk);
  return `${toB64Url(payloadBytes)}.${toB64Url(sig)}`;
}

const app = express();
app.use(express.json());

// صحّة السيرفر
app.get("/healthz", (_, res) => res.json({ ok: true }));

// نقطة التفعيل
app.post("/api/v1/activate", (req, res) => {
  try {
    const { license_key, hw, app: appName, ver } = req.body || {};
    if (!license_key || !hw || !appName)
      return res.status(400).json({ error: "bad_request" });

    const lic = db
      .prepare("SELECT * FROM licenses WHERE key=?")
      .get(license_key);
    if (!lic) return res.status(404).json({ error: "license_not_found" });
    if (lic.status !== "active")
      return res.status(403).json({ error: "license_blocked" });

    const assignedCount = db
      .prepare("SELECT COUNT(*) AS c FROM assignments WHERE license_id=?")
      .get(lic.id).c;
    const existing = db
      .prepare("SELECT 1 FROM assignments WHERE license_id=? AND hw=?")
      .get(lic.id, hw);

    if (!existing) {
      if (assignedCount >= lic.seats)
        return res.status(409).json({ error: "no_seats_available" });
      db.prepare(
        "INSERT INTO assignments(id, license_id, hw, activated_at) VALUES(?,?,?,?)"
      ).run(
        "as_" + Math.random().toString(36).slice(2),
        lic.id,
        hw,
        new Date().toISOString()
      );
    }

    const payload = {
      lk: lic.id,
      hw,
      app: appName,
      exp: dayjs().add(1, "year").toISOString(),
      features: [],
      ver: ver || "0.0.0",
    };
    const token = jsonToken(payload);
    return res.json({ token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error" });
  }
});

// ابدأ السيرفر (مهم: 0.0.0.0 لـ Render)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ License server listening on 0.0.0.0:${PORT}`);
  console.log("Public Key (Base64):", PUB_B64);
});
