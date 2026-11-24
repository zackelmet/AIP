export type ImageMime = "image/png" | "image/jpeg" | "image/webp";

export type ReportMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

export function detectImageMime(buffer: Buffer): ImageMime | null {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function detectReportMime(buffer: Buffer): ReportMime | null {
  if (buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}

export function imageExtension(mime: ImageMime): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function reportExtension(mime: ReportMime): string {
  return mime === "application/pdf" ? "pdf" : "docx";
}
