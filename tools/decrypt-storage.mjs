import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

function base64ToUint8Array(value) {
  return Uint8Array.from(Buffer.from(value, 'base64'));
}

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 200000,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['decrypt']
  );
}

async function decryptObject(payload, passphrase) {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const key = await deriveKey(passphrase, base64ToUint8Array(parsed.salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToUint8Array(parsed.iv) },
    key,
    base64ToUint8Array(parsed.ciphertext)
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function readPassphrase(argument) {
  if (argument && String(argument).trim()) return String(argument).trim();
  if (process.env.ASSESSMENT_PASSPHRASE && String(process.env.ASSESSMENT_PASSPHRASE).trim()) {
    return String(process.env.ASSESSMENT_PASSPHRASE).trim();
  }
  if (process.env.KYNRDRYL_ASSESSMENT_PASSPHRASE && String(process.env.KYNRDRYL_ASSESSMENT_PASSPHRASE).trim()) {
    return String(process.env.KYNRDRYL_ASSESSMENT_PASSPHRASE).trim();
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const value = await rl.question('Digite a frase secreta para descriptografar: ');
  rl.close();
  return value.trim();
}

async function main() {
  const [, , fileArg, passphraseArg] = process.argv;

  if (!fileArg) {
    console.log('Uso: ASSESSMENT_PASSPHRASE="minha-chave" node tools/decrypt-storage.mjs ./tmp/encrypted-data.json');
    console.log('Ou: node tools/decrypt-storage.mjs ./tmp/encrypted-data.json "minha-chave"');
    process.exit(1);
  }

  const resolved = path.resolve(fileArg);
  const raw = fs.readFileSync(resolved, 'utf8');
  const data = JSON.parse(raw);
  const passphrase = await readPassphrase(passphraseArg);

  if (!passphrase) {
    console.error('Frase secreta vazia.');
    process.exit(1);
  }

  const decrypted = await decryptObject(data, passphrase);
  console.log(JSON.stringify(decrypted, null, 2));
}

main().catch((error) => {
  console.error('Erro ao descriptografar:', error.message);
  process.exit(1);
});
