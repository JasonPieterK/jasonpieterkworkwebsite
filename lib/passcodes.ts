import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "passcodes.json");

export type Passcode = { id: string; code: string; label: string; createdAt: string };

// ponytail: classroom unlock codes, not account credentials — stored in plain
// text on purpose so an admin can read them back to give out again.
async function readPasscodes(): Promise<Passcode[]> {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data).codes ?? [];
  } catch {
    return [];
  }
}

async function writePasscodes(codes: Passcode[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify({ codes }, null, 2));
}

export async function listPasscodes(): Promise<Passcode[]> {
  return readPasscodes();
}

export async function addPasscode(code: string, label: string): Promise<Passcode[]> {
  const codes = await readPasscodes();
  codes.push({ id: crypto.randomUUID(), code, label, createdAt: new Date().toISOString() });
  await writePasscodes(codes);
  return codes;
}

export async function removePasscode(id: string): Promise<Passcode[]> {
  const codes = (await readPasscodes()).filter((c) => c.id !== id);
  await writePasscodes(codes);
  return codes;
}

export async function verifyPasscode(code: string): Promise<boolean> {
  const codes = await readPasscodes();
  return codes.some((c) => c.code === code);
}
