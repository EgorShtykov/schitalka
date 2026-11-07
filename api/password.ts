import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1 } as const;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return ["scrypt", SCRYPT_OPTIONS.N, SCRYPT_OPTIONS.r, SCRYPT_OPTIONS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  try {
    const [algorithm, n, r, p, saltValue, keyValue] = stored.split("$");
    if (algorithm !== "scrypt" || !saltValue || !keyValue) return false;
    const options = { N: Number(n), r: Number(r), p: Number(p) };
    if (options.N !== SCRYPT_OPTIONS.N || options.r !== SCRYPT_OPTIONS.r || options.p !== SCRYPT_OPTIONS.p) return false;
    const expected = Buffer.from(keyValue, "base64");
    const actual = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, Buffer.from(saltValue, "base64"), expected.length, options, (error, key) => {
        if (error) reject(error);
        else resolve(key);
      });
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function normalizeLogin(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}
