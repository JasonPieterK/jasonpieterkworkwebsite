import { supabase } from "./supabase";

export type FileFlags = { hidden?: boolean; locked?: boolean };
export type FileFlagsMap = Record<string, FileFlags>;

export async function readFileFlags(): Promise<FileFlagsMap> {
  const { data, error } = await supabase.from("file_flags").select("path, hidden, locked");
  if (error || !data) return {};

  const map: FileFlagsMap = {};
  for (const row of data) {
    map[row.path] = { hidden: row.hidden, locked: row.locked };
  }
  return map;
}

export async function setFlag(filePath: string, key: keyof FileFlags, value: boolean): Promise<FileFlagsMap> {
  const flags = await readFileFlags();
  const current = flags[filePath] ?? {};
  const next = { ...current, [key]: value };

  if (!next.hidden && !next.locked) {
    await supabase.from("file_flags").delete().eq("path", filePath);
    delete flags[filePath];
  } else {
    await supabase
      .from("file_flags")
      .upsert({ path: filePath, hidden: Boolean(next.hidden), locked: Boolean(next.locked) });
    flags[filePath] = next;
  }
  return flags;
}
