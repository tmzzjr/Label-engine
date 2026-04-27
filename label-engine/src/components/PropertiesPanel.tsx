import { useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Type,
  Image as ImgIcon,
  QrCode,
  Square,
  Circle,
  Minus,
  Plus,
  Tag,
  X,
  ChevronDown,
  ChevronRight,
  Move,
} from "lucide-react";
import { useStore } from "../store";
import type {
  CircleElement,
  ImageElement,
  LabelElement,
  LineElement,
  QRCodeElement,
  RectElement,
  TextElement,
} from "../types";
import { COMMON_FONTS } from "../utils";

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <label className="field-label">
        {label}
        {suffix && <span className="ml-1 text-subtle">({suffix})</span>}
      </label>
      <input
        type="number"
        className="input"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border border-border bg-surface p-0.5"
        />
        <input
          className="input flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function CommonBox({ el }: { el: LabelElement }) {
  const { updateElement } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="rounded-md border border-border bg-surface2/60">
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-fg transition"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Move size={14} />
          <span>Position &amp; Size</span>
          <span className="ml-auto text-[10px] font-normal normal-case text-subtle">
            {Math.round(el.x)}, {Math.round(el.y)} · {Math.round(el.width)}×
            {Math.round(el.height)}
          </span>
        </button>
        {open && (
          <div className="grid grid-cols-2 gap-2 p-3 border-t border-border">
            <NumberField
              label="X"
              value={el.x}
              onChange={(n) => updateElement(el.id, { x: n })}
            />
            <NumberField
              label="Y"
              value={el.y}
              onChange={(n) => updateElement(el.id, { y: n })}
            />
            <NumberField
              label="W"
              value={el.width}
              onChange={(n) =>
                updateElement(el.id, { width: Math.max(4, n) })
              }
            />
            <NumberField
              label="H"
              value={el.height}
              onChange={(n) =>
                updateElement(el.id, { height: Math.max(4, n) })
              }
            />
            <NumberField
              label="Rotation"
              value={el.rotation}
              onChange={(n) => updateElement(el.id, { rotation: n })}
              suffix="°"
            />
          </div>
        )}
      </div>

      <div>
        <label className="field-label flex items-center justify-between">
          <span>Opacity</span>
          <span className="text-subtle font-normal normal-case">
            {Math.round(el.opacity * 100)}%
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={el.opacity}
          onChange={(e) =>
            updateElement(el.id, { opacity: parseFloat(e.target.value) })
          }
          className="w-full accent-accent"
        />
      </div>
    </>
  );
}

