import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Check,
  X,
  AlertTriangle,
  QrCode as QrIcon,
} from "lucide-react";
import QRCode from "qrcode";
import Modal from "./Modal";
import { useStore } from "../store";
import { doExport, renderRaster, type ExportFormat } from "../exporter";
import { getValidationChecks } from "../validation";
import type { QRCodeElement, SavedLabel } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = "select" | "confirm";

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
    if (!qr.value?.trim()) {
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
        empty
          ? "border-danger/60"
          : scanned
            ? "border-success/60"
            : ""
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
          <QrIcon size={28} className="text-muted" />
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

function LabelConfirmCard({
  label,
  preview,
  scanned,
  setScanned,
  confirmed,
  setConfirmed,
  index,
  total,
}: {
  label: SavedLabel;
  preview: string | undefined;
  scanned: Record<string, boolean>;
  setScanned: (next: Record<string, boolean>) => void;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  index: number;
  total: number;
}) {
  const checks = useMemo(
    () => getValidationChecks(label.doc),
    [label.doc]
  );
  const qrs = useMemo(
    () =>
      (label.doc.elements.filter(
        (e) => e.type === "qrcode"
      ) as QRCodeElement[]) ?? [],
    [label.doc.elements]
  );
  const qrsWithContent = qrs.filter((q) => q.value?.trim());
  const failCount = checks.filter((c) => c.status === "fail").length;
  const allQrsScanned =
    qrsWithContent.length === 0 ||
    qrsWithContent.every((q) => scanned[q.id]);
  const canConfirm = failCount === 0 && allQrsScanned;
  const blockedReason = !canConfirm
    ? failCount > 0
      ? "Fix errors before confirming"
      : `Scan all ${qrsWithContent.length} QR code(s) first`
    : "Confirm this label";

  const aspectRatio = `${label.doc.size.widthIn} / ${label.doc.size.heightIn}`;

  return (
    <section
      className={`rounded-xl border bg-surface transition ${
        confirmed
          ? "border-success/60 ring-1 ring-success/30"
          : "border-border"
      }`}
    >
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface2/60 rounded-t-xl">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold text-muted">
            {index + 1} / {total}
          </span>
          <div className="min-w-0">
            <div className="text-base font-semibold text-fg truncate">
              {label.name}
            </div>
            <div className="text-xs text-muted">
              {label.doc.size.widthIn}″ × {label.doc.size.heightIn}″ ·{" "}
              {label.doc.elements.length} elements
            </div>
          </div>
        </div>
        <div
          className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded ${
            confirmed
              ? "bg-success/20 text-success"
              : canConfirm
                ? "bg-warning/20 text-warning"
                : "bg-danger/20 text-danger"
          }`}
        >
          {confirmed
            ? "Confirmed"
            : canConfirm
              ? "Awaiting confirm"
              : "Action needed"}
        </div>
      </header>

      <div className="p-5">
        <div className="grid md:grid-cols-[1fr_320px] gap-6">
          <div className="relative flex items-center justify-center bg-bg rounded-lg p-4 min-h-[240px]">
            {preview ? (
              <img
                src={preview}
                alt={`Preview of ${label.name}`}
                className="max-w-full max-h-[40vh] shadow-2xl bg-white"
                style={{ aspectRatio }}
              />
            ) : (
              <div className="flex items-center gap-2 text-muted text-sm">
                <Loader2 size={16} className="animate-spin" /> Generating
                preview…
              </div>
            )}
          </div>
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
        </div>

        {qrs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-fg flex items-center gap-2">
                <QrIcon size={16} />
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
              Scan each QR code with your phone and verify it opens the
              correct link.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {qrs.map((q) => (
                <QRConfirmCard
                  key={q.id}
                  qr={q}
                  scanned={!!scanned[q.id]}
                  onToggle={() =>
                    setScanned({ ...scanned, [q.id]: !scanned[q.id] })
                  }
                />
              ))}
            </div>
          </div>
        )}

        <label
          className={`mt-6 flex items-center justify-between gap-3 px-4 py-3 rounded-lg border ${
            confirmed
              ? "border-success/60 bg-success/10"
              : canConfirm
                ? "border-border bg-surface2 cursor-pointer hover:bg-surface2/80"
                : "border-border bg-surface2/40 opacity-60 cursor-not-allowed"
          }`}
          title={blockedReason}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="accent-accent w-4 h-4"
              checked={confirmed}
              disabled={!canConfirm}
              onChange={() => setConfirmed(!confirmed)}
            />
            <span className={confirmed ? "text-success" : "text-fg"}>
              {confirmed
                ? "Confirmed — ready to export"
                : "I reviewed and confirm this label"}
            </span>
          </span>
          {confirmed && <Check size={18} className="text-success" />}
        </label>
      </div>
    </section>
  );
}

export default function BulkExportModal({ open, onClose }: Props) {
  const { currentTemplate } = useStore();
  const labels = currentTemplate?.labels ?? [];

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [scanned, setScanned] = useState<Record<string, Record<string, boolean>>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("select");
    setSelectedIds(labels.map((l) => l.id));
    setConfirmed({});
    setScanned({});
    setPreviews({});
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (phase !== "confirm") return;
    selectedIds.forEach(async (id) => {
      if (previews[id]) return;
      const lbl = labels.find((l) => l.id === id);
      if (!lbl) return;
      try {
        const url = await renderRaster(lbl.doc, {
          dpi: 300,
          mimeType: "image/png",
          colorMode: "rgb",
        });
        setPreviews((p) => ({ ...p, [id]: url }));
      } catch {
        /* ignore */
      }
    });
  }, [phase, selectedIds, labels, previews]);

  const allLabelsSelected =
    labels.length > 0 && selectedIds.length === labels.length;
  const allConfirmed =
    selectedIds.length > 0 && selectedIds.every((id) => confirmed[id]);

  const toggleLabel = (id: string) =>
    setSelectedIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  const toggleAll = () =>
    setSelectedIds(allLabelsSelected ? [] : labels.map((l) => l.id));

  const handleExportAll = async () => {
    if (!allConfirmed) return;
    setBusy(true);
    try {
      for (const id of selectedIds) {
        const lbl = labels.find((l) => l.id === id);
        if (!lbl) continue;
        await doExport(lbl.doc, {
          format,
          colorMode: "rgb",
          dpi: 1200,
          jpgQuality: 0.95,
          filename: lbl.name || lbl.doc.name || "label",
        });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        phase === "select"
          ? "Bulk Export — Select Labels"
          : "Confirm Each Label Before Export"
      }
      size="2xl"
      footer={
        phase === "select" ? (
          <>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn h-9 px-4 bg-success text-white hover:bg-emerald-600"
              onClick={() => setPhase("confirm")}
              disabled={selectedIds.length === 0}
            >
              Continue ({selectedIds.length})
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-secondary"
              onClick={() => setPhase("select")}
              disabled={busy}
            >
              Back
            </button>
            <button
              className="btn h-9 px-4 bg-success text-white hover:bg-emerald-600"
              onClick={handleExportAll}
              disabled={!allConfirmed || busy}
              title={
                allConfirmed
                  ? "Download all selected labels"
                  : "Confirm every label first"
              }
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Download All ({selectedIds.length})
            </button>
          </>
        )
      }
    >
      {phase === "select" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              Pick which labels to include in this bulk export.
            </p>
            <button className="btn-secondary text-xs" onClick={toggleAll}>
              {allLabelsSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
          <ul className="space-y-1 max-h-[55vh] overflow-y-auto">
            {labels.map((l) => {
              const checked = selectedIds.includes(l.id);
              return (
                <li
                  key={l.id}
                  className={`flex items-center gap-3 rounded px-3 py-2 cursor-pointer transition ${
                    checked
                      ? "bg-accent-soft border border-accent/40"
                      : "hover:bg-surface2 border border-transparent"
                  }`}
                  onClick={() => toggleLabel(l.id)}
                >
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={checked}
                    onChange={() => toggleLabel(l.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {l.thumbnail ? (
                    <img
                      src={l.thumbnail}
                      className="h-10 w-auto rounded border border-border bg-white"
                      alt=""
                    />
                  ) : (
                    <div className="h-10 w-14 rounded border border-border bg-surface2" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{l.name}</div>
                    <div className="text-xs text-muted">
                      {l.doc.size.widthIn}″ × {l.doc.size.heightIn}″ ·{" "}
                      {l.doc.elements.length} elements
                    </div>
                  </div>
                </li>
              );
            })}
            {labels.length === 0 && (
              <li className="text-sm text-muted text-center py-6">
                No labels in this template.
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted flex-1 min-w-[240px]">
              Review the validation checklist for each label and scan every QR.
              Confirm each one, then click Download All to save them as
              separate files.
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted">Format</label>
              <select
                className="input h-8 w-24"
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
              >
                <option value="pdf">PDF</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="svg">SVG</option>
              </select>
            </div>
          </div>
          <div className="space-y-5">
            {selectedIds.map((id, i) => {
              const l = labels.find((x) => x.id === id);
              if (!l) return null;
              return (
                <LabelConfirmCard
                  key={id}
                  label={l}
                  preview={previews[id]}
                  scanned={scanned[id] ?? {}}
                  setScanned={(next) =>
                    setScanned((s) => ({ ...s, [id]: next }))
                  }
                  confirmed={!!confirmed[id]}
                  setConfirmed={(v) =>
                    setConfirmed((c) => ({ ...c, [id]: v }))
                  }
                  index={i}
                  total={selectedIds.length}
                />
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
