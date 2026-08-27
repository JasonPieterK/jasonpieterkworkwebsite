import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "file-flags.json");

export type FileFlags = { hidden?: boolean; locked?: boolean };
export type FileFlagsMap = Record<string, FileFlags>;

export async function readFileFlags(): Promise<FileFlagsMap> {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function writeFileFlags(data: FileFlagsMap): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function setFlag(filePath: string, key: keyof FileFlags, value: boolean): Promise<FileFlagsMap> {
  const flags = await readFileFlags();
  const current = flags[filePath] ?? {};
  const next = { ...current, [key]: value };
  // Drop the entry entirely once nothing is set, so the file stays clean.
  if (!next.hidden && !next.locked) {
    delete flags[filePath];
  } else {
    flags[filePath] = next;
  }
  await writeFileFlags(flags);
  return flags;
}
