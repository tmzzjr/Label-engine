// Export helpers: PNG/JPG/SVG/PDF with DPI, CMYK emulation, crop marks, N-up layouts.
import jsPDF from "jspdf";
import QRCode from "qrcode";
import Konva from "konva";
import type { LabelDocument, LabelElement, TextElement } from "./types";
import { inToPx } from "./types";

export type ExportFormat = "png" | "jpg" | "svg" | "pdf";
export type ColorMode = "rgb" | "cmyk";

export interface ExportOptions {
  format: ExportFormat;
  colorMode: ColorMode;
  dpi: number;
  jpgQuality: number; // 0..1
  cropMarks: boolean;
  perPage: number; // 1, 2, 4, 6, 8
  pageWidthIn: number; // for PDF
  pageHeightIn: number;
  pageMarginIn: number;
  filename: string;
}

// Clamp a hex color into a "CMYK-printable" gamut — simple approximation:
// CMYK can't reproduce very bright/saturated RGB, so we desaturate/darken slightly.
export function cmykApprox(hex: string): string {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  let r = (int >> 16) & 0xff;
  let g = (int >> 8) & 0xff;
  let b = int & 0xff;
  // Convert RGB -> CMYK -> RGB (simple, no ICC)
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  const c = k < 1 ? (1 - rn - k) / (1 - k) : 0;
  const mg = k < 1 ? (1 - gn - k) / (1 - k) : 0;
  const y = k < 1 ? (1 - bn - k) / (1 - k) : 0;
  r = Math.round(255 * (1 - c) * (1 - k));
  g = Math.round(255 * (1 - mg) * (1 - k));
  b = Math.round(255 * (1 - y) * (1 - k));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Render the document to a hidden Konva stage at the requested DPI and return dataURL.
export async function renderRaster(
  doc: LabelDocument,
  opts: { dpi: number; mimeType: "image/png" | "image/jpeg"; quality?: number; colorMode: ColorMode }
): Promise<string> {
  const widthPx = Math.round(doc.size.widthIn * opts.dpi);
  const heightPx = Math.round(doc.size.heightIn * opts.dpi);
  const refPx = 300; // design coords are 300 DPI
  const scale = opts.dpi / refPx;

  // Create hidden container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${widthPx}px`;
  container.style.height = `${heightPx}px`;
  document.body.appendChild(container);

  try {
    const stage = new Konva.Stage({
      container,
      width: widthPx,
      height: heightPx,
    });
    const layer = new Konva.Layer();
    stage.add(layer);

    // background
    layer.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width: widthPx,
        height: heightPx,
        fill:
          opts.colorMode === "cmyk"
            ? cmykApprox(doc.background || "#ffffff")
            : doc.background || "#ffffff",
      })
    );

    // background image
    if (doc.backgroundImage) {
      const img = await loadImg(doc.backgroundImage);
      layer.add(
        new Konva.Image({
          image: img,
          x: 0,
          y: 0,
          width: widthPx,
          height: heightPx,
        })
      );
    }

    for (const el of doc.elements) {
      if (el.visible === false) continue;
      await addElementToLayer(layer, el, scale, opts.colorMode);
    }

    layer.draw();
    const dataUrl = stage.toDataURL({
      pixelRatio: 1,
      mimeType: opts.mimeType,
      quality: opts.quality ?? 0.92,
    });
    stage.destroy();
    return dataUrl;
  } finally {
    container.remove();
  }
}

async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

function applyMode(color: string, mode: ColorMode): string {
  return mode === "cmyk" ? cmykApprox(color) : color;
}

