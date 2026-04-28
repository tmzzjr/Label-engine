import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import Modal from "./Modal";
import { useStore } from "../store";
import { doExport, renderRaster, type ExportFormat } from "../exporter";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = "select" | "confirm";

export default function BulkExportModal({ open, onClose }: Props) {
  const { currentTemplate } = useStore();
  const labels = currentTemplate?.labels ?? [];

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("select");
    setSelectedIds(labels.map((l) => l.id));
    setConfirmed({});
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
          dpi: 150,
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
  const confirmAll = () =>
    setConfirmed(
      Object.fromEntries(selectedIds.map((id) => [id, true]))
    );

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
          dpi: 300,
          jpgQuality: 0.92,
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
          : "Confirm Each Label"
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
              Review every label, then click Download All to save them as
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
              <button className="btn-secondary text-xs" onClick={confirmAll}>
                Confirm all
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
            {selectedIds.map((id) => {
              const l = labels.find((x) => x.id === id);
              if (!l) return null;
              const ok = !!confirmed[id];
              return (
                <div
                  key={id}
                  className={`card p-3 flex gap-3 transition ${
                    ok ? "border-success/60 bg-success/5" : ""
                  }`}
                >
                  <div className="w-24 h-24 flex-shrink-0 bg-white rounded border border-border flex items-center justify-center overflow-hidden">
                    {previews[id] ? (
                      <img
                        src={previews[id]}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Loader2
                        size={20}
                        className="animate-spin text-muted"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="text-sm font-semibold truncate">
                      {l.name}
                    </div>
                    <div className="text-xs text-muted">
                      {l.doc.size.widthIn}″ × {l.doc.size.heightIn}″ ·{" "}
                      {l.doc.elements.length} elements
                    </div>
                    <label className="mt-auto pt-2 flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-accent"
                        checked={ok}
                        onChange={() =>
                          setConfirmed((c) => ({ ...c, [id]: !c[id] }))
                        }
                      />
                      <span
                        className={ok ? "text-success" : ""}
                      >
                        {ok ? (
                          <span className="inline-flex items-center gap-1">
                            <Check size={14} /> Confirmed
                          </span>
                        ) : (
                          "I reviewed this label"
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
