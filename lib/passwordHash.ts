import crypto from "crypto";

const SALT_SIZE = 16;
const ITERATIONS = 100000;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_SIZE).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256")
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const computed = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256")
    .toString("hex");
  return computed === storedHash;
}
