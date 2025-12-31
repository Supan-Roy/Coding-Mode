const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DEFAULT_STEP_SECONDS = 30;
const DEFAULT_DIGITS = 6;

const normalizeSecret = (secret) => secret.replace(/\s+/g, "").toUpperCase();

const padCode = (value, digits = DEFAULT_DIGITS) => value.toString().padStart(digits, "0");

const base32ToBytes = (input) => {
  const clean = normalizeSecret(input);
  const bytes = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) {
      throw new Error("Invalid base32 character");
    }
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >>> bitsLeft) & 0xff);
    }
  }
  return new Uint8Array(bytes);
};

const bytesToBase32 = (bytes) => {
  let output = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      output += BASE32_ALPHABET[(buffer >>> bitsLeft) & 0x1f];
    }
  }
  if (bitsLeft > 0) {
    output += BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 0x1f];
  }
  return output;
};

export const generateSecret = (size = 20) => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase32(bytes);
};

const importKey = async (secretBase32) => {
  const keyData = base32ToBytes(secretBase32);
  return crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
};

const hotp = async (secretBase32, counter, digits = DEFAULT_DIGITS) => {
  const key = await importKey(secretBase32);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const high = Math.floor(counter / 0x100000000);
  view.setUint32(0, high);
  view.setUint32(4, counter & 0xffffffff);

  const digest = await crypto.subtle.sign("HMAC", key, buffer);
  const bytes = new Uint8Array(digest);
  const offset = bytes[bytes.length - 1] & 0x0f;
  const binCode = ((bytes[offset] & 0x7f) << 24) |
    ((bytes[offset + 1] & 0xff) << 16) |
    ((bytes[offset + 2] & 0xff) << 8) |
    (bytes[offset + 3] & 0xff);

  const mod = 10 ** digits;
  return padCode(binCode % mod, digits);
};

export const generateTotp = async (secretBase32, timestamp = Date.now(), stepSeconds = DEFAULT_STEP_SECONDS, digits = DEFAULT_DIGITS, window = 0) => {
  const counter = Math.floor(timestamp / 1000 / stepSeconds) + window;
  return hotp(secretBase32, counter, digits);
};

export const verifyTotp = async (secretBase32, code, { stepSeconds = DEFAULT_STEP_SECONDS, digits = DEFAULT_DIGITS, window = 1 } = {}) => {
  if (!code || typeof code !== "string") return false;
  const trimmed = code.trim();
  if (trimmed.length !== digits) return false;
  const normalizedSecret = normalizeSecret(secretBase32);
  const now = Date.now();
  const attempts = [];
  for (let i = -window; i <= window; i += 1) {
    attempts.push(generateTotp(normalizedSecret, now, stepSeconds, digits, i));
  }
  const results = await Promise.all(attempts);
  return results.includes(trimmed);
};

export const buildOtpauthUri = (secretBase32, label = "Coding Mode: Authentication Code", issuer = "Coding Mode") => {
  const encodedLabel = encodeURIComponent(label);
  const encodedIssuer = encodeURIComponent(issuer);
  const normalizedSecret = normalizeSecret(secretBase32);
  return `otpauth://totp/${encodedLabel}?secret=${normalizedSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${DEFAULT_DIGITS}&period=${DEFAULT_STEP_SECONDS}`;
};

export const sanitizeDomains = (domains = []) => {
  const cleaned = domains
    .map((item) => item.trim())
    .filter(Boolean)
    .map((entry) => {
      try {
        const url = entry.includes("://") ? new URL(entry) : new URL(`https://${entry}`);
        return url.hostname;
      } catch (e) {
        return entry;
      }
    })
    .filter(Boolean);

  return Array.from(new Set(cleaned));
};
