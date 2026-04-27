import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { Stage, Layer, Rect, Image as KImage, Transformer } from "react-konva";
import Konva from "konva";
import useImage from "use-image";
import type {
  LabelElement,
  TextElement,
  ImageElement as IElement,
  QRCodeElement as QElement,
  RectElement,
  CircleElement,
  LineElement,
} from "../types";
import { inToPx } from "../types";
import { useStore } from "../store";
import TextElementNode from "./elements/TextElement";
import ImageElementNode from "./elements/ImageElement";
import QRCodeElementNode from "./elements/QRCodeElement";
import {
  RectNode,
  CircleNode,
  LineNode,
} from "./elements/ShapeElements";
import AlignmentGuides from "./AlignmentGuides";
import type { Guide } from "./AlignmentGuides";

const SNAP_THRESHOLD = 4;

export interface CanvasHandle {
  toDataURL: (pixelRatio?: number) => string;
  getStage: () => Konva.Stage | null;
}

interface Props {
  showGrid?: boolean;
}

function BackgroundImage({
  src,
  width,
  height,
}: {
  src: string;
  width: number;
  height: number;
}) {
  const [img] = useImage(src, "anonymous");
  return (
    <KImage
      image={img as any}
      x={0}
      y={0}
      width={width}
      height={height}
      listening={false}
    />
  );
}

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(
  { showGrid = false },
  ref
) {
  const {
    doc,
    selectedIds,
    setSelection,
    updateElement,
    commit,
    snapToGrid,
    gridSize,
    showGuides,
  } = useStore();

  const stageRef = useRef<Konva.Stage | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const nodeRefs = useRef<Record<string, Konva.Node>>({});

  const [guides, setGuides] = useState<Guide[]>([]);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Inline text editor state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingRect, setEditingRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: "left" | "center" | "right";
    lineHeight: number;
    letterSpacing: number;
    rotation: number;
    initial: string;
  } | null>(null);

  const labelW = doc ? inToPx(doc.size.widthIn) : 0;
  const labelH = doc ? inToPx(doc.size.heightIn) : 0;

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = useMemo(() => {
    if (!containerSize.w || !containerSize.h || !labelW || !labelH) return 1;
    const pad = 48;
    const sx = (containerSize.w - pad) / labelW;
    const sy = (containerSize.h - pad) / labelH;
    return Math.min(sx, sy, 3);
  }, [containerSize, labelW, labelH]);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const nodes = selectedIds
      .map((id) => nodeRefs.current[id])
      .filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, doc?.elements]);

  useImperativeHandle(ref, () => ({
    toDataURL: (pixelRatio = 1) =>
      stageRef.current?.toDataURL({
        pixelRatio,
        mimeType: "image/png",
      }) ?? "",
    getStage: () => stageRef.current,
  }));

  const handleStageMouseDown = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) => {
    const tgt: any = e.target;
    if (
      tgt === tgt.getStage() ||
      (typeof tgt.name === "function" && tgt.name() === "isBackground")
    ) {
      setSelection([]);
    }
  };

  function computeGuides(
    moving: LabelElement,
    proposedX: number,
    proposedY: number
  ): { x: number; y: number; guides: Guide[] } {
    if (!doc) return { x: proposedX, y: proposedY, guides: [] };
    const others = doc.elements.filter((e) => e.id !== moving.id);
    const movingLeft = proposedX;
    const movingRight = proposedX + moving.width;
    const movingCenterX = proposedX + moving.width / 2;
    const movingTop = proposedY;
    const movingBottom = proposedY + moving.height;
    const movingCenterY = proposedY + moving.height / 2;

    const vTargets: { v: number; kind: "center" | "edge" }[] = [
      { v: labelW / 2, kind: "center" },
    ];
    const hTargets: { v: number; kind: "center" | "edge" }[] = [
      { v: labelH / 2, kind: "center" },
    ];
    others.forEach((o) => {
      vTargets.push(
        { v: o.x, kind: "edge" },
        { v: o.x + o.width, kind: "edge" },
        { v: o.x + o.width / 2, kind: "edge" }
      );
      hTargets.push(
        { v: o.y, kind: "edge" },
        { v: o.y + o.height, kind: "edge" },
        { v: o.y + o.height / 2, kind: "edge" }
      );
    });

    let newX = proposedX;
    let newY = proposedY;
    const activeGuides: Guide[] = [];

    const vCandidates = [
      { val: movingLeft, offset: 0 },
      { val: movingCenterX, offset: -moving.width / 2 },
      { val: movingRight, offset: -moving.width },
    ];
    let bestV: { delta: number; snap: number; guide: Guide } | null = null;
    vCandidates.forEach((c) => {
      vTargets.forEach((t) => {
        const delta = Math.abs(c.val - t.v);
        if (delta <= SNAP_THRESHOLD) {
          if (!bestV || delta < bestV.delta) {
            bestV = {
              delta,
              snap: t.v + c.offset,
              guide: { orientation: "V", coord: t.v, kind: t.kind },
            };
          }
        }
      });
    });
    if (bestV) {
      newX = (bestV as any).snap;
      activeGuides.push((bestV as any).guide);
    }

    const hCandidates = [
      { val: movingTop, offset: 0 },
      { val: movingCenterY, offset: -moving.height / 2 },
      { val: movingBottom, offset: -moving.height },
    ];
    let bestH: { delta: number; snap: number; guide: Guide } | null = null;
    hCandidates.forEach((c) => {
      hTargets.forEach((t) => {
        const delta = Math.abs(c.val - t.v);
        if (delta <= SNAP_THRESHOLD) {
          if (!bestH || delta < bestH.delta) {
            bestH = {
              delta,
              snap: t.v + c.offset,
              guide: { orientation: "H", coord: t.v, kind: t.kind },
            };
          }
        }
      });
    });
    if (bestH) {
      newY = (bestH as any).snap;
      activeGuides.push((bestH as any).guide);
    }

    if (snapToGrid && gridSize > 0) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    return { x: newX, y: newY, guides: activeGuides };
  }

  const onAnyDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!doc) return;
    const node = e.target;
    const id = node.id();
    const moving = doc.elements.find((x) => x.id === id);
    if (!moving) return;
    if (showGuides) {
      const { x, y, guides } = computeGuides(moving, node.x(), node.y());
      if (x !== node.x() || y !== node.y()) {
        node.x(x);
        node.y(y);
      }
      setGuides(guides);
    }
    // Keep QR tooltip glued to the moving QR in real-time (bypass React)
    if (moving.type === "qrcode") {
      setQRTooltipPos(id, node.x(), node.y(), moving.width, moving.height);
    }
  };
  const onAnyDragEnd = () => {
    setGuides([]);
    commit();
  };

  const setRef = (id: string) => (node: Konva.Node | null) => {
    if (node) nodeRefs.current[id] = node;
    else delete nodeRefs.current[id];
  };

  // Inline text editor: double-click a text element to edit it in place.
  const startInlineEdit = (el: TextElement) => {
    const wrapper = wrapperRef.current?.getBoundingClientRect();
    const stage = stageRef.current;
    if (!wrapper || !stage) return;
    const stageBox = stage.container().getBoundingClientRect();
    const originX = stageBox.left - wrapper.left;
    const originY = stageBox.top - wrapper.top;
    setEditingTextId(el.id);
    setEditingRect({
      left: originX + el.x * scale,
      top: originY + el.y * scale,
      width: el.width * scale,
      height: Math.max(el.height * scale, el.fontSize * scale * el.lineHeight),
      fontSize: el.fontSize * scale,
      fontFamily: el.fontFamily,
      color: el.fill,
      bold: el.bold,
      italic: el.italic,
      underline: el.underline,
      align: el.align,
      lineHeight: el.lineHeight,
      letterSpacing: (el.letterSpacing ?? 0) * scale,
      rotation: el.rotation,
      initial: el.text,
    });
  };

  const finishInlineEdit = (nextText?: string) => {
    if (editingTextId && nextText !== undefined) {
      updateElement(editingTextId, { text: nextText }, true);
    }
    setEditingTextId(null);
    setEditingRect(null);
  };

  const renderElement = (el: LabelElement) => {
    if (el.visible === false) return null;
    const draggable = !el.locked && el.id !== editingTextId;
    const patchFn = (patch: Partial<LabelElement>, shouldCommit = true) =>
      updateElement(el.id, patch, shouldCommit);

    const selectEl = (e?: any) => {
      if (e?.cancelBubble !== undefined) e.cancelBubble = true;
      setSelection([el.id]);
    };
    const commonProps = {
      draggable,
      onSelect: selectEl,
      nodeRef: setRef(el.id),
    };

    switch (el.type) {
      case "text":
        return (
          <TextElementNode
            key={el.id}
            el={el as TextElement}
            hidden={el.id === editingTextId}
            onDoubleClick={() => startInlineEdit(el as TextElement)}
            {...commonProps}
            onChange={patchFn as any}
          />
        );
      case "image":
        return (
          <ImageElementNode
            key={el.id}
            el={el as IElement}
            {...commonProps}
            onChange={patchFn as any}
          />
        );
      case "qrcode":
        return (
          <QRCodeElementNode
            key={el.id}
            el={el as QElement}
            {...commonProps}
            onChange={patchFn as any}
          />
        );
      case "rect":
        return (
          <RectNode
            key={el.id}
            el={el as RectElement}
            {...commonProps}
            onChange={patchFn as any}
          />
        );
      case "circle":
        return (
          <CircleNode
            key={el.id}
            el={el as CircleElement}
            {...commonProps}
            onChange={patchFn as any}
          />
        );
      case "line":
        return (
          <LineNode
            key={el.id}
            el={el as LineElement}
            {...commonProps}
            onChange={patchFn as any}
          />
        );
      default:
        return null;
    }
  };

  const gridLines = useMemo(() => {
    if (!showGrid || !labelW) return null;
    const lines: ReactElement[] = [];
    for (let x = gridSize; x < labelW; x += gridSize) {
      lines.push(
        <Rect
          key={`gx${x}`}
          x={x}
          y={0}
          width={1}
          height={labelH}
          fill="#e5e7eb"
          opacity={0.35}
          listening={false}
        />
      );
    }
    for (let y = gridSize; y < labelH; y += gridSize) {
      lines.push(
        <Rect
          key={`gy${y}`}
          x={0}
          y={y}
          width={labelW}
          height={1}
          fill="#e5e7eb"
          opacity={0.35}
          listening={false}
        />
      );
    }
    return lines;
  }, [showGrid, gridSize, labelW, labelH]);

  // QR tooltips — positioned via direct DOM manipulation so they track
  // the QR node at 60fps during drag without waiting for React re-renders.
  const qrTooltipRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const setQRTooltipPos = (
    id: string,
    elX: number,
    elY: number,
    elW: number,
    elH: number
  ) => {
    const tip = qrTooltipRefs.current[id];
    const stage = stageRef.current;
    const wrapper = wrapperRef.current;
    if (!tip || !stage || !wrapper) return;
    const stageBox = stage.container().getBoundingClientRect();
    const wrapperBox = wrapper.getBoundingClientRect();
    const originX = stageBox.left - wrapperBox.left;
    const originY = stageBox.top - wrapperBox.top;
    const side = Math.min(elW, elH);
    const left = originX + (elX + side / 2) * scale;
    const top = originY + (elY + side + 6) * scale;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };

  // Reposition tooltips whenever scale/layout/doc changes (non-drag updates)
  useLayoutEffect(() => {
    if (!doc) return;
    doc.elements
      .filter((e) => e.type === "qrcode" && selectedIds.includes(e.id))
      .forEach((e) => {
        setQRTooltipPos(e.id, e.x, e.y, e.width, e.height);
      });
  });

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted">
        No label selected.
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 overflow-hidden bg-bg"
      style={{ minHeight: 0 }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        <div
          className="shadow-2xl"
          style={{
            width: labelW * scale,
            height: labelH * scale,
            background: "white",
          }}
        >
          <Stage
            ref={stageRef}
            width={labelW * scale}
            height={labelH * scale}
            scale={{ x: scale, y: scale }}
            onMouseDown={handleStageMouseDown as any}
            onTouchStart={handleStageMouseDown as any}
          >
            <Layer onDragMove={onAnyDragMove} onDragEnd={onAnyDragEnd}>
              <Rect
                x={0}
                y={0}
                width={labelW}
                height={labelH}
                fill={doc.background || "#ffffff"}
                listening
                name="isBackground"
              />
              {doc.backgroundImage && (
                <BackgroundImage
                  src={doc.backgroundImage}
                  width={labelW}
                  height={labelH}
                />
              )}
              {gridLines}
              {doc.elements.map(renderElement)}
              {showGuides && (
                <AlignmentGuides
                  guides={guides}
                  width={labelW}
                  height={labelH}
                />
              )}
              <Transformer
                ref={trRef}
                rotateEnabled
                anchorSize={8}
                anchorStroke="#3b82f6"
                anchorFill="#ffffff"
                borderStroke="#3b82f6"
                borderDash={[4, 4]}
                keepRatio={false}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 8 || newBox.height < 8) return oldBox;
                  return newBox;
                }}
              />
              <Rect
                x={0}
                y={0}
                width={labelW}
                height={labelH}
                stroke="#94a3b8"
                strokeWidth={1 / scale}
                listening={false}
                dash={[6 / scale, 4 / scale]}
              />
            </Layer>
          </Stage>
        </div>
      </div>

      {/* QR tooltips overlay — positioned via refs during drag */}
      {doc.elements
        .filter((e) => e.type === "qrcode" && selectedIds.includes(e.id))
        .map((e) => {
          const q = e as QElement;
          const href = q.value?.trim() || "";
          return (
            <a
              key={`tt-${q.id}`}
              ref={(node) => {
                qrTooltipRefs.current[q.id] = node;
              }}
              href={href || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute -translate-x-1/2 text-xs px-2 py-1 rounded border shadow transition hover:ring-2 hover:ring-accent z-20"
              style={{
                background: href ? "rgba(22, 25, 32, 0.95)" : "#7f1d1d",
                color: "#fff",
                borderColor: href ? "#363c48" : "#ef4444",
                maxWidth: 240,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                pointerEvents: href ? "auto" : "none",
                cursor: href ? "pointer" : "default",
              }}
              onMouseDown={(ev) => ev.stopPropagation()}
              onClick={(ev) => {
                if (!href) ev.preventDefault();
              }}
              title={href ? "Open link in new tab" : "No link assigned"}
            >
              {href ? `🔗 ${href}` : "⚠ No link assigned"}
            </a>
          );
        })}

      {/* Inline text editor */}
      {editingRect && editingTextId && (
        <textarea
          autoFocus
          defaultValue={editingRect.initial}
          onBlur={(e) => finishInlineEdit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              finishInlineEdit();
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              finishInlineEdit((e.target as HTMLTextAreaElement).value);
            }
          }}
          style={{
            position: "absolute",
            left: editingRect.left,
            top: editingRect.top,
            width: editingRect.width,
            minHeight: editingRect.height,
            fontSize: editingRect.fontSize,
            fontFamily: editingRect.fontFamily,
            color: editingRect.color,
            fontWeight: editingRect.bold ? 700 : 400,
            fontStyle: editingRect.italic ? "italic" : "normal",
            textDecoration: editingRect.underline ? "underline" : "none",
            textAlign: editingRect.align,
            lineHeight: editingRect.lineHeight,
            letterSpacing: `${editingRect.letterSpacing}px`,
            transform: `rotate(${editingRect.rotation}deg)`,
            transformOrigin: "top left",
            background: "rgba(255,255,255,0.98)",
            border: "2px solid #3b82f6",
            outline: "none",
            resize: "none",
            padding: "2px 4px",
            zIndex: 20,
            overflow: "hidden",
          }}
        />
      )}

      <div className="absolute bottom-3 right-3 text-xs text-muted bg-surface/90 border border-border rounded px-2 py-1">
        {Math.round(scale * 100)}% · {doc.size.widthIn}" × {doc.size.heightIn}"
        · {labelW}×{labelH}px @300DPI
      </div>
    </div>
  );
});

export default Canvas;
