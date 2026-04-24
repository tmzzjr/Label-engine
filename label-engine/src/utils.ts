import type { LabelDocument, LabelElement, TextElement } from "./types";
import { inToPx } from "./types";

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function defaultDocument(): LabelDocument {
  return {
    id: uid(),
    name: "Untitled Label",
    size: { widthIn: 0.75, heightIn: 1.75, name: '0.75" × 1.75"' },
    background: "#ffffff",
    elements: [],
  };
}

export function sampleDocument(): LabelDocument {
  const doc = defaultDocument();
  const w = inToPx(doc.size.widthIn);
  const h = inToPx(doc.size.heightIn);
  doc.elements = [
    {
      id: uid(),
      type: "text",
      x: 12,
      y: 14,
      width: w - 24,
      height: 38,
      rotation: 0,
      opacity: 1,
      text: "PRODUCT NAME",
      fontFamily: "Inter",
      fontSize: 22,
      fill: "#111827",
      bold: true,
      italic: false,
      underline: false,
      align: "center",
      lineHeight: 1.1,
      field: "productName",
    } as TextElement,
    {
      id: uid(),
      type: "text",
      x: 12,
      y: 60,
      width: w - 24,
      height: 20,
      rotation: 0,
      opacity: 1,
      text: "SKU: ——",
      fontFamily: "Inter",
      fontSize: 12,
      fill: "#374151",
      bold: false,
      italic: false,
      underline: false,
      align: "left",
      lineHeight: 1.1,
      field: "sku",
    } as TextElement,
    {
      id: uid(),
      type: "text",
      x: 12,
      y: 84,
      width: w - 24,
      height: 20,
      rotation: 0,
      opacity: 1,
      text: "LOT: ——",
      fontFamily: "Inter",
      fontSize: 12,
      fill: "#374151",
      bold: false,
      italic: false,
      underline: false,
      align: "left",
      lineHeight: 1.1,
      field: "lot",
    } as TextElement,
    {
      id: uid(),
      type: "text",
      x: 12,
      y: h - 60,
      width: w - 24,
      height: 18,
      rotation: 0,
      opacity: 1,
      text: "MFG: ——",
      fontFamily: "Inter",
      fontSize: 10,
      fill: "#4b5563",
      bold: false,
      italic: false,
      underline: false,
      align: "left",
      lineHeight: 1.1,
      field: "mfgDate",
    } as TextElement,
    {
      id: uid(),
      type: "text",
      x: 12,
      y: h - 40,
      width: w - 24,
      height: 18,
      rotation: 0,
      opacity: 1,
      text: "EXP: ——",
      fontFamily: "Inter",
      fontSize: 10,
      fill: "#4b5563",
      bold: false,
      italic: false,
      underline: false,
      align: "left",
      lineHeight: 1.1,
      field: "expDate",
    } as TextElement,
  ];
  return doc;
}

export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

export function withinBounds(el: LabelElement, w: number, h: number): boolean {
  return (
    el.x >= 0 &&
    el.y >= 0 &&
    el.x + el.width <= w + 0.5 &&
    el.y + el.height <= h + 0.5
  );
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export const COMMON_FONTS = [
  "Inter",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Palatino",
  "Garamond",
  "Impact",
  "Comic Sans MS",
  "system-ui",
];
