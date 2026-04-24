import { useMemo } from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import { useStore } from "../store";
import type { TextElement } from "../types";
import { inToPx } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmExport: () => void;
  previewDataUrl: string | null;
}

type Status = "ok" | "warn" | "fail";

interface Check {
  label: string;
  status: Status;
  detail?: string;
}

export default function PreviewModal({
  open,
  onClose,
  onConfirmExport,
  previewDataUrl,
}: Props) {
  const { doc } = useStore();

  const checks = useMemo<Check[]>(() => {
    if (!doc) return [];
    const texts = doc.elements.filter(
      (e) => e.type === "text"
    ) as TextElement[];
    const hasLot =
      texts.some(
        (t) => t.field === "lot" || /lot/i.test(t.text) || /lote/i.test(t.text)
      ) && !texts.every((t) => /^lot:\s*(——|$)/i.test(t.text));
    const hasMfg =
      texts.some(
        (t) =>
          t.field === "mfgDate" ||
          /mfg/i.test(t.text) ||
          /manufact/i.test(t.text)
      ) && !texts.every((t) => /^mfg:\s*(——|$)/i.test(t.text));
    const hasExp =
      texts.some(
        (t) => t.field === "expDate" || /exp/i.test(t.text) || /valid/i.test(t.text)
      ) && !texts.every((t) => /^exp:\s*(——|$)/i.test(t.text));
    const qrs = doc.elements.filter((e) => e.type === "qrcode");
    const qrWithoutLink = qrs.filter((q: any) => !q.value || !q.value.trim());

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
          : "Add a text element with LOT or map the 'LOT number' field.",
      },
      {
        label: "Manufacture date present",
        status: hasMfg ? "ok" : "warn",
      },
      {
        label: "Expiration date present",
        status: hasExp ? "ok" : "warn",
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
  }, [doc]);

  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Preview & Validate"
      size="xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Back to Edit
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onClose();
              onConfirmExport();
            }}
            disabled={failCount > 0}
            title={
              failCount > 0
                ? "Fix errors before exporting"
                : "Proceed to export"
            }
          >
            Confirm & Export
          </button>
        </>
      }
    >
      <div className="grid md:grid-cols-[1fr_280px] gap-6">
        <div className="flex items-center justify-center bg-bg rounded-lg p-4 min-h-[320px]">
          {previewDataUrl ? (
            <img
              src={previewDataUrl}
              alt="Preview"
              className="max-w-full max-h-[60vh] shadow-2xl bg-white"
              style={{
                aspectRatio: doc
                  ? `${doc.size.widthIn} / ${doc.size.heightIn}`
                  : undefined,
              }}
            />
          ) : (
            <div className="text-muted text-sm">Generating preview…</div>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-fg mb-2">
            Validation checklist
          </h4>
          <ul className="space-y-2">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-fg">
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${
                    c.status === "ok"
                      ? "bg-success/20 text-success"
                      : c.status === "warn"
                        ? "bg-warning/20 text-warning"
                        : "bg-danger/20 text-danger"
                  }`}
                >
                  {c.status === "ok" ? (
                    <Check size={12} />
                  ) : c.status === "warn" ? (
                    <AlertTriangle size={12} />
                  ) : (
                    <X size={12} />
                  )}
                </span>
                <div>
                  <div>{c.label}</div>
                  {c.detail && (
                    <div className="text-xs text-muted">{c.detail}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {doc && (
            <div className="mt-6 card p-3 text-xs text-muted space-y-1">
              <div>
                <span className="font-semibold text-fg">Size:</span>{" "}
                {doc.size.widthIn}" × {doc.size.heightIn}"
              </div>
              <div>
                <span className="font-semibold text-fg">Elements:</span>{" "}
                {doc.elements.length}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
