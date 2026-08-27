import { supabase } from "./supabase";

export async function incrementDownload(key: string): Promise<void> {
  await supabase.rpc("increment_download", { p_key: key });
}

export async function readDownloadCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("download_counts").select("key, count");
  if (error || !data) return {};
  const map: Record<string, number> = {};
  for (const row of data) map[row.key] = row.count;
  return map;
}
