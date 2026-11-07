import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const HOMEWORK_FILE_LIMIT = 5;
export const HOMEWORK_FILE_SIZE = 10 * 1024 * 1024;
export const HOMEWORK_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export function uploadDirectory() {
  return process.env.UPLOAD_DIR || "/tmp/schitalka-uploads";
}

export function assertUploadStorageConfigured() {
  if (process.env.NODE_ENV === "production" && !process.env.UPLOAD_DIR) {
    throw new Error("Постоянное хранилище файлов не настроено");
  }
}

export function homeworkFilePath(storageName: string) {
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/.test(storageName)) throw new Error("Invalid storage name");
  return path.join(uploadDirectory(), storageName);
}

export async function saveHomeworkFile(storageName: string, bytes: Uint8Array) {
  assertUploadStorageConfigured();
  await mkdir(uploadDirectory(), { recursive: true });
  await writeFile(homeworkFilePath(storageName), bytes, { flag: "wx" });
}

export async function readHomeworkFile(storageName: string) {
  return readFile(homeworkFilePath(storageName));
}

export async function removeHomeworkFile(storageName: string) {
  try {
    await unlink(homeworkFilePath(storageName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function hasValidFileSignature(contentType: string, bytes: Uint8Array) {
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (contentType === "image/webp") return Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP";
  if (contentType === "application/pdf") return Buffer.from(bytes.subarray(0, 5)).toString() === "%PDF-";
  return false;
}
