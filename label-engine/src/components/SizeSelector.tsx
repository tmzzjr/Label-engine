import { useState } from "react";
import Modal from "./Modal";
import { STANDARD_SIZES, inToPx, type LabelSize } from "../types";
import { useStore } from "../store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SizeSelector({ open, onClose }: Props) {
  const { doc, setSize } = useStore();
  const currentSize = doc?.size ?? STANDARD_SIZES[0];

  const [mode, setMode] = useState<"preset" | "custom">(
    STANDARD_SIZES.some(
      (s) => s.widthIn === currentSize.widthIn && s.heightIn === currentSize.heightIn
    )
      ? "preset"
      : "custom"
  );
  const [customW, setCustomW] = useState(currentSize.widthIn);
  const [customH, setCustomH] = useState(currentSize.heightIn);

  const selectPreset = (s: LabelSize) => {
    setSize(s);
    onClose();
  };
  const applyCustom = () => {
    if (customW <= 0 || customH <= 0) return;
    setSize({
      widthIn: customW,
      heightIn: customH,
      name: `${customW}" × ${customH}"`,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Label Size">
      <div className="flex gap-2 mb-4">
        <button
          className={mode === "preset" ? "btn-primary" : "btn-secondary"}
          onClick={() => setMode("preset")}
        >
          Standard sizes
        </button>
        <button
          className={mode === "custom" ? "btn-primary" : "btn-secondary"}
          onClick={() => setMode("custom")}
        >
          Custom size
        </button>
      </div>

      {mode === "preset" ? (
        <div className="grid grid-cols-2 gap-3">
          {STANDARD_SIZES.map((s, i) => {
            const current =
              s.widthIn === currentSize.widthIn &&
              s.heightIn === currentSize.heightIn;
            return (
              <button
                key={i}
                onClick={() => selectPreset(s)}
                className={`card p-4 text-left hover:border-accent ${
                  current ? "ring-2 ring-accent" : ""
                }`}
              >
                <div className="text-sm font-semibold text-fg">{s.name}</div>
                <div className="text-xs text-muted mt-1">
                  {inToPx(s.widthIn)}×{inToPx(s.heightIn)} px @ 300 DPI
                </div>
                <div
                  className="mt-3 mx-auto border border-border bg-white"
                  style={{
                    width: s.widthIn * 48,
                    height: s.heightIn * 48,
                  }}
                />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Width (inches)</label>
            <input
              type="number"
              step={0.125}
              min={0.25}
              max={20}
              className="input"
              value={customW}
              onChange={(e) => setCustomW(parseFloat(e.target.value) || 0)}
            />
            <div className="text-xs text-muted mt-1">= {inToPx(customW)} px</div>
          </div>
          <div>
            <label className="field-label">Height (inches)</label>
            <input
              type="number"
              step={0.125}
              min={0.25}
              max={20}
              className="input"
              value={customH}
              onChange={(e) => setCustomH(parseFloat(e.target.value) || 0)}
            />
            <div className="text-xs text-muted mt-1">= {inToPx(customH)} px</div>
          </div>
          <div className="col-span-2 flex justify-center py-4">
            <div
              className="border border-border bg-white"
              style={{
                width: Math.min(customW * 60, 360),
                height: Math.min(customH * 60, 360),
              }}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={applyCustom}>
              Apply
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
