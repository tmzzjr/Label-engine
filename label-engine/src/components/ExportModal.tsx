import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";
import { useStore } from "../store";
import { doExport, type ExportOptions } from "../exporter";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ExportModal({ open, onClose }: Props) {
  const { doc } = useStore();

  const [format, setFormat] = useState<ExportOptions["format"]>("pdf");
  const [colorMode, setColorMode] = useState<ExportOptions["colorMode"]>("rgb");
  const [dpi, setDpi] = useState(300);
  const [jpgQuality, setJpgQuality] = useState(0.92);
  const [filename, setFilename] = useState(doc?.name || "label");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isRaster = format === "png" || format === "jpg";
  const isPdf = format === "pdf";

  const handleExport = async () => {
    if (!doc) return;
    setBusy(true);
    setErr(null);
    try {
      await doExport(doc, {
        format,
        colorMode,
        dpi,
        jpgQuality,
        filename,
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleExport} disabled={busy}>
            {busy && <Loader2 className="animate-spin" size={16} />}
            Export
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="field-label">Format</label>
          <div className="grid grid-cols-4 gap-2">
            {(["pdf", "png", "jpg", "svg"] as const).map((f) => (
              <button
                key={f}
                className={
                  format === f
                    ? "btn-primary uppercase tracking-wide"
                    : "btn-secondary uppercase tracking-wide"
                }
                onClick={() => setFormat(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-1">
            {format === "pdf" &&
              "PDF sized exactly to the label dimensions."}
            {format === "png" && "High-resolution raster with alpha channel."}
            {format === "jpg" && "Raster with adjustable compression."}
            {format === "svg" &&
              "Vector SVG (editable in Illustrator/Inkscape)."}
          </p>
        </div>

        <div>
          <label className="field-label">Color mode</label>
          <div className="flex gap-2">
            <button
              className={colorMode === "rgb" ? "btn-primary" : "btn-secondary"}
              onClick={() => setColorMode("rgb")}
            >
              RGB (screen)
            </button>
            <button
              className={colorMode === "cmyk" ? "btn-primary" : "btn-secondary"}
              onClick={() => setColorMode("cmyk")}
            >
              CMYK (print)
            </button>
          </div>
          {colorMode === "cmyk" && (
            <p className="text-xs text-warning mt-1">
              ⚠ CMYK is approximated mathematically (no ICC profile). For
              professional offset printing, convert in Illustrator with a
              proper profile.
            </p>
          )}
        </div>

        {(isRaster || isPdf) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Resolution (DPI)</label>
              <select
                className="input"
                value={dpi}
                onChange={(e) => setDpi(parseInt(e.target.value))}
              >
                <option value={150}>150 DPI — draft</option>
                <option value={300}>300 DPI — standard print</option>
                <option value={600}>600 DPI — high quality</option>
                <option value={1200}>1200 DPI — maximum</option>
              </select>
            </div>
            {format === "jpg" && (
              <div>
                <label className="field-label">
                  JPG quality: {Math.round(jpgQuality * 100)}%
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={jpgQuality}
                  onChange={(e) => setJpgQuality(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}

        {isPdf && doc && (
          <p className="text-xs text-muted">
            Page size: {doc.size.widthIn}″ × {doc.size.heightIn}″ (matches the
            label).
          </p>
        )}

        <div>
          <label className="field-label">File name</label>
          <input
            className="input"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
        </div>

        {err && (
          <div className="rounded-md bg-danger/10 border border-danger/40 p-3 text-sm text-danger">
            {err}
          </div>
        )}
      </div>
    </Modal>
  );
}
