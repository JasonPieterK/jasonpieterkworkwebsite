import { supabase } from "./supabase";

export type Passcode = { id: string; code: string; label: string; createdAt: string };

// ponytail: classroom unlock codes, not account credentials — stored in plain
// text on purpose so an admin can read them back to give out again.
export async function listPasscodes(): Promise<Passcode[]> {
  const { data, error } = await supabase
    .from("passcodes")
    .select("id, code, label, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, code: r.code, label: r.label ?? "", createdAt: r.created_at }));
}

export async function addPasscode(code: string, label: string): Promise<Passcode[]> {
  await supabase.from("passcodes").insert({ code, label });
  return listPasscodes();
}

export async function removePasscode(id: string): Promise<Passcode[]> {
  await supabase.from("passcodes").delete().eq("id", id);
  return listPasscodes();
}

export async function verifyPasscode(code: string): Promise<boolean> {
  const { count } = await supabase
    .from("passcodes")
    .select("id", { count: "exact", head: true })
    .eq("code", code);
  return Boolean(count && count > 0);
}
