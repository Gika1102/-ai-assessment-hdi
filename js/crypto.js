const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

function base64ToUint8Array(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function uint8ArrayToBase64(value) {
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function deriveKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 200000,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptObject(value, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encoded = TEXT_ENCODER.encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    version: 1,
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(encrypted))
  };
}

export async function decryptObject(payload, passphrase) {
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Payload inválido.");
  }

  const { salt, iv, ciphertext } = parsed;
  if (!salt || !iv || !ciphertext) {
    throw new Error("Payload sem campos criptografados.");
  }

  const key = await deriveKey(passphrase, base64ToUint8Array(salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToUint8Array(iv) },
    key,
    base64ToUint8Array(ciphertext)
  );

  return JSON.parse(TEXT_DECODER.decode(decrypted));
}

export function normalizeEncryptedData(input) {
  if (!input) return null;

  try {
    const parsed = typeof input === "string" ? JSON.parse(input) : input;
    if (parsed && typeof parsed === "object" && parsed.ciphertext && parsed.iv && parsed.salt) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}
