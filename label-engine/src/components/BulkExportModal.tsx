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

function QRMiniConfirm({
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
      width: 96,
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
      className={`flex items-start gap-2 rounded border p-2 ${
        empty
          ? "border-danger/60 bg-danger/5"
          : scanned
            ? "border-success/60 bg-success/5"
            : "border-border bg-surface2/40"
      }`}
    >
      <div className="w-12 h-12 flex-shrink-0 bg-white rounded border border-border flex items-center justify-center">
        {empty ? (
          <span className="text-[9px] text-danger text-center leading-tight px-0.5">
            No link
          </span>
        ) : img ? (
          <img src={img} className="w-full h-full" alt="QR" />
        ) : (
          <QrIcon size={18} className="text-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-xs">
        <div className="font-semibold text-muted uppercase tracking-wide">
          {fieldLabel}
        </div>
        <div className="text-fg break-all line-clamp-2">
          {empty ? (
            <span className="text-danger">— empty —</span>
          ) : (
            qr.value
          )}
        </div>
        <label
          className={`mt-1 flex items-center gap-1.5 cursor-pointer ${
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
          I scanned this QR
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
}: {
  label: SavedLabel;
  preview: string | undefined;
  scanned: Record<string, boolean>;
  setScanned: (next: Record<string, boolean>) => void;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
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

  return (
    <div
      className={`card p-3 space-y-3 ${
        confirmed ? "border-success/60 bg-success/5" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-28 h-20 flex-shrink-0 bg-white rounded border border-border flex items-center justify-center overflow-hidden">
          {preview ? (
            <img
              src={preview}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Loader2 size={18} className="animate-spin text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{label.name}</div>
          <div className="text-xs text-muted">
            {label.doc.size.widthIn}″ × {label.doc.size.heightIn}″ ·{" "}
            {label.doc.elements.length} elements
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
          Validation
        </div>
        <ul className="space-y-1">
          {checks.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-fg">
              <span
                className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full ${
                  c.status === "ok"
                    ? "bg-success/20 text-success"
                    : c.status === "warn"
                      ? "bg-warning/20 text-warning"
                      : "bg-danger/20 text-danger"
                }`}
              >
                {c.status === "ok" ? (
                  <Check size={10} />
                ) : c.status === "warn" ? (
                  <AlertTriangle size={10} />
                ) : (
                  <X size={10} />
                )}
              </span>
              <div>
                <div>{c.label}</div>
                {c.detail && (
                  <div className="text-[11px] text-muted">{c.detail}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {qrs.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            QR Codes ({Object.values(scanned).filter(Boolean).length}/
            {qrsWithContent.length})
          </div>
          <div className="grid grid-cols-1 gap-2">
            {qrs.map((q) => (
              <QRMiniConfirm
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
        className={`flex items-center gap-2 text-sm pt-1 border-t border-border ${
          canConfirm ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
        }`}
        title={blockedReason}
      >
        <input
          type="checkbox"
          className="accent-accent"
          checked={confirmed}
          disabled={!canConfirm}
          onChange={() => setConfirmed(!confirmed)}
        />
        <span className={confirmed ? "text-success font-medium" : ""}>
          {confirmed ? (
            <span className="inline-flex items-center gap-1">
              <Check size={14} /> Confirmed
            </span>
          ) : (
            "I reviewed and confirm this label"
          )}
        </span>
      </label>
    </div>
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
          dpi: 200,
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
          dpi: 600,
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
      size="xl"
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
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {selectedIds.map((id) => {
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
                />
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
