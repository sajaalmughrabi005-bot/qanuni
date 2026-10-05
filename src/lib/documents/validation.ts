import "server-only";
import { inflateRawSync, crc32 } from "node:zlib";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const formats: Record<string, string[]> = {
  pdf: ["application/pdf"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  txt: ["text/plain"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"], webp: ["image/webp"],
};
export function validateFileMetadata(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!formats[ext] || (file.type && !formats[ext].includes(file.type.toLowerCase()))) throw new Error("unsupported_type");
  if (file.size > MAX_FILE_BYTES) throw new Error("too_large");
  if (!file.size) throw new Error("empty");
  return { ext, mime: formats[ext][0], name: file.name.slice(0, 255), size: file.size };
}
export function validateFileBytes(buffer: Buffer, ext: string) {
  const hex = buffer.subarray(0, 12).toString("hex");
  if (ext === "pdf" && (!buffer.subarray(0, 8).toString("ascii").startsWith("%PDF-") || !buffer.subarray(-2048).includes(Buffer.from("%%EOF")))) throw new Error("extraction_failed");
  if ((ext === "jpg" || ext === "jpeg") && (!hex.startsWith("ffd8ff") || buffer.length < 32 || buffer[buffer.length - 2] !== 255 || buffer[buffer.length - 1] !== 217)) throw new Error("extraction_failed");
  if (ext === "png" && (!hex.startsWith("89504e470d0a1a0a") || buffer.length < 45 || !buffer.subarray(-12).includes(Buffer.from("IEND")))) throw new Error("extraction_failed");
  if (ext === "webp" && (buffer.length < 20 || buffer.subarray(0, 4).toString() !== "RIFF" || buffer.subarray(8, 12).toString() !== "WEBP" || buffer.readUInt32LE(4) + 8 !== buffer.length)) throw new Error("extraction_failed");
  if (ext === "txt") {
    if (buffer.includes(0)) throw new Error("extraction_failed");
    try { new TextDecoder("utf-8", { fatal: true }).decode(buffer); } catch { throw new Error("extraction_failed"); }
  }
  if (ext === "docx") validateDocxArchive(buffer);
}
// Inspect the central directory before decompression; compressed upload size
// alone cannot bound zip bombs. ZIP64/encrypted archives are not accepted.
function validateDocxArchive(buffer: Buffer) {
  if (buffer.readUInt32LE(0) !== 0x04034b50) throw new Error("extraction_failed");
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("extraction_failed");
  const entries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16), expanded = 0, hasDocument = false;
  if (!entries || entries > 2048 || buffer.readUInt16LE(eocd + 4) || buffer.readUInt16LE(eocd + 6)) throw new Error("extraction_failed");
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > eocd || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("extraction_failed");
    const flags = buffer.readUInt16LE(offset + 8), compressed = buffer.readUInt32LE(offset + 20), size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28), extraLength = buffer.readUInt16LE(offset + 30), commentLength = buffer.readUInt16LE(offset + 32);
    if (flags & 1 || size === 0xffffffff || compressed === 0xffffffff || size > 20 * 1024 * 1024 || (size > 1024 * 1024 && size > Math.max(1, compressed) * 200)) throw new Error("too_large");
    expanded += size;
    if (expanded > 30 * 1024 * 1024) throw new Error("too_large");
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    const method=buffer.readUInt16LE(offset+10),local=buffer.readUInt32LE(offset+42);
    if(local+30>offset||buffer.readUInt32LE(local)!==0x04034b50||![0,8].includes(method)||buffer.readUInt16LE(local+8)!==method)throw new Error("extraction_failed");
    const localNameLength=buffer.readUInt16LE(local+26),localExtraLength=buffer.readUInt16LE(local+28),start=local+30+localNameLength+localExtraLength;
    if(start+compressed>offset||buffer.subarray(local+30,local+30+localNameLength).toString("utf8")!==name||name.split("/").includes("..")||name.includes("\\"))throw new Error("extraction_failed");
    const content=buffer.subarray(start,start+compressed);
    let decoded:Buffer;
    try{decoded=method===0?content:inflateRawSync(content,{maxOutputLength:Math.max(1,size)});}catch{throw new Error("extraction_failed");}
    if(decoded.length!==size||crc32(decoded)!==buffer.readUInt32LE(offset+16))throw new Error("extraction_failed");
    if (name === "word/document.xml") hasDocument = true;
    offset += 46 + nameLength + extraLength + commentLength;
    if (offset > eocd) throw new Error("extraction_failed");
  }
  if (!hasDocument) throw new Error("unsupported_type");
}