async function addElementToLayer(
  layer: Konva.Layer,
  el: LabelElement,
  scale: number,
  mode: ColorMode
) {
  const base = {
    x: el.x * scale,
    y: el.y * scale,
    width: el.width * scale,
    height: el.height * scale,
    rotation: el.rotation,
    opacity: el.opacity,
  };

  if (el.type === "text") {
    const t = el as TextElement;
    const fontStyle =
      [t.italic ? "italic" : "", t.bold ? "bold" : ""]
        .filter(Boolean)
        .join(" ") || "normal";
    layer.add(
      new Konva.Text({
        ...base,
        text: t.text,
        fontFamily: t.fontFamily,
        fontSize: t.fontSize * scale,
        fontStyle,
        textDecoration: t.underline ? "underline" : "",
        fill: applyMode(t.fill, mode),
        align: t.align,
        lineHeight: t.lineHeight,
        letterSpacing: (t.letterSpacing ?? 0) * scale,
        wrap: "word",
      })
    );
    return;
  }

  if (el.type === "image") {
    const img = await loadImg(el.src);
    layer.add(new Konva.Image({ ...base, image: img }));
    return;
  }

  if (el.type === "qrcode") {
    const url = await QRCode.toDataURL(el.value || " ", {
      errorCorrectionLevel: el.errorLevel,
      margin: 0,
      width: 1024,
      color: { dark: applyMode(el.fg, mode), light: el.bg },
    });
    const img = await loadImg(url);
    const side = Math.min(base.width, base.height);
    layer.add(
      new Konva.Image({ ...base, image: img, width: side, height: side })
    );
    return;
  }

  if (el.type === "rect") {
    layer.add(
      new Konva.Rect({
        ...base,
        fill: applyMode(el.fill, mode),
        stroke: applyMode(el.stroke, mode),
        strokeWidth: el.strokeWidth * scale,
        cornerRadius: el.cornerRadius * scale,
      })
    );
    return;
  }

  if (el.type === "circle") {
    layer.add(
      new Konva.Ellipse({
        x: base.x + base.width / 2,
        y: base.y + base.height / 2,
        radiusX: base.width / 2,
        radiusY: base.height / 2,
        rotation: base.rotation,
        opacity: base.opacity,
        fill: applyMode(el.fill, mode),
        stroke: applyMode(el.stroke, mode),
        strokeWidth: el.strokeWidth * scale,
      })
    );
    return;
  }

  if (el.type === "line") {
    layer.add(
      new Konva.Line({
        x: base.x,
        y: base.y,
        points: [0, base.height / 2, base.width, base.height / 2],
        stroke: applyMode(el.stroke, mode),
        strokeWidth: el.strokeWidth * scale,
        rotation: base.rotation,
        opacity: base.opacity,
      })
    );
    return;
  }
}

// Produce an SVG string representation of the label.
export async function renderSVG(
  doc: LabelDocument,
  mode: ColorMode
): Promise<string> {
  const w = inToPx(doc.size.widthIn);
  const h = inToPx(doc.size.heightIn);
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.size.widthIn}in" height="${doc.size.heightIn}in" viewBox="0 0 ${w} ${h}">`
  );
  parts.push(
    `<rect x="0" y="0" width="${w}" height="${h}" fill="${applyMode(
      doc.background || "#ffffff",
      mode
    )}"/>`
  );
  if (doc.backgroundImage) {
    parts.push(
      `<image href="${doc.backgroundImage}" x="0" y="0" width="${w}" height="${h}"/>`
    );
  }
  for (const el of doc.elements) {
    if (el.visible === false) continue;
    const transform = `rotate(${el.rotation} ${el.x + el.width / 2} ${
      el.y + el.height / 2
    })`;
    const opacity = el.opacity;
    if (el.type === "text") {
      const t = el as TextElement;
      const textAnchor =
        t.align === "center" ? "middle" : t.align === "right" ? "end" : "start";
      const xAnchor =
        t.align === "center"
          ? t.x + t.width / 2
          : t.align === "right"
            ? t.x + t.width
            : t.x;
      const fontWeight = t.bold ? 700 : 400;
      const fontStyle = t.italic ? "italic" : "normal";
      const decoration = t.underline ? "underline" : "none";
      // naive wrapping: split by newlines only
      const lines = t.text.split("\n");
      parts.push(
        `<text x="${xAnchor}" y="${t.y + t.fontSize}" font-family="${esc(
          t.fontFamily
        )}" font-size="${t.fontSize}" fill="${applyMode(
          t.fill,
          mode
        )}" font-weight="${fontWeight}" font-style="${fontStyle}" text-decoration="${decoration}" text-anchor="${textAnchor}" letter-spacing="${t.letterSpacing ?? 0}" opacity="${opacity}" transform="${transform}">`
      );
      lines.forEach((ln, i) => {
        parts.push(
          `<tspan x="${xAnchor}" dy="${i === 0 ? 0 : t.fontSize * t.lineHeight}">${esc(ln)}</tspan>`
        );
      });
      parts.push(`</text>`);
      continue;
    }
    if (el.type === "rect") {
      parts.push(
        `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${
          el.height
        }" rx="${el.cornerRadius}" ry="${el.cornerRadius}" fill="${applyMode(
          el.fill,
          mode
        )}" stroke="${applyMode(el.stroke, mode)}" stroke-width="${
          el.strokeWidth
        }" opacity="${opacity}" transform="${transform}"/>`
      );
      continue;
    }
    if (el.type === "circle") {
      parts.push(
        `<ellipse cx="${el.x + el.width / 2}" cy="${
          el.y + el.height / 2
        }" rx="${el.width / 2}" ry="${el.height / 2}" fill="${applyMode(
          el.fill,
          mode
        )}" stroke="${applyMode(el.stroke, mode)}" stroke-width="${
          el.strokeWidth
        }" opacity="${opacity}" transform="${transform}"/>`
      );
      continue;
    }
    if (el.type === "line") {
      parts.push(
        `<line x1="${el.x}" y1="${el.y + el.height / 2}" x2="${
          el.x + el.width
        }" y2="${el.y + el.height / 2}" stroke="${applyMode(
          el.stroke,
          mode
        )}" stroke-width="${el.strokeWidth}" opacity="${opacity}" transform="${transform}"/>`
      );
      continue;
    }
    if (el.type === "image") {
      parts.push(
        `<image href="${el.src}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" opacity="${opacity}" transform="${transform}"/>`
      );
      continue;
    }
    if (el.type === "qrcode") {
      // Embed QR as raster data URL inside the SVG.
      const url = await QRCode.toDataURL(el.value || " ", {
        errorCorrectionLevel: el.errorLevel,
        margin: 0,
        width: 1024,
        color: { dark: applyMode(el.fg, mode), light: el.bg },
      });
      const side = Math.min(el.width, el.height);
      parts.push(
        `<image href="${url}" x="${el.x}" y="${el.y}" width="${side}" height="${side}" opacity="${opacity}" transform="${transform}"/>`
      );
    }
  }
  parts.push(`</svg>`);
  return parts.join("");
}

