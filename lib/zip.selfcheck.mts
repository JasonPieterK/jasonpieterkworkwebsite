/**
 * Self-check for the ZIP writer: `node --experimental-strip-types lib/zip.selfcheck.mts`
 * Verifies header signatures, CRCs (against node's zlib.crc32) and that the
 * central directory offsets point at real local headers.
 */
import assert from "node:assert";
import { crc32 } from "node:zlib";
import { createZip } from "./zip.ts";

const enc = new TextEncoder();
const entries = [
  { name: "MATH/SEMESTER 1/notes.txt", data: enc.encode("hello world"), date: new Date("2026-03-04T10:20:30Z") },
  { name: "MATH/SEMESTER 1/empty.bin", data: new Uint8Array(0) },
  { name: "MATH/naïve — ünicode.md", data: enc.encode("# héllo") },
];

const zip = createZip(entries);
const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

// End-of-central-directory sits at the tail and counts every entry.
const eocd = zip.length - 22;
assert.equal(view.getUint32(eocd, true), 0x06054b50, "EOCD signature");
assert.equal(view.getUint16(eocd + 10, true), entries.length, "entry count");

const centralStart = view.getUint32(eocd + 16, true);
assert.equal(view.getUint32(eocd + 12, true), eocd - centralStart, "central directory size");

let cursor = centralStart;
for (const entry of entries) {
  assert.equal(view.getUint32(cursor, true), 0x02014b50, `central header for ${entry.name}`);
  const nameLen = view.getUint16(cursor + 28, true);
  const localOffset = view.getUint32(cursor + 42, true);

  assert.equal(view.getUint32(localOffset, true), 0x04034b50, `local header for ${entry.name}`);
  assert.equal(
    view.getUint32(localOffset + 14, true),
    entry.data.length ? crc32(entry.data) : 0,
    `crc for ${entry.name}`
  );
  assert.equal(view.getUint32(localOffset + 22, true), entry.data.length, `size for ${entry.name}`);

  const storedName = new TextDecoder().decode(zip.subarray(localOffset + 30, localOffset + 30 + nameLen));
  assert.equal(storedName, entry.name, "utf-8 name round-trip");

  // Payload follows the local header verbatim (stored, not deflated).
  const payload = zip.subarray(localOffset + 30 + nameLen, localOffset + 30 + nameLen + entry.data.length);
  assert.deepEqual(Buffer.from(payload), Buffer.from(entry.data), `payload for ${entry.name}`);

  cursor += 46 + nameLen;
}

console.log(`zip selfcheck ok — ${entries.length} entries, ${zip.length} bytes`);
