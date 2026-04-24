import { useRef } from "react";
import {
  Type,
  Image as ImgIcon,
  QrCode,
  Square,
  Circle,
  Minus,
  Upload,
} from "lucide-react";
import { useStore } from "../store";
import type {
  CircleElement,
  ImageElement,
  LineElement,
  QRCodeElement,
  RectElement,
  TextElement,
} from "../types";
import { uid, readFileAsDataURL } from "../utils";
import { inToPx } from "../types";

export default function ElementsPanel() {
  const { doc, addElement, setBackgroundImage } = useStore();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bgFileRef = useRef<HTMLInputElement | null>(null);

  if (!doc) return null;
  const w = inToPx(doc.size.widthIn);
  const h = inToPx(doc.size.heightIn);

  const centerPos = (cw: number, ch: number) => ({
    x: Math.round(w / 2 - cw / 2),
    y: Math.round(h / 2 - ch / 2),
  });

  const addText = () => {
    const cw = Math.min(160, w - 20);
    const ch = 32;
    const pos = centerPos(cw, ch);
    const el: TextElement = {
      id: uid(),
      type: "text",
      x: pos.x,
      y: pos.y,
      width: cw,
      height: ch,
      rotation: 0,
      opacity: 1,
      text: "New text",
      fontFamily: "Inter",
      fontSize: 16,
      fill: "#111827",
      bold: false,
      italic: false,
      underline: false,
      align: "center",
      lineHeight: 1.2,
    };
    addElement(el);
  };

  const addQR = () => {
    const side = Math.min(w, h) * 0.4;
    const pos = centerPos(side, side);
    const el: QRCodeElement = {
      id: uid(),
      type: "qrcode",
      x: pos.x,
      y: pos.y,
      width: side,
      height: side,
      rotation: 0,
      opacity: 1,
      value: "",
      errorLevel: "M",
      fg: "#000000",
      bg: "#ffffff",
    };
    addElement(el);
  };

  const addRect = () => {
    const cw = 120;
    const ch = 60;
    const pos = centerPos(cw, ch);
    const el: RectElement = {
      id: uid(),
      type: "rect",
      x: pos.x,
      y: pos.y,
      width: cw,
      height: ch,
      rotation: 0,
      opacity: 1,
      fill: "#e0e7ff",
      stroke: "#4338ca",
      strokeWidth: 1,
      cornerRadius: 4,
    };
    addElement(el);
  };

  const addCircle = () => {
    const s = 80;
    const pos = centerPos(s, s);
    const el: CircleElement = {
      id: uid(),
      type: "circle",
      x: pos.x,
      y: pos.y,
      width: s,
      height: s,
      rotation: 0,
      opacity: 1,
      fill: "#fee2e2",
      stroke: "#b91c1c",
      strokeWidth: 1,
    };
    addElement(el);
  };

  const addLine = () => {
    const cw = Math.min(180, w - 20);
    const pos = centerPos(cw, 2);
    const el: LineElement = {
      id: uid(),
      type: "line",
      x: pos.x,
      y: pos.y,
      width: cw,
      height: 2,
      rotation: 0,
      opacity: 1,
      stroke: "#111827",
      strokeWidth: 2,
    };
    addElement(el);
  };

  const onUploadImage = async (file: File) => {
    const dataUrl = await readFileAsDataURL(file);
    const img = new Image();
    img.onload = () => {
      const maxW = w * 0.6;
      const maxH = h * 0.6;
      let cw = img.naturalWidth;
      let ch = img.naturalHeight;
      const ratio = cw / ch;
      if (cw > maxW) {
        cw = maxW;
        ch = cw / ratio;
      }
      if (ch > maxH) {
        ch = maxH;
        cw = ch * ratio;
      }
      const pos = centerPos(cw, ch);
      const el: ImageElement = {
        id: uid(),
        type: "image",
        x: pos.x,
        y: pos.y,
        width: cw,
        height: ch,
        rotation: 0,
        opacity: 1,
        src: dataUrl,
        keepAspect: true,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      };
      addElement(el);
    };
    img.src = dataUrl;
  };

  const onUploadBackground = async (file: File) => {
    const dataUrl = await readFileAsDataURL(file);
    setBackgroundImage(dataUrl);
  };

  const tile =
    "flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface2 p-3 text-xs font-medium text-fg hover:border-accent hover:bg-surface transition";

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-surface overflow-y-auto">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
            Add-ons
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button className={tile} onClick={addText}>
              <Type size={20} /> Text
            </button>
            <button className={tile} onClick={() => fileRef.current?.click()}>
              <ImgIcon size={20} /> Logo
            </button>
            <button className={tile} onClick={addQR}>
              <QrCode size={20} /> QR Code
            </button>
            <button className={tile} onClick={addRect}>
              <Square size={20} /> Rectangle
            </button>
            <button className={tile} onClick={addCircle}>
              <Circle size={20} /> Circle
            </button>
            <button className={tile} onClick={addLine}>
              <Minus size={20} /> Line
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadImage(f);
              e.currentTarget.value = "";
            }}
          />
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
            Template Background
          </h3>
          <button
            className="w-full btn-secondary"
            onClick={() => bgFileRef.current?.click()}
          >
            <Upload size={16} />
            Upload image
          </button>
          {doc.backgroundImage && (
            <button
              className="w-full btn-ghost mt-2 text-xs"
              onClick={() => setBackgroundImage(undefined)}
            >
              Remove background
            </button>
          )}
          <input
            ref={bgFileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadBackground(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>
    </aside>
  );
}
