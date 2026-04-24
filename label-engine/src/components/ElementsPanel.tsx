import { useRef, useState } from "react";
import {
  Type,
  Image as ImgIcon,
  QrCode,
  Square,
  Circle,
  Minus,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { pdfFirstPageToDataURL, isPDF } from "../pdfToImage";
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

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ElementsPanel({ open, onClose }: Props) {
  const { doc, addElement, setBackgroundImage } = useStore();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bgFileRef = useRef<HTMLInputElement | null>(null);
  const [bgLoading, setBgLoading] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);

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
    if (window.innerWidth < 1024) onClose();
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
    if (window.innerWidth < 1024) onClose();
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
      fill: "#dbeafe",
      stroke: "#1d4ed8",
      strokeWidth: 1,
      cornerRadius: 4,
    };
    addElement(el);
    if (window.innerWidth < 1024) onClose();
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
    if (window.innerWidth < 1024) onClose();
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
    if (window.innerWidth < 1024) onClose();
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
      if (window.innerWidth < 1024) onClose();
    };
    img.src = dataUrl;
  };

  const onUploadBackground = async (file: File) => {
    setBgError(null);
    setBgLoading(true);
    try {
      let dataUrl: string;
      if (isPDF(file)) {
        dataUrl = await pdfFirstPageToDataURL(file);
      } else {
        dataUrl = await readFileAsDataURL(file);
      }
      setBackgroundImage(dataUrl);
      if (window.innerWidth < 1024) onClose();
    } catch (e: any) {
      setBgError(e?.message || "Failed to load background.");
    } finally {
      setBgLoading(false);
    }
  };

  const tile =
    "flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface2 p-3 text-xs font-medium text-fg hover:border-accent hover:bg-surface transition";

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
        fixed lg:static top-14 bottom-0 left-0 z-50
        w-64 flex-shrink-0 border-r border-border bg-surface overflow-y-auto
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${!open && "lg:block hidden"}
      `}
      >
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between lg:hidden mb-2">
            <h2 className="font-semibold">Add Elements</h2>
            <button className="icon-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

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
              disabled={bgLoading}
            >
              {bgLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {bgLoading ? "Processing…" : "Upload image / PDF"}
            </button>
            <p className="text-[11px] text-muted mt-1">
              PNG, JPG, SVG or PDF (first page).
            </p>
            {bgError && (
              <p className="text-xs text-danger mt-2">{bgError}</p>
            )}
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
              accept="image/png,image/jpeg,image/svg+xml,application/pdf,.pdf"
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
    </>
  );
}
