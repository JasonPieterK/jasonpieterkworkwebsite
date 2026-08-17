import {
  FileDoc,
  FilePdf,
  FilePpt,
  FileXls,
  FileImage,
  FileCsv,
  FileTxt,
  FileZip,
  File as FileGeneric,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react/dist/lib/types";

const EXT_ICONS: Record<string, PhosphorIcon> = {
  doc: FileDoc,
  docx: FileDoc,
  pdf: FilePdf,
  ppt: FilePpt,
  pptx: FilePpt,
  xls: FileXls,
  xlsx: FileXls,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  csv: FileCsv,
  txt: FileTxt,
  md: FileTxt,
  zip: FileZip,
  rar: FileZip,
};

export function fileIconFor(name: string): PhosphorIcon {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_ICONS[ext] ?? FileGeneric;
}
