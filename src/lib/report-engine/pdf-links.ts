// Internal-link annotations for the report TOC (pdf-lib low-level).
import { PDFArray, PDFName, PDFDocument, PDFPage } from "pdf-lib";

/**
 * Add a clickable rectangle on `page` that jumps to `targetPage`.
 * rect is { x, y, w, h } in pdf-lib coordinates (y from bottom).
 */
export function addPageLink(
  pdfDoc: PDFDocument,
  page: PDFPage,
  rect: { x: number; y: number; w: number; h: number },
  targetPage: PDFPage,
): void {
  const context = pdfDoc.context;
  const annot = context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [rect.x, rect.y, rect.x + rect.w, rect.y + rect.h],
    Border: [0, 0, 0],
    // Jump to the target page, preserving the viewer's zoom (XYZ with nulls).
    A: {
      Type: "Action",
      S: "GoTo",
      D: [targetPage.ref, "XYZ", null, null, null],
    },
  });
  const annotRef = context.register(annot);

  const annotsKey = PDFName.of("Annots");
  const existing = page.node.get(annotsKey);
  if (existing instanceof PDFArray) {
    existing.push(annotRef);
  } else {
    page.node.set(annotsKey, context.obj([annotRef]));
  }
}
