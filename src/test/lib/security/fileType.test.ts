import {
  detectImageMime,
  detectReportMime,
  imageExtension,
  reportExtension,
} from "@/lib/security/fileType";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const webp = Buffer.from("RIFFxxxxWEBP", "ascii");
const pdf = Buffer.from("%PDF-1.7\n", "ascii");
const docx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

describe("file type detection", () => {
  it("detects supported image magic bytes", () => {
    expect(detectImageMime(png)).toBe("image/png");
    expect(detectImageMime(jpeg)).toBe("image/jpeg");
    expect(detectImageMime(webp)).toBe("image/webp");
    expect(detectImageMime(Buffer.from("<svg/>"))).toBeNull();
    expect(imageExtension("image/jpeg")).toBe("jpg");
  });

  it("detects PDF and DOCX report magic bytes", () => {
    expect(detectReportMime(pdf)).toBe("application/pdf");
    expect(detectReportMime(docx)).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(detectReportMime(Buffer.from("not a report"))).toBeNull();
    expect(reportExtension("application/pdf")).toBe("pdf");
  });
});