function drawCropMarks(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  lenIn = 0.1
) {
  // x,y,w,h in inches (PDF unit is inch)
  const gap = 0.02;
  const lw = 0.004;
  pdf.setLineWidth(lw);
  pdf.setDrawColor(0, 0, 0);
  // 4 corners, L-shaped
  // top-left
  pdf.line(x - gap - lenIn, y, x - gap, y);
  pdf.line(x, y - gap - lenIn, x, y - gap);
  // top-right
  pdf.line(x + w + gap, y, x + w + gap + lenIn, y);
  pdf.line(x + w, y - gap - lenIn, x + w, y - gap);
  // bottom-left
  pdf.line(x - gap - lenIn, y + h, x - gap, y + h);
  pdf.line(x, y + h + gap, x, y + h + gap + lenIn);
  // bottom-right
  pdf.line(x + w + gap, y + h, x + w + gap + lenIn, y + h);
  pdf.line(x + w, y + h + gap, x + w, y + h + gap + lenIn);
}

export async function doExport(
  doc: LabelDocument,
  opts: ExportOptions
): Promise<void> {
  const downloadBlob = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${opts.filename || doc.name || "label"}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const downloadDataUrl = (dataUrl: string, ext: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${opts.filename || doc.name || "label"}.${ext}`;
    a.click();
  };

  if (opts.format === "svg") {
    const svg = await renderSVG(doc, opts.colorMode);
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "svg");
    return;
  }

  if (opts.format === "png") {
    const url = await renderRaster(doc, {
      dpi: opts.dpi,
      mimeType: "image/png",
      colorMode: opts.colorMode,
    });
    downloadDataUrl(url, "png");
    return;
  }

  if (opts.format === "jpg") {
    const url = await renderRaster(doc, {
      dpi: opts.dpi,
      mimeType: "image/jpeg",
      quality: opts.jpgQuality,
      colorMode: opts.colorMode,
    });
    downloadDataUrl(url, "jpg");
    return;
  }

  if (opts.format === "pdf") {
    // Use inches as PDF unit; multi-up grid.
    const pageW = opts.pageWidthIn;
    const pageH = opts.pageHeightIn;
    const orient = pageW > pageH ? "l" : "p";
    const pdf = new jsPDF({
      orientation: orient,
      unit: "in",
      format: [pageW, pageH],
    });

    const labelW = doc.size.widthIn;
    const labelH = doc.size.heightIn;
    const margin = opts.pageMarginIn;
    const gutter = 0.1;

    const perRow = Math.max(
      1,
      Math.floor((pageW - 2 * margin + gutter) / (labelW + gutter))
    );
    const perCol = Math.max(
      1,
      Math.floor((pageH - 2 * margin + gutter) / (labelH + gutter))
    );
    const perPageMax = perRow * perCol;
    const perPage = Math.min(opts.perPage || 1, perPageMax);

    // Render one raster snapshot of the label at print DPI and reuse it.
    const rasterUrl = await renderRaster(doc, {
      dpi: opts.dpi,
      mimeType: "image/png",
      colorMode: opts.colorMode,
    });

    // Place perPage copies on one page (you can extend to multi-page batches).
    for (let i = 0; i < perPage; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = margin + col * (labelW + gutter);
      const y = margin + row * (labelH + gutter);
      pdf.addImage(
        rasterUrl,
        "PNG",
        x,
        y,
        labelW,
        labelH,
        undefined,
        "FAST"
      );
      if (opts.cropMarks) drawCropMarks(pdf, x, y, labelW, labelH);
    }

    pdf.save(`${opts.filename || doc.name || "label"}.pdf`);
  }
}