function TextEditor({ el }: { el: TextElement }) {
  const { updateElement } = useStore();
  const tog = (k: "bold" | "italic" | "underline") =>
    updateElement(el.id, { [k]: !el[k] } as any);

  return (
    <>
      <div>
        <label className="field-label">Text</label>
        <textarea
          className="input min-h-[60px]"
          value={el.text}
          onChange={(e) => updateElement(el.id, { text: e.target.value })}
        />
      </div>
      <div>
        <label className="field-label">Font</label>
        <select
          className="input"
          value={el.fontFamily}
          onChange={(e) => updateElement(el.id, { fontFamily: e.target.value })}
        >
          {COMMON_FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Size: {el.fontSize}px</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={6}
            max={96}
            step={0.1}
            value={el.fontSize}
            onChange={(e) =>
              updateElement(el.id, { fontSize: parseFloat(e.target.value) })
            }
            className="flex-1"
          />
          <input
            type="number"
            step={0.01}
            className="input w-20"
            value={el.fontSize}
            onChange={(e) =>
              updateElement(el.id, {
                fontSize: parseFloat(e.target.value) || 12,
              })
            }
          />
        </div>
      </div>
      <ColorField
        label="Color"
        value={el.fill}
        onChange={(c) => updateElement(el.id, { fill: c })}
      />
      <div className="flex gap-1">
        <button
          className={`icon-btn ${el.bold ? "icon-btn-active" : ""}`}
          onClick={() => tog("bold")}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          className={`icon-btn ${el.italic ? "icon-btn-active" : ""}`}
          onClick={() => tog("italic")}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          className={`icon-btn ${el.underline ? "icon-btn-active" : ""}`}
          onClick={() => tog("underline")}
          title="Underline"
        >
          <Underline size={16} />
        </button>
        <button
          className="icon-btn font-semibold text-xs"
          onClick={() =>
            updateElement(el.id, { text: el.text.toUpperCase() })
          }
          title="UPPERCASE"
        >
          AA
        </button>
        <button
          className="icon-btn font-semibold text-xs"
          onClick={() =>
            updateElement(el.id, { text: el.text.toLowerCase() })
          }
          title="lowercase"
        >
          aa
        </button>
        <div className="w-px bg-border mx-1" />
        <button
          className={`icon-btn ${el.align === "left" ? "icon-btn-active" : ""}`}
          onClick={() => updateElement(el.id, { align: "left" })}
        >
          <AlignLeft size={16} />
        </button>
        <button
          className={`icon-btn ${el.align === "center" ? "icon-btn-active" : ""}`}
          onClick={() => updateElement(el.id, { align: "center" })}
        >
          <AlignCenter size={16} />
        </button>
        <button
          className={`icon-btn ${el.align === "right" ? "icon-btn-active" : ""}`}
          onClick={() => updateElement(el.id, { align: "right" })}
        >
          <AlignRight size={16} />
        </button>
      </div>
      <div>
        <label className="field-label">
          Line height: {el.lineHeight.toFixed(2)}
        </label>
        <input
          type="range"
          min={0.8}
          max={2.5}
          step={0.05}
          value={el.lineHeight}
          onChange={(e) =>
            updateElement(el.id, { lineHeight: parseFloat(e.target.value) })
          }
          className="w-full"
        />
      </div>
      <div>
        <label className="field-label">
          Letter spacing: {(el.letterSpacing ?? 0).toFixed(1)}px
        </label>
        <input
          type="range"
          min={-5}
          max={20}
          step={0.1}
          value={el.letterSpacing ?? 0}
          onChange={(e) =>
            updateElement(el.id, { letterSpacing: parseFloat(e.target.value) })
          }
          className="w-full"
        />
      </div>
      <FieldMapping el={el} />
    </>
  );
}

function MultiTextEditor({ els }: { els: TextElement[] }) {
  const { setDoc } = useStore();
  const ids = els.map((e) => e.id);
  const common = <K extends keyof TextElement>(k: K): TextElement[K] | null => {
    const v = els[0][k];
    return els.every((e) => e[k] === v) ? v : (null as any);
  };
  const apply = (patch: Partial<TextElement>) => {
    setDoc((d) => ({
      ...d,
      elements: d.elements.map((e) =>
        ids.includes(e.id) && e.type === "text"
          ? ({ ...e, ...patch } as any)
          : e
      ),
    }));
  };
  const fontFamily = common("fontFamily");
  const fontSize = common("fontSize");
  const fill = common("fill");
  const align = common("align");
  const bold = common("bold");
  const italic = common("italic");
  const underline = common("underline");
  return (
    <>
      <div className="text-xs text-muted">
        {els.length} text elements selected — changes apply to all.
      </div>
      <div>
        <label className="field-label">Font</label>
        <select
          className="input"
          value={fontFamily ?? ""}
          onChange={(e) => apply({ fontFamily: e.target.value })}
        >
          {fontFamily === null && <option value="">(mixed)</option>}
          {COMMON_FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">
          Size: {fontSize === null ? "(mixed)" : `${fontSize}px`}
        </label>
        <input
          type="number"
          step={0.01}
          className="input"
          value={fontSize ?? ""}
          placeholder="mixed"
          onChange={(e) =>
            apply({ fontSize: parseFloat(e.target.value) || 12 })
          }
        />
      </div>
      <ColorField
        label={fill === null ? "Color (mixed)" : "Color"}
        value={fill ?? "#000000"}
        onChange={(c) => apply({ fill: c })}
      />
      <div className="flex gap-1">
        <button
          className={`icon-btn ${bold ? "icon-btn-active" : ""}`}
          onClick={() => apply({ bold: !bold })}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          className={`icon-btn ${italic ? "icon-btn-active" : ""}`}
          onClick={() => apply({ italic: !italic })}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          className={`icon-btn ${underline ? "icon-btn-active" : ""}`}
          onClick={() => apply({ underline: !underline })}
          title="Underline"
        >
          <Underline size={16} />
        </button>
        <button
          className="icon-btn font-semibold text-xs"
          onClick={() =>
            setDoc((d) => ({
              ...d,
              elements: d.elements.map((e) =>
                ids.includes(e.id) && e.type === "text"
                  ? ({ ...e, text: e.text.toUpperCase() } as any)
                  : e
              ),
            }))
          }
          title="UPPERCASE"
        >
          AA
        </button>
        <button
          className="icon-btn font-semibold text-xs"
          onClick={() =>
            setDoc((d) => ({
              ...d,
              elements: d.elements.map((e) =>
                ids.includes(e.id) && e.type === "text"
                  ? ({ ...e, text: e.text.toLowerCase() } as any)
                  : e
              ),
            }))
          }
          title="lowercase"
        >
          aa
        </button>
        <div className="w-px bg-border mx-1" />
        <button
          className={`icon-btn ${align === "left" ? "icon-btn-active" : ""}`}
          onClick={() => apply({ align: "left" })}
        >
          <AlignLeft size={16} />
        </button>
        <button
          className={`icon-btn ${align === "center" ? "icon-btn-active" : ""}`}
          onClick={() => apply({ align: "center" })}
        >
          <AlignCenter size={16} />
        </button>
        <button
          className={`icon-btn ${align === "right" ? "icon-btn-active" : ""}`}
          onClick={() => apply({ align: "right" })}
        >
          <AlignRight size={16} />
        </button>
      </div>
    </>
  );
}

function ImageEditor({ el }: { el: ImageElement }) {
  const { updateElement } = useStore();
  return (
    <>
      <div className="card p-2 flex justify-center bg-white">
        <img
          src={el.src}
          alt=""
          className="max-h-24 max-w-full object-contain"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-fg">
        <input
          type="checkbox"
          checked={el.keepAspect}
          onChange={(e) =>
            updateElement(el.id, { keepAspect: e.target.checked })
          }
        />
        Keep aspect ratio
      </label>
    </>
  );
}

function QRCodeEditor({ el }: { el: QRCodeElement }) {
  const { updateElement } = useStore();
  return (
    <>
      <div>
        <label className="field-label">URL / Text</label>
        <textarea
          className="input min-h-[60px]"
          value={el.value}
          onChange={(e) => updateElement(el.id, { value: e.target.value })}
          placeholder="https://..."
        />
        {!el.value && (
          <p className="text-xs text-danger mt-1">
            ⚠ QR code has no content and will display in red until a link is
            added.
          </p>
        )}
      </div>
      <div>
        <label className="field-label">Error correction</label>
        <select
          className="input"
          value={el.errorLevel}
          onChange={(e) =>
            updateElement(el.id, { errorLevel: e.target.value as any })
          }
        >
          <option value="L">L — Low (7%)</option>
          <option value="M">M — Medium (15%)</option>
          <option value="Q">Q — High (25%)</option>
          <option value="H">H — Maximum (30%)</option>
        </select>
      </div>
      <ColorField
        label="QR color"
        value={el.fg}
        onChange={(c) => updateElement(el.id, { fg: c })}
      />
      <ColorField
        label="QR background"
        value={el.bg}
        onChange={(c) => updateElement(el.id, { bg: c })}
      />
      <FieldMapping el={el} />
    </>
  );
}

function RectEditor({ el }: { el: RectElement }) {
  const { updateElement } = useStore();
  return (
    <>
      <ColorField
        label="Fill"
        value={el.fill}
        onChange={(c) => updateElement(el.id, { fill: c })}
      />
      <ColorField
        label="Stroke"
        value={el.stroke}
        onChange={(c) => updateElement(el.id, { stroke: c })}
      />
      <NumberField
        label="Stroke width"
        value={el.strokeWidth}
        onChange={(n) => updateElement(el.id, { strokeWidth: Math.max(0, n) })}
      />
      <NumberField
        label="Corner radius"
        value={el.cornerRadius}
        onChange={(n) => updateElement(el.id, { cornerRadius: Math.max(0, n) })}
      />
    </>
  );
}

function CircleEditor({ el }: { el: CircleElement }) {
  const { updateElement } = useStore();
  return (
    <>
      <ColorField
        label="Fill"
        value={el.fill}
        onChange={(c) => updateElement(el.id, { fill: c })}
      />
      <ColorField
        label="Stroke"
        value={el.stroke}
        onChange={(c) => updateElement(el.id, { stroke: c })}
      />
      <NumberField
        label="Stroke width"
        value={el.strokeWidth}
        onChange={(n) => updateElement(el.id, { strokeWidth: Math.max(0, n) })}
      />
    </>
  );
}

function LineEditor({ el }: { el: LineElement }) {
  const { updateElement } = useStore();
  return (
    <>
      <ColorField
        label="Color"
        value={el.stroke}
        onChange={(c) => updateElement(el.id, { stroke: c })}
      />
      <NumberField
        label="Width"
        value={el.strokeWidth}
        onChange={(n) => updateElement(el.id, { strokeWidth: Math.max(1, n) })}
      />
    </>
  );
}

function FieldMapping({ el }: { el: LabelElement }) {
  const { updateElement } = useStore();
  if (el.type !== "text" && el.type !== "qrcode") return null;
  return (
    <div>
      <label className="field-label">Auto-fill field</label>
      <select
        className="input"
        value={el.field || ""}
        onChange={(e) =>
          updateElement(el.id, { field: (e.target.value || null) as any })
        }
      >
        <option value="">(none)</option>
        {el.type === "text" && (
          <>
            <option value="productName">Product name</option>
            <option value="sku">SKU</option>
            <option value="lot">LOT number</option>
            <option value="mfgDate">Manufacture date</option>
            <option value="expDate">Expiration date</option>
            <option value="concentration">Concentration (mg/ml)</option>
            <option value="notes">Notes</option>
          </>
        )}
        {el.type === "qrcode" && (
          <>
            <option value="qrLink">QR Link (product)</option>
            <option value="inventoryQr">Inventory QR</option>
          </>
        )}
      </select>
    </div>
  );
}

function iconFor(type: LabelElement["type"]) {
  switch (type) {
    case "text":
      return <Type size={14} />;
    case "image":
      return <ImgIcon size={14} />;
    case "qrcode":
      return <QrCode size={14} />;
    case "rect":
      return <Square size={14} />;
    case "circle":
      return <Circle size={14} />;
    case "line":
      return <Minus size={14} />;
  }
}

function elementLabel(el: LabelElement) {
  if (el.type === "text")
    return (el as TextElement).text.slice(0, 22) || "Text";
  if (el.type === "qrcode")
    return (el as QRCodeElement).value.slice(0, 22) || "QR (empty)";
  if (el.type === "image") return "Image";
  if (el.type === "rect") return "Rectangle";
  if (el.type === "circle") return "Circle";
  return "Line";
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PropertiesPanel({ open, onClose }: Props) {
  const {
    doc,
    selectedIds,
    setSelection,
    deleteSelected,
    duplicateSelected,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    updateElement,
    setDoc,
    currentTemplate,
    currentLabelId,
    currentTemplateId,
    openLabel,
    duplicateLabel,
    createLabelInTemplate,
  } = useStore();

  const [layerDragIdx, setLayerDragIdx] = useState<number | null>(null);
  const [layerOverIdx, setLayerOverIdx] = useState<number | null>(null);

  if (!doc) return null;
  const selected = doc.elements.filter((e) => selectedIds.includes(e.id));
  const first = selected[0];
  const multi = selected.length > 1;
  const allText = multi && selected.every((e) => e.type === "text");

  const reorderLayer = (fromDisplayed: number, toDisplayed: number) => {
    if (fromDisplayed === toDisplayed) return;
    setDoc((d) => {
      const reversed = [...d.elements].reverse();
      const [moved] = reversed.splice(fromDisplayed, 1);
      reversed.splice(toDisplayed, 0, moved);
      return { ...d, elements: reversed.reverse() };
    });
  };

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
        fixed lg:static top-14 bottom-0 right-0 z-50
        w-80 flex-shrink-0 border-l border-border bg-surface overflow-y-auto
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        ${!open && "lg:block hidden"}
      `}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between lg:hidden mb-4">
            <h2 className="font-semibold">Properties</h2>
            <button className="icon-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {!first ? (
            <div className="text-sm text-muted text-center py-6">
              No element selected.
              <br />
              Click an element on the canvas to edit.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
                  {iconFor(first.type)}
                  Properties
                </h3>
                <div className="flex gap-1">
                  <button
                    className="icon-btn"
                    title="Duplicate (Ctrl+D)"
                    onClick={duplicateSelected}
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    title={first.locked ? "Unlock" : "Lock"}
                    onClick={() =>
                      updateElement(first.id, { locked: !first.locked })
                    }
                  >
                    {first.locked ? <Unlock size={16} /> : <Lock size={16} />}
                  </button>
                  <button
                    className="icon-btn hover:text-danger"
                    title="Delete (Delete)"
                    onClick={deleteSelected}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  className="btn-secondary flex-1 text-xs py-1.5 px-1"
                  onClick={bringToFront}
                  title="Bring to front"
                >
                  <ArrowUpToLine size={14} /> Front
                </button>
                <button
                  className="btn-secondary flex-1 text-xs py-1.5 px-1"
                  onClick={bringForward}
                >
                  <ArrowUp size={14} /> +1
                </button>
                <button
                  className="btn-secondary flex-1 text-xs py-1.5 px-1"
                  onClick={sendBackward}
                >
                  <ArrowDown size={14} /> -1
                </button>
                <button
                  className="btn-secondary flex-1 text-xs py-1.5 px-1"
                  onClick={sendToBack}
                  title="Send to back"
                >
                  <ArrowDownToLine size={14} /> Back
                </button>
              </div>

              {!multi && <CommonBox el={first} />}

              {multi && allText && (
                <MultiTextEditor els={selected as TextElement[]} />
              )}
              {multi && !allText && (
                <div className="text-sm text-muted">
                  {selected.length} elements selected (mixed types). Color and
                  font edits are only available when all selected are text.
                </div>
              )}
              {!multi && first.type === "text" && (
                <TextEditor el={first as TextElement} />
              )}
              {!multi && first.type === "image" && (
                <ImageEditor el={first as ImageElement} />
              )}
              {!multi && first.type === "qrcode" && (
                <QRCodeEditor el={first as QRCodeElement} />
              )}
              {!multi && first.type === "rect" && (
                <RectEditor el={first as RectElement} />
              )}
              {!multi && first.type === "circle" && (
                <CircleEditor el={first as CircleElement} />
              )}
              {!multi && first.type === "line" && (
                <LineEditor el={first as LineElement} />
              )}
            </div>
          )}
        </div>

        {/* Labels in the current template */}
        {currentTemplate && currentTemplateId && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Labels in Template
              </h3>
              <button
                className="icon-btn"
                title="New label in this template"
                onClick={() => createLabelInTemplate(currentTemplateId)}
              >
                <Plus size={14} />
              </button>
            </div>
            <ul className="space-y-1">
              {currentTemplate.labels.map((l) => {
                const isCurrent = l.id === currentLabelId;
                return (
                  <li
                    key={l.id}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${
                      isCurrent
                        ? "bg-accent-soft text-accent"
                        : "hover:bg-surface2 text-fg"
                    }`}
                  >
                    <button
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                      onClick={() => {
                        if (!isCurrent) openLabel(currentTemplateId, l.id);
                      }}
                      title={isCurrent ? "Current label" : "Switch to this label"}
                    >
                      <Tag size={13} className="flex-shrink-0" />
                      <span className="truncate">{l.name}</span>
                    </button>
                    <button
                      className="icon-btn w-6 h-6"
                      title="Duplicate label"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateLabel(currentTemplateId, l.id);
                      }}
                    >
                      <Copy size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Layers */}
        <div className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
            Layers
          </h3>
          <ul className="space-y-1">
            {[...doc.elements].reverse().map((el, i) => {
              const isSel = selectedIds.includes(el.id);
              const hidden = el.visible === false;
              const isDragging = layerDragIdx === i;
              const isOver =
                layerOverIdx === i &&
                layerDragIdx !== null &&
                layerDragIdx !== i;
              return (
                <li
                  key={el.id}
                  draggable
                  onDragStart={(e) => {
                    setLayerDragIdx(i);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (layerOverIdx !== i) setLayerOverIdx(i);
                  }}
                  onDragLeave={() => {
                    if (layerOverIdx === i) setLayerOverIdx(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (layerDragIdx !== null) reorderLayer(layerDragIdx, i);
                    setLayerDragIdx(null);
                    setLayerOverIdx(null);
                  }}
                  onDragEnd={() => {
                    setLayerDragIdx(null);
                    setLayerOverIdx(null);
                  }}
                  className={`flex items-center gap-1 rounded px-2 py-1.5 text-sm transition cursor-grab active:cursor-grabbing ${
                    isSel
                      ? "bg-accent-soft text-accent"
                      : "hover:bg-surface2 text-fg"
                  } ${hidden ? "opacity-50" : ""} ${
                    isDragging ? "opacity-30" : ""
                  } ${
                    isOver
                      ? layerDragIdx! > i
                        ? "border-t-2 border-accent"
                        : "border-b-2 border-accent"
                      : ""
                  }`}
                >
                  <button
                    className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    onClick={() => {
                      setSelection([el.id]);
                      if (window.innerWidth < 1024) onClose();
                    }}
                  >
                    {iconFor(el.type)}
                    <span className="truncate">{elementLabel(el)}</span>
                  </button>
                  <button
                    className="icon-btn w-6 h-6"
                    title={hidden ? "Show" : "Hide"}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateElement(el.id, { visible: hidden });
                    }}
                  >
                    {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </li>
              );
            })}
            {doc.elements.length === 0 && (
              <li className="text-xs text-muted text-center py-3">No layers</li>
            )}
          </ul>
        </div>
      </aside>
    </>
  );
}
