import type { LabelDocument, QRCodeElement, TextElement } from "./types";
import { inToPx } from "./types";

export type CheckStatus = "ok" | "warn" | "fail";
export interface ValidationCheck {
  label: string;
  status: CheckStatus;
  detail?: string;
}

const LOT_RX = /lot[:#\s]*\d{2,}/i;
const DATE_RX = /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}\b/;

export function getValidationChecks(doc: LabelDocument): ValidationCheck[] {
  const texts = doc.elements.filter((e) => e.type === "text") as TextElement[];
  const qrs = doc.elements.filter(
    (e) => e.type === "qrcode"
  ) as QRCodeElement[];

  const hasLot = texts.some((t) => LOT_RX.test(t.text));
  const hasMfg = texts.some(
    (t) =>
      (t.field === "mfgDate" || /mfg|manufact/i.test(t.text)) &&
      DATE_RX.test(t.text)
  );
  const hasExp = texts.some(
    (t) =>
      (t.field === "expDate" || /\bexp\b|expir|valid/i.test(t.text)) &&
      DATE_RX.test(t.text)
  );
  const qrWithoutLink = qrs.filter((q) => !q.value?.trim());
  const w = inToPx(doc.size.widthIn);
  const h = inToPx(doc.size.heightIn);
  const outOfBounds = doc.elements.filter(
    (e) =>
      e.x < 0 ||
      e.y < 0 ||
      e.x + e.width > w + 0.5 ||
      e.y + e.height > h + 0.5
  );
  const smallText = texts.filter((t) => t.fontSize < 7);

  return [
    {
      label: "LOT number present",
      status: hasLot ? "ok" : "warn",
      detail: hasLot
        ? undefined
        : 'Needs a text element like "LOT: 12" (label followed by ≥ 2 digits).',
    },
    {
      label: "Manufacture date present (MM/DD/YYYY)",
      status: hasMfg ? "ok" : "warn",
      detail: hasMfg ? undefined : 'Needs a text element like "MFG: 04/24/2026".',
    },
    {
      label: "Expiration date present (MM/DD/YYYY)",
      status: hasExp ? "ok" : "warn",
      detail: hasExp ? undefined : 'Needs a text element like "EXP: 04/24/2027".',
    },
    {
      label:
        qrs.length === 0
          ? "No QR Code on label"
          : qrWithoutLink.length === 0
            ? "All QR codes have valid content"
            : "Some QR codes are missing content",
      status:
        qrs.length === 0
          ? "warn"
          : qrWithoutLink.length === 0
            ? "ok"
            : "fail",
      detail:
        qrWithoutLink.length > 0
          ? `${qrWithoutLink.length} QR code(s) empty.`
          : undefined,
    },
    {
      label: "All text legible (≥ 7pt)",
      status: smallText.length === 0 ? "ok" : "warn",
      detail:
        smallText.length > 0
          ? `${smallText.length} text(s) with font smaller than 7pt.`
          : undefined,
    },
    {
      label: "Elements within label bounds",
      status: outOfBounds.length === 0 ? "ok" : "fail",
      detail:
        outOfBounds.length > 0
          ? `${outOfBounds.length} element(s) exceed the bounds.`
          : undefined,
    },
  ];
}
