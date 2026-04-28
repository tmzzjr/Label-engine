import React, {
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
  CutGuide,
} from "../types";
import { inToPx } from "../types";
import { useStore } from "../store";
import { uid } from "../utils";
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
const RULER_HEIGHT = 24;
const DPI = 300;

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
  opacity,
}: {
  src: string;
  width: number;
  height: number;
  opacity: number;
}) {
  const [img] = useImage(src, "anonymous");
  if (!img) return null;
  const nw = (img as HTMLImageElement).naturalWidth || width;
  const nh = (img as HTMLImageElement).naturalHeight || height;
  const ratio = Math.min(width / nw, height / nh);
  const w = nw * ratio;
  const h = nh * ratio;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  return (
    <KImage
      image={img as any}
      x={x}
      y={y}
      width={w}
      height={h}
      opacity={opacity}
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
    setDoc,
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
    const sy = (containerSize.h - RULER_HEIGHT - pad) / labelH;
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

  const [marquee, setMarquee] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const [guidePreview, setGuidePreview] = useState<number | null>(null);
  const guideDrag = useRef<{
    mode: "create" | "move";
    id: string | null;
  } | null>(null);
  const marqueeStart = useRef<{
    x: number;
    y: number;
    additive: boolean;
    baseSelection: string[];
  } | null>(null);

  const handleStageMouseDown = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) => {
    const tgt: any = e.target;
    const isBg =
      tgt === tgt.getStage() ||
      (typeof tgt.name === "function" && tgt.name() === "isBackground");
    if (!isBg) return;
    const stage = stageRef.current;
    const p = stage?.getPointerPosition();
    if (!p) {
      setSelection([]);
      return;
    }
    const x = p.x / scale;
    const y = p.y / scale;
    const shift = !!(e.evt as MouseEvent)?.shiftKey;
    marqueeStart.current = {
      x,
      y,
      additive: shift,
      baseSelection: shift ? [...selectedIds] : [],
    };
    setMarquee({ x1: x, y1: y, x2: x, y2: y });
  };

  const handleStageMouseMove = () => {
    if (!marqueeStart.current) return;
    const stage = stageRef.current;
    const p = stage?.getPointerPosition();
    if (!p) return;
    const x = p.x / scale;
    const y = p.y / scale;
    setMarquee({
      x1: marqueeStart.current.x,
      y1: marqueeStart.current.y,
      x2: x,
      y2: y,
    });
  };

  const handleStageMouseUp = () => {
    if (!marqueeStart.current || !marquee) {
      marqueeStart.current = null;
      setMarquee(null);
      return;
    }
    const start = marqueeStart.current;
    const left = Math.min(marquee.x1, marquee.x2);
    const right = Math.max(marquee.x1, marquee.x2);
    const top = Math.min(marquee.y1, marquee.y2);
    const bottom = Math.max(marquee.y1, marquee.y2);
    const dragged = right - left > 2 || bottom - top > 2;
    if (!dragged) {
      // treat as a click on background → clear selection unless shift
      if (!start.additive) setSelection([]);
    } else if (doc) {
      const inside = doc.elements
        .filter((el) => {
          if (el.locked || el.visible === false) return false;
          return (
            el.x < right &&
            el.x + el.width > left &&
            el.y < bottom &&
            el.y + el.height > top
          );
        })
        .map((el) => el.id);
      if (start.additive) {
        const next = new Set(start.baseSelection);
        inside.forEach((id) => next.add(id));
        setSelection(Array.from(next));
      } else {
        setSelection(inside);
      }
    }
    marqueeStart.current = null;
    setMarquee(null);
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

  const dragStartPositions = useRef<Record<
    string,
    { x: number; y: number }
  > | null>(null);

  const onAnyDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!doc) return;
    const id = e.target.id();
    if (!selectedIds.includes(id) || selectedIds.length < 2) return;
    const snap: Record<string, { x: number; y: number }> = {};
    selectedIds.forEach((sid) => {
      const el = doc.elements.find((x) => x.id === sid);
      if (el) snap[sid] = { x: el.x, y: el.y };
    });
    dragStartPositions.current = snap;
  };

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
    // Multi-drag: move all selected siblings together
    if (dragStartPositions.current && dragStartPositions.current[id]) {
      const start = dragStartPositions.current[id];
      const dx = node.x() - start.x;
      const dy = node.y() - start.y;
      const ids = selectedIds;
      const startMap = dragStartPositions.current;
      setDoc(
        (d) => ({
          ...d,
          elements: d.elements.map((el) => {
            if (el.id === id)
              return { ...el, x: node.x(), y: node.y() };
            if (!ids.includes(el.id)) return el;
            const sp = startMap[el.id];
            if (!sp) return el;
            return { ...el, x: sp.x + dx, y: sp.y + dy };
          }),
        }),
        false
      );
      // Mirror the new position on sibling Konva nodes for instant feedback
      ids.forEach((sid) => {
        if (sid === id) return;
        const otherNode = nodeRefs.current[sid];
        const sp = startMap[sid];
        if (otherNode && sp) {
          otherNode.x(sp.x + dx);
          otherNode.y(sp.y + dy);
        }
      });
    }
    // Keep QR tooltip glued to the moving QR in real-time (bypass React)
    if (moving.type === "qrcode") {
      setQRTooltipPos(id, node.x(), node.y(), moving.width, moving.height);
    }
  };
  const onAnyDragEnd = () => {
    setGuides([]);
    commit();
    dragStartPositions.current = null;
  };

  const setRef = (id: string) => (node: Konva.Node | null) => {
    if (node) nodeRefs.current[id] = node;
    else delete nodeRefs.current[id];
  };

  // Ruler / cut-guide drag flow. The cut margin is a single inset value applied
  // symmetrically to all 4 sides; dragging any side recomputes inset from that
  // side's perpendicular distance to the canvas edge.
  const startGuideDrag = (
    mode: "create" | "move",
    side: "top" | "bottom" | "left" | "right",
    id: string | null,
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.preventDefault();
    guideDrag.current = { mode, id };
    let lastInset = 0;
    let lastRemove = false;
    const onMove = (ev: MouseEvent | TouchEvent) => {
      const stage = stageRef.current;
      if (!stage) return;
      const box = stage.container().getBoundingClientRect();
      const cx =
        "touches" in ev ? ev.touches[0]?.clientX : (ev as MouseEvent).clientX;
      const cy =
        "touches" in ev ? ev.touches[0]?.clientY : (ev as MouseEvent).clientY;
      if (cx === undefined || cy === undefined) return;
      const xLabel = (cx - box.left) / scale;
      const yLabel = (cy - box.top) / scale;
      let raw: number;
      if (side === "top") raw = yLabel;
      else if (side === "bottom") raw = labelH - yLabel;
      else if (side === "left") raw = xLabel;
      else raw = labelW - xLabel;
      const cap = Math.min(labelW, labelH) / 2;
      lastRemove = raw < 0;
      lastInset = Math.max(0, Math.min(raw, cap));
      setGuidePreview(lastInset);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      const drag = guideDrag.current;
      guideDrag.current = null;
      setGuidePreview(null);
      if (!drag || !doc) return;
      if (drag.mode === "create") {
        if (lastRemove || lastInset <= 0) return;
        const newGuide: CutGuide = { id: uid(), inset: lastInset };
        setDoc((d) => ({
          ...d,
          cutGuides: [...(d.cutGuides ?? []), newGuide],
        }));
      } else if (drag.id) {
        if (lastRemove) {
          setDoc((d) => ({
            ...d,
            cutGuides: (d.cutGuides ?? []).filter((g) => g.id !== drag.id),
          }));
        } else {
          setDoc((d) => ({
            ...d,
            cutGuides: (d.cutGuides ?? []).map((g) =>
              g.id === drag.id ? { ...g, inset: lastInset } : g
            ),
          }));
        }
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
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
      const shift = !!e?.evt?.shiftKey;
      if (shift) {
        if (selectedIds.includes(el.id)) {
          setSelection(selectedIds.filter((id) => id !== el.id));
        } else {
          setSelection([...selectedIds, el.id]);
        }
      } else if (!selectedIds.includes(el.id)) {
        setSelection([el.id]);
      }
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
      className="relative flex-1 overflow-hidden bg-bg flex flex-col"
      style={{ minHeight: 0 }}
    >
      <div
        onMouseDown={(e) => startGuideDrag("create", "top", null, e)}
        onTouchStart={(e) => startGuideDrag("create", "top", null, e)}
        title="Drag down onto the design to add a cut margin"
        style={{
          height: RULER_HEIGHT,
          flexShrink: 0,
          background: "#0f172a",
          borderBottom: "1px solid #1f2937",
          cursor: "ns-resize",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          paddingLeft: 10,
          color: "#94a3b8",
          fontSize: 11,
          fontFamily: "system-ui",
          letterSpacing: 0.2,
        }}
      >
        Drag down to add a cut margin
      </div>
      <div
        className="relative flex-1"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
      <div
        className="absolute inset-0 flex items-center justify-center"
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
            onMouseMove={handleStageMouseMove as any}
            onTouchMove={handleStageMouseMove as any}
            onMouseUp={handleStageMouseUp as any}
            onTouchEnd={handleStageMouseUp as any}
          >
            <Layer
              onDragStart={onAnyDragStart}
              onDragMove={onAnyDragMove}
              onDragEnd={onAnyDragEnd}
            >
              <Rect
                x={0}
                y={0}
                width={labelW}
                height={labelH}
                fill={doc.background || "#ffffff"}
                listening
                name="isBackground"
              />
              {doc.backgroundImage && doc.backgroundVisible !== false && (
                <BackgroundImage
                  src={doc.backgroundImage}
                  width={labelW}
                  height={labelH}
                  opacity={doc.backgroundOpacity ?? 1}
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
              {marquee && (
                <Rect
                  x={Math.min(marquee.x1, marquee.x2)}
                  y={Math.min(marquee.y1, marquee.y2)}
                  width={Math.abs(marquee.x2 - marquee.x1)}
                  height={Math.abs(marquee.y2 - marquee.y1)}
                  fill="rgba(59,130,246,0.1)"
                  stroke="#3b82f6"
                  strokeWidth={1 / scale}
                  dash={[4 / scale, 3 / scale]}
                  listening={false}
                />
              )}
              {(doc.cutGuides ?? []).map((g) => {
                const ins = g.inset;
                const sw = 1 / scale;
                const dash = [6 / scale, 4 / scale] as [number, number];
                if (ins * 2 >= Math.min(labelW, labelH)) return null;
                return (
                  <React.Fragment key={g.id}>
                    {/* top */}
                    <Rect
                      x={ins}
                      y={ins - sw / 2}
                      width={labelW - ins * 2}
                      height={sw}
                      fill="#ef4444"
                      listening={false}
                      dash={dash}
                    />
                    {/* bottom */}
                    <Rect
                      x={ins}
                      y={labelH - ins - sw / 2}
                      width={labelW - ins * 2}
                      height={sw}
                      fill="#ef4444"
                      listening={false}
                      dash={dash}
                    />
                    {/* left */}
                    <Rect
                      x={ins - sw / 2}
                      y={ins}
                      width={sw}
                      height={labelH - ins * 2}
                      fill="#ef4444"
                      listening={false}
                      dash={dash}
                    />
                    {/* right */}
                    <Rect
                      x={labelW - ins - sw / 2}
                      y={ins}
                      width={sw}
                      height={labelH - ins * 2}
                      fill="#ef4444"
                      listening={false}
                      dash={dash}
                    />
                  </React.Fragment>
                );
              })}
              {guidePreview !== null &&
                (() => {
                  const ins = guidePreview;
                  const sw = 1 / scale;
                  const dash = [6 / scale, 4 / scale] as [number, number];
                  if (ins * 2 >= Math.min(labelW, labelH)) return null;
                  return (
                    <>
                      <Rect
                        x={ins}
                        y={ins - sw / 2}
                        width={labelW - ins * 2}
                        height={sw}
                        fill="#ef4444"
                        opacity={0.85}
                        listening={false}
                        dash={dash}
                      />
                      <Rect
                        x={ins}
                        y={labelH - ins - sw / 2}
                        width={labelW - ins * 2}
                        height={sw}
                        fill="#ef4444"
                        opacity={0.85}
                        listening={false}
                        dash={dash}
                      />
                      <Rect
                        x={ins - sw / 2}
                        y={ins}
                        width={sw}
                        height={labelH - ins * 2}
                        fill="#ef4444"
                        opacity={0.85}
                        listening={false}
                        dash={dash}
                      />
                      <Rect
                        x={labelW - ins - sw / 2}
                        y={ins}
                        width={sw}
                        height={labelH - ins * 2}
                        fill="#ef4444"
                        opacity={0.85}
                        listening={false}
                        dash={dash}
                      />
                    </>
                  );
                })()}
            </Layer>
          </Stage>
        </div>
        </div>
      </div>

      {/* Cut-guide hit overlays — 4 strips per guide for grabbing each side */}
      {(doc.cutGuides ?? []).map((g) => {
        const ins = g.inset;
        if (ins * 2 >= Math.min(labelW, labelH)) return null;
        const stageLeft = (containerSize.w - labelW * scale) / 2;
        const stageTop =
          RULER_HEIGHT +
          (containerSize.h - RULER_HEIGHT - labelH * scale) / 2;
        const innerW = (labelW - ins * 2) * scale;
        const innerH = (labelH - ins * 2) * scale;
        const sideThickness = 8;
        const tip = "Drag to move · drag past edge to remove";
        return (
          <React.Fragment key={`gh-${g.id}`}>
            <div
              onMouseDown={(e) => startGuideDrag("move", "top", g.id, e)}
              onTouchStart={(e) => startGuideDrag("move", "top", g.id, e)}
              title={tip}
              style={{
                position: "absolute",
                left: stageLeft + ins * scale,
                top: stageTop + ins * scale - sideThickness / 2,
                width: innerW,
                height: sideThickness,
                cursor: "ns-resize",
                zIndex: 10,
              }}
            />
            <div
              onMouseDown={(e) => startGuideDrag("move", "bottom", g.id, e)}
              onTouchStart={(e) => startGuideDrag("move", "bottom", g.id, e)}
              title={tip}
              style={{
                position: "absolute",
                left: stageLeft + ins * scale,
                top:
                  stageTop + (labelH - ins) * scale - sideThickness / 2,
                width: innerW,
                height: sideThickness,
                cursor: "ns-resize",
                zIndex: 10,
              }}
            />
            <div
              onMouseDown={(e) => startGuideDrag("move", "left", g.id, e)}
              onTouchStart={(e) => startGuideDrag("move", "left", g.id, e)}
              title={tip}
              style={{
                position: "absolute",
                left: stageLeft + ins * scale - sideThickness / 2,
                top: stageTop + ins * scale,
                width: sideThickness,
                height: innerH,
                cursor: "ew-resize",
                zIndex: 10,
              }}
            />
            <div
              onMouseDown={(e) => startGuideDrag("move", "right", g.id, e)}
              onTouchStart={(e) => startGuideDrag("move", "right", g.id, e)}
              title={tip}
              style={{
                position: "absolute",
                left:
                  stageLeft + (labelW - ins) * scale - sideThickness / 2,
                top: stageTop + ins * scale,
                width: sideThickness,
                height: innerH,
                cursor: "ew-resize",
                zIndex: 10,
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Size label during guide drag */}
      {guidePreview !== null &&
        (() => {
          const stageLeft = (containerSize.w - labelW * scale) / 2;
          const stageTop =
            RULER_HEIGHT +
            (containerSize.h - RULER_HEIGHT - labelH * scale) / 2;
          const px = guidePreview;
          const inches = px / DPI;
          const innerWin = Math.max(0, (labelW - 2 * px) / DPI);
          const innerHin = Math.max(0, (labelH - 2 * px) / DPI);
          return (
            <div
              style={{
                position: "absolute",
                left: stageLeft + (labelW * scale) / 2,
                top: stageTop - 30,
                transform: "translateX(-50%)",
                background: "#ef4444",
                color: "white",
                fontSize: 11,
                fontFamily: "system-ui",
                padding: "3px 10px",
                borderRadius: 4,
                pointerEvents: "none",
                zIndex: 20,
                whiteSpace: "nowrap",
                lineHeight: 1.3,
              }}
            >
              Margin {inches.toFixed(3)}″ ({px.toFixed(1)}px) · Area{" "}
              {innerWin.toFixed(3)}″ × {innerHin.toFixed(3)}″
            </div>
          );
        })()}

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
