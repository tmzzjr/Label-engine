import { useEffect, useMemo, useState } from "react";
import { Check, X, AlertTriangle, QrCode, ZoomIn } from "lucide-react";
import QRCode from "qrcode";
import Modal from "./Modal";
import { useStore } from "../store";
import type { QRCodeElement } from "../types";
import { getValidationChecks } from "../validation";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmExport: () => void;
  previewDataUrl: string | null;
}

function QRConfirmCard({
  qr,
  scanned,
  onToggle,
}: {
  qr: QRCodeElement;
  scanned: boolean;
  onToggle: () => void;
}) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!qr.value) {
      setImg(null);
      return;
    }
    QRCode.toDataURL(qr.value, {
      errorCorrectionLevel: qr.errorLevel,
      margin: 1,
      width: 180,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((u) => {
        if (!cancelled) setImg(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [qr.value, qr.errorLevel]);

  const empty = !qr.value?.trim();
  const fieldLabel =
    qr.field === "qrLink"
      ? "Product QR"
      : qr.field === "inventoryQr"
        ? "Inventory QR"
        : "QR Code";

  return (
    <div
      className={`card p-3 flex gap-3 ${
        empty ? "border-danger/60" : scanned ? "border-success/60" : ""
      }`}
    >
      <div className="w-24 h-24 flex-shrink-0 bg-white rounded flex items-center justify-center border border-border">
        {empty ? (
          <div className="text-center text-danger text-xs leading-tight p-1">
            No link
            <br />
            assigned
          </div>
        ) : img ? (
          <img src={img} className="w-full h-full" alt="QR" />
        ) : (
          <QrCode size={28} className="text-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="text-xs font-semibold text-muted uppercase tracking-wide">
          {fieldLabel}
        </div>
        <div className="text-sm text-fg break-all mt-0.5 line-clamp-2">
          {empty ? (
            <span className="text-danger">— empty —</span>
          ) : (
            <a
              href={qr.value}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent underline decoration-dotted"
            >
              {qr.value}
            </a>
          )}
        </div>
        <label
          className={`mt-auto pt-2 flex items-center gap-2 text-sm cursor-pointer ${
            empty ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <input
            type="checkbox"
            className="accent-accent"
            checked={scanned}
            disabled={empty}
            onChange={onToggle}
          />
          I scanned this QR code and it works
        </label>
      </div>
    </div>
  );
}

export default function PreviewModal({
  open,
  onClose,
  onConfirmExport,
  previewDataUrl,
}: Props) {
  const { doc } = useStore();
  const [scanned, setScanned] = useState<Record<string, boolean>>({});
  const [zoomed, setZoomed] = useState(false);

  // Reset confirmations each time modal reopens
  useEffect(() => {
    if (open) {
      setScanned({});
      setZoomed(false);
    }
  }, [open]);

  // Esc closes zoom when active
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setZoomed(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [zoomed]);

  const qrs = useMemo(
    () =>
      (doc?.elements.filter((e) => e.type === "qrcode") ??
        []) as QRCodeElement[],
    [doc]
  );
  const qrsWithContent = qrs.filter((q) => q.value?.trim());

  const checks = useMemo(
    () => (doc ? getValidationChecks(doc) : []),
    [doc]
  );

  const failCount = checks.filter((c) => c.status === "fail").length;
  const allQrsScanned =
    qrsWithContent.length === 0 ||
    qrsWithContent.every((q) => scanned[q.id]);
  const canExport = failCount === 0 && allQrsScanned;

  const disabledReason = !canExport
    ? failCount > 0
      ? "Fix errors before exporting"
      : `Please confirm you scanned ${qrsWithContent.length} QR code${
          qrsWithContent.length === 1 ? "" : "s"
        } before exporting`
    : "Proceed to export";

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
            disabled={!canExport}
            title={disabledReason}
          >
            Confirm &amp; Export
          </button>
        </>
      }
    >
      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="relative flex items-center justify-center bg-bg rounded-lg p-4 min-h-[240px]">
          {previewDataUrl ? (
            <>
              <button
                type="button"
                className="group relative block"
                onClick={() => setZoomed(true)}
                title="Click to zoom"
              >
                <img
                  src={previewDataUrl}
                  alt="Preview"
                  className="max-w-full max-h-[50vh] shadow-2xl bg-white cursor-zoom-in"
                  style={{
                    aspectRatio: doc
                      ? `${doc.size.widthIn} / ${doc.size.heightIn}`
                      : undefined,
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/30">
                  <span className="flex items-center gap-2 bg-black/70 text-white text-sm px-3 py-1.5 rounded-full">
                    <ZoomIn size={16} /> Zoom
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="absolute top-6 right-6 icon-btn bg-black/70 text-white hover:bg-black"
                onClick={() => setZoomed(true)}
                title="Zoom preview"
              >
                <ZoomIn size={16} />
              </button>
            </>
          ) : (
            <div className="text-muted text-sm">Generating preview…</div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-fg mb-2">
              Validation checklist
            </h4>
            <ul className="space-y-2">
              {checks.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-fg"
                >
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
          </div>

          {doc && (
            <div className="card p-3 text-xs text-muted space-y-1">
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

      {/* Fullscreen zoom lightbox */}
      {zoomed && previewDataUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-6 cursor-zoom-out"
          onClick={() => setZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 icon-btn bg-black/70 text-white hover:bg-black"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(false);
            }}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
          <img
            src={previewDataUrl}
            alt="Preview (zoomed)"
            className="shadow-2xl bg-white"
            style={{
              width: "95vw",
              height: "90vh",
              objectFit: "contain",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* QR scan confirmation */}
      {qrs.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-fg flex items-center gap-2">
              <QrCode size={16} />
              Scan &amp; Confirm QR Codes
            </h4>
            <span
              className={`text-xs ${
                allQrsScanned ? "text-success" : "text-warning"
              }`}
            >
              {qrsWithContent.length === 0
                ? "No active QR codes"
                : `${
                    Object.values(scanned).filter(Boolean).length
                  } / ${qrsWithContent.length} confirmed`}
            </span>
          </div>
          <p className="text-xs text-muted mb-3">
            Scan each QR code with your phone and verify it opens the correct
            link. You must confirm all active QR codes before exporting.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {qrs.map((q) => (
              <QRConfirmCard
                key={q.id}
                qr={q}
                scanned={!!scanned[q.id]}
                onToggle={() =>
                  setScanned((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                }
              />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
