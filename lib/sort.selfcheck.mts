/** `node --experimental-strip-types lib/sort.selfcheck.mts` */
import assert from "node:assert";
import { sortFiles } from "./sort.ts";
import type { FileEntry } from "./types.ts";

const file = (name: string, date: string, size: number): FileEntry => ({
  path: `root/${name}`,
  name,
  downloadUrl: "",
  htmlUrl: "",
  lastCommitDate: date,
  lastCommitMessage: "",
  size,
  badge: null,
});

const files = [
  file("CATATAN BAB 10.docx", "2026-08-12T10:00:00Z", 900),
  file("CATATAN BAB 2.docx", "2026-08-13T10:00:00Z", 5_400_000),
  file("UJI PEMAHAMAN.docx", "2026-08-01T10:00:00Z", 32_000),
];

const names = (key: Parameters<typeof sortFiles>[1]) => sortFiles(files, key).map((f) => f.name);

assert.deepEqual(names("newest"), ["CATATAN BAB 2.docx", "CATATAN BAB 10.docx", "UJI PEMAHAMAN.docx"]);
assert.deepEqual(names("oldest"), ["UJI PEMAHAMAN.docx", "CATATAN BAB 10.docx", "CATATAN BAB 2.docx"]);
// numeric collation: BAB 2 before BAB 10, not lexicographic "10" < "2"
assert.deepEqual(names("name"), ["CATATAN BAB 2.docx", "CATATAN BAB 10.docx", "UJI PEMAHAMAN.docx"]);
assert.deepEqual(names("nameDesc"), ["UJI PEMAHAMAN.docx", "CATATAN BAB 10.docx", "CATATAN BAB 2.docx"]);
assert.deepEqual(names("largest"), ["CATATAN BAB 2.docx", "UJI PEMAHAMAN.docx", "CATATAN BAB 10.docx"]);

// sortFiles must not mutate its input — the caller's array is React state.
const original = files.map((f) => f.name);
sortFiles(files, "nameDesc");
assert.deepEqual(files.map((f) => f.name), original, "input array untouched");

console.log("sort selfcheck ok");
