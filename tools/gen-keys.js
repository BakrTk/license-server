// tools/gen-keys.js
import nacl from "tweetnacl";
const kp = nacl.sign.keyPair();
console.log("PUBLIC_KEY_B64 =", Buffer.from(kp.publicKey).toString("base64"));
console.log("PRIVATE_KEY_B64=", Buffer.from(kp.secretKey).toString("base64"));
