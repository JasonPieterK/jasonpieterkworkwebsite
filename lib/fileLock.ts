import { getDeviceInfo, getSessionId } from "./deviceInfo";

const LOCKED_FILES_CACHE = new Map<string, boolean>();

export async function checkIfFileLocked(filePath: string): Promise<boolean> {
  if (LOCKED_FILES_CACHE.has(filePath)) {
    return LOCKED_FILES_CACHE.get(filePath)!;
  }

  try {
    const res = await fetch(`/api/file-lock?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) return false;
    const data = await res.json();
    LOCKED_FILES_CACHE.set(filePath, data.isLocked);
    return data.isLocked;
  } catch {
    return false;
  }
}

export async function verifyFilePassword(
  filePath: string,
  password: string
): Promise<boolean> {
  try {
    const { device, browser, os, deviceModel } = getDeviceInfo();
    const res = await fetch("/api/admin/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: filePath,
        password,
        device,
        browser,
        os,
        deviceModel,
        sessionId: getSessionId(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
