import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { GITHUB_CACHE_TAG } from "@/lib/github";

// ponytail: in-memory throttle resets on redeploy/cold-start — fine as a soft
// guard against a spammed button, not a security boundary.
let lastManualRevalidate = 0;
const MIN_MANUAL_INTERVAL_MS = 60_000;

function isValidGithubSignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expected = `sha256=${hmac.digest("hex")}`;
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = req.headers.get("x-hub-signature-256");
  const body = await req.text();

  if (signature && secret) {
    if (!isValidGithubSignature(body, signature, secret)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else {
    const now = Date.now();
    if (now - lastManualRevalidate < MIN_MANUAL_INTERVAL_MS) {
      return NextResponse.json({ revalidated: false, throttled: true });
    }
    lastManualRevalidate = now;
  }

  // Both layers, or the page regenerates from a cached GitHub response.
  // 'max' is the stale-while-revalidate profile Next recommends: the next
  // request gets fresh data without anyone waiting on a cold render.
  revalidateTag(GITHUB_CACHE_TAG, "max");
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
