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
        {suffix && <span className="ml-1 text-brand-400">({suffix})</span>}
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
          className="h-9 w-12 rounded border border-brand-200 bg-white p-0.5"
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
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
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
          onChange={(n) => updateElement(el.id, { width: Math.max(4, n) })}
        />
        <NumberField
          label="H"
          value={el.height}
          onChange={(n) => updateElement(el.id, { height: Math.max(4, n) })}
        />
        <NumberField
          label="Rotação"
          value={el.rotation}
          onChange={(n) => updateElement(el.id, { rotation: n })}
          suffix="°"
        />
        <div>
          <label className="field-label">Opacidade</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={el.opacity}
            onChange={(e) =>
              updateElement(el.id, { opacity: parseFloat(e.target.value) })
            }
            className="w-full"
          />
        </div>
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
        <label className="field-label">Texto</label>
        <textarea
          className="input min-h-[60px]"
          value={el.text}
          onChange={(e) => updateElement(el.id, { text: e.target.value })}
        />
      </div>
      <div>
        <label className="field-label">Fonte</label>
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
        <label className="field-label">Tamanho: {el.fontSize}px</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={6}
            max={96}
            value={el.fontSize}
            onChange={(e) =>
              updateElement(el.id, { fontSize: parseInt(e.target.value) })
            }
            className="flex-1"
          />
          <input
            type="number"
            className="input w-20"
            value={el.fontSize}
            onChange={(e) =>
              updateElement(el.id, { fontSize: parseInt(e.target.value) || 12 })
            }
          />
        </div>
      </div>
      <ColorField
        label="Cor"
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
        <div className="w-px bg-brand-200 mx-1" />
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
        <label className="field-label">Entrelinha: {el.lineHeight.toFixed(2)}</label>
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
      <FieldMapping el={el} />
    </>
  );
}

function ImageEditor({ el }: { el: ImageElement }) {
  const { updateElement } = useStore();
  return (
    <>
      <div className="card p-2 flex justify-center">
        <img
          src={el.src}
          alt=""
          className="max-h-24 max-w-full object-contain"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-brand-700">
        <input
          type="checkbox"
          checked={el.keepAspect}
          onChange={(e) => updateElement(el.id, { keepAspect: e.target.checked })}
        />
        Manter proporção
      </label>
    </>
  );
}

