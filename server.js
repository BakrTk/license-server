// server.js
import express from "express";
import Database from "better-sqlite3";
import dayjs from "dayjs";
import dotenv from "dotenv";
import nacl from "tweetnacl";
import fs from "fs";
import path from "path";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || "./data/licenses.db";
const PRIV_B64 = process.env.PRIVATE_KEY_B64;
const PUB_B64 = process.env.PUBLIC_KEY_B64;

if (!PRIV_B64 || !PUB_B64) {
  console.error(
    "⚠️ ضع PRIVATE_KEY_B64 و PUBLIC_KEY_B64 في .env (شغّل npm run gen:keys)."
  );
  process.exit(1);
}

// مفاتيح NaCl بصيغة Uint8Array
const sk = Uint8Array.from(Buffer.from(PRIV_B64, "base64")); // 64 bytes
const pk = Uint8Array.from(Buffer.from(PUB_B64, "base64")); // 32 bytes

// تجهيز DB
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

// أدوات base64url (مع دعم Node 20)
const hasBase64Url = (() => {
  try {
    return typeof Buffer.from("x").toString("base64url") === "string";
  } catch {
    return false;
  }
})();
const toB64Url = (buf) =>
  hasBase64Url
    ? Buffer.from(buf).toString("base64url")
    : Buffer.from(buf)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

// توقيع حمولة JSON وإرجاع token = b64url(payload).b64url(sig)
function jsonToken(payloadObj) {
  const payloadJson = JSON.stringify(payloadObj);
  const payloadBytes = Buffer.from(payloadJson, "utf8"); // Buffer يعمل كـ Uint8Array
  const sig = nacl.sign.detached(payloadBytes, sk);
  const p = toB64Url(payloadBytes);
  const s = toB64Url(sig);
  return `${p}.${s}`;
}

const app = express();
app.use(express.json());

// /activate — يُصدر توكن سنة من تاريخ الآن
app.post("/api/v1/activate", (req, res) => {
  try {
    const { license_key, hw, app: appName, ver, nonce } = req.body || {};
    if (!license_key || !hw || !appName) {
      return res.status(400).json({ error: "bad_request" });
    }
    // تحقق الترخيص
    const lic = db
      .prepare("SELECT * FROM licenses WHERE key=?")
      .get(license_key);
    if (!lic) return res.status(404).json({ error: "license_not_found" });
    if (lic.status !== "active")
      return res.status(403).json({ error: "license_blocked" });

    // المقاعد
    const countAssigned = db
      .prepare("SELECT COUNT(*) AS c FROM assignments WHERE license_id=?")
      .get(lic.id).c;
    const already = db
      .prepare("SELECT * FROM assignments WHERE license_id=? AND hw=?")
      .get(lic.id, hw);
    if (!already) {
      if (countAssigned >= lic.seats) {
        return res.status(409).json({ error: "no_seats_available" });
      }
      db.prepare(
        "INSERT INTO assignments(id, license_id, hw, activated_at) VALUES(?,?,?,?)"
      ).run(
        "as_" + Math.random().toString(36).slice(2),
        lic.id,
        hw,
        new Date().toISOString()
      );
    }

    const exp = dayjs().add(1, "year").toISOString(); // سنة كاملة
    const payload = {
      lk: lic.id,
      hw,
      app: appName,
      exp,
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

app.listen(PORT, () => {
  console.log("License server running on http://localhost:" + PORT);
  console.log("Public Key (Base64):", PUB_B64);
});
