// Renders the first page of a PDF file to a PNG dataURL using pdfjs-dist.
// The worker is loaded via Vite's ?url import, so it's bundled and served
// as a static asset.
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore — Vite handles ?url imports
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

export async function pdfFirstPageToDataURL(
  file: File,
  targetPx = 1200
): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.max(1, targetPx / Math.max(baseViewport.width, baseViewport.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL("image/png");
}

export function isPDF(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    file.type === "application/postscript" ||
    name.endsWith(".pdf") ||
    name.endsWith(".ai")
  );
}
