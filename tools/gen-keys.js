// tools/gen-keys.js
import nacl from "tweetnacl";

const kp = nacl.sign.keyPair();
const PUB_B64 = Buffer.from(kp.publicKey).toString("base64"); // 32 بايت
const PRIV_B64 = Buffer.from(kp.secretKey).toString("base64"); // 64 بايت

console.log("PUBLIC_KEY_B64 =", PUB_B64);
console.log("PRIVATE_KEY_B64 =", PRIV_B64);
console.log("\nضيفهم في متغيرات البيئة على Render قبل النشر.");
