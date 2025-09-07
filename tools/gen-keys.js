// tools/gen-keys.js
import nacl from "tweetnacl";

const kp = nacl.sign.keyPair();

// نطبع Base64 قياسي (ليس URL-safe) — انسخه لـ .env و لـ Rust
const PUBLIC_KEY_B64 = Buffer.from(kp.publicKey).toString("base64");
const PRIVATE_KEY_B64 = Buffer.from(kp.secretKey).toString("base64");

console.log("PUBLIC_KEY_B64 =", PUBLIC_KEY_B64);
console.log("PRIVATE_KEY_B64=", PRIVATE_KEY_B64);
console.log(
  "\nضع هذي القيم في ملف .env (PRIVATE_KEY_B64 & PUBLIC_KEY_B64). " +
    "وانسخ PUBLIC_KEY_B64 نفسه إلى الثابت SERVER_PUBLIC_KEY_B64 داخل src/license.rs."
);