function QRCodeEditor({ el }: { el: QRCodeElement }) {
  const { updateElement } = useStore();
  return (
    <>
      <div>
        <label className="field-label">URL / Texto</label>
        <textarea
          className="input min-h-[60px]"
          value={el.value}
          onChange={(e) => updateElement(el.id, { value: e.target.value })}
        />
      </div>
      <div>
        <label className="field-label">Correção de erro</label>
        <select
          className="input"
          value={el.errorLevel}
          onChange={(e) =>
            updateElement(el.id, { errorLevel: e.target.value as any })
          }
        >
          <option value="L">L — Baixa (7%)</option>
          <option value="M">M — Média (15%)</option>
          <option value="Q">Q — Alta (25%)</option>
          <option value="H">H — Máxima (30%)</option>
        </select>
      </div>
      <ColorField
        label="Cor do QR"
        value={el.fg}
        onChange={(c) => updateElement(el.id, { fg: c })}
      />
      <ColorField
        label="Fundo do QR"
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
        label="Preenchimento"
        value={el.fill}
        onChange={(c) => updateElement(el.id, { fill: c })}
      />
      <ColorField
        label="Borda"
        value={el.stroke}
        onChange={(c) => updateElement(el.id, { stroke: c })}
      />
      <NumberField
        label="Espessura"
        value={el.strokeWidth}
        onChange={(n) => updateElement(el.id, { strokeWidth: Math.max(0, n) })}
      />
      <NumberField
        label="Raio dos cantos"
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
        label="Preenchimento"
        value={el.fill}
        onChange={(c) => updateElement(el.id, { fill: c })}
      />
      <ColorField
        label="Borda"
        value={el.stroke}
        onChange={(c) => updateElement(el.id, { stroke: c })}
      />
      <NumberField
        label="Espessura"
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
        label="Cor"
        value={el.stroke}
        onChange={(c) => updateElement(el.id, { stroke: c })}
      />
      <NumberField
        label="Espessura"
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
      <label className="field-label">Campo auto-preenchido</label>
      <select
        className="input"
        value={el.field || ""}
        onChange={(e) =>
          updateElement(el.id, { field: (e.target.value || null) as any })
        }
      >
        <option value="">(nenhum)</option>
        <option value="productName">Nome do produto</option>
        <option value="sku">SKU</option>
        <option value="lot">Lote / LOT</option>
        <option value="mfgDate">Data de fabricação</option>
        <option value="expDate">Data de validade</option>
        {el.type === "qrcode" && <option value="qrLink">Link QR</option>}
        <option value="notes">Observações</option>
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
  if (el.type === "text") return (el as TextElement).text.slice(0, 22) || "Texto";
  if (el.type === "qrcode") return (el as QRCodeElement).value.slice(0, 22) || "QR";
  if (el.type === "image") return "Imagem";
  if (el.type === "rect") return "Retângulo";
  if (el.type === "circle") return "Círculo";
  return "Linha";
}

export default function PropertiesPanel() {
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
  } = useStore();

  const first = doc.elements.find((e) => selectedIds.includes(e.id));

  return (
    <aside className="w-80 flex-shrink-0 border-l border-brand-200 bg-white overflow-y-auto">
      {/* Top: selected element editor */}
      <div className="p-4 border-b border-brand-100">
        {!first ? (
          <div className="text-sm text-brand-500 text-center py-6">
            Nenhum elemento selecionado.
            <br />
            Clique em um elemento no canvas para editar.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-brand-800 flex items-center gap-2">
                {iconFor(first.type)}
                Propriedades
              </h3>
              <div className="flex gap-1">
                <button
                  className="icon-btn"
                  title="Duplicar (Ctrl+D)"
                  onClick={duplicateSelected}
                >
                  <Copy size={16} />
                </button>
                <button
                  className="icon-btn"
                  title={first.locked ? "Destravar" : "Travar"}
                  onClick={() =>
                    updateElement(first.id, { locked: !first.locked })
                  }
                >
                  {first.locked ? <Unlock size={16} /> : <Lock size={16} />}
                </button>
                <button
                  className="icon-btn text-rose-600"
                  title="Excluir (Delete)"
                  onClick={deleteSelected}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex gap-1">
              <button
                className="btn-secondary flex-1 text-xs py-1.5"
                onClick={bringToFront}
                title="Trazer para frente"
              >
                <ArrowUpToLine size={14} /> Frente
              </button>
              <button
                className="btn-secondary flex-1 text-xs py-1.5"
                onClick={bringForward}
              >
                <ArrowUp size={14} /> +1
              </button>
              <button
                className="btn-secondary flex-1 text-xs py-1.5"
                onClick={sendBackward}
              >
                <ArrowDown size={14} /> -1
              </button>
              <button
                className="btn-secondary flex-1 text-xs py-1.5"
                onClick={sendToBack}
                title="Enviar para trás"
              >
                <ArrowDownToLine size={14} /> Fundo
              </button>
            </div>

            <CommonBox el={first} />

            {first.type === "text" && <TextEditor el={first as TextElement} />}
            {first.type === "image" && <ImageEditor el={first as ImageElement} />}
            {first.type === "qrcode" && <QRCodeEditor el={first as QRCodeElement} />}
            {first.type === "rect" && <RectEditor el={first as RectElement} />}
            {first.type === "circle" && <CircleEditor el={first as CircleElement} />}
            {first.type === "line" && <LineEditor el={first as LineElement} />}
          </div>
        )}
      </div>

      {/* Layers */}
      <div className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-500 mb-2">
          Camadas
        </h3>
        <ul className="space-y-1">
          {[...doc.elements].reverse().map((el) => {
            const isSel = selectedIds.includes(el.id);
            return (
              <li key={el.id}>
                <button
                  className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
                    isSel
                      ? "bg-brand-100 text-brand-900"
                      : "hover:bg-brand-50 text-brand-700"
                  }`}
                  onClick={() => setSelection([el.id])}
                >
                  {iconFor(el.type)}
                  <span className="truncate flex-1">{elementLabel(el)}</span>
                  <span
                    className="opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateElement(el.id, { visible: el.visible === false });
                    }}
                  >
                    {el.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                  </span>
                </button>
              </li>
            );
          })}
          {doc.elements.length === 0 && (
            <li className="text-xs text-brand-400 text-center py-3">
              Nenhuma camada
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}
