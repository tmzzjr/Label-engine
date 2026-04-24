import {
  forwardRef,
  useEffect,
  useImperativeHandle,
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

const SNAP_THRESHOLD = 4; // px

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

  const labelW = inToPx(doc.size.widthIn);
  const labelH = inToPx(doc.size.heightIn);

  // Fit-to-viewport scale
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
    if (!containerSize.w || !containerSize.h) return 1;
    const pad = 48;
    const sx = (containerSize.w - pad) / labelW;
    const sy = (containerSize.h - pad) / labelH;
    return Math.min(sx, sy, 3);
  }, [containerSize, labelW, labelH]);

  // Attach Transformer to selected nodes
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const nodes = selectedIds
      .map((id) => nodeRefs.current[id])
      .filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, doc.elements]);

  useImperativeHandle(ref, () => ({
    toDataURL: (pixelRatio = 1) =>
      stageRef.current?.toDataURL({
        pixelRatio,
        mimeType: "image/png",
        x: 0,
        y: 0,
        width: labelW * scale,
        height: labelH * scale,
      }) ?? "",
    getStage: () => stageRef.current,
  }));

  // Keyboard nudge handled in App — canvas handles background click to deselect.
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

  // Compute guides and apply snapping while dragging a single element.
  function computeGuides(
    moving: LabelElement,
    proposedX: number,
    proposedY: number
  ): { x: number; y: number; guides: Guide[] } {
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

    // Vertical guides (affect X position)
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

  // Hook into element drag via layer's dragmove
  const onAnyDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!showGuides) return;
    const node = e.target;
    const id = node.id();
    const moving = doc.elements.find((x) => x.id === id);
    if (!moving) return;
    const { x, y, guides } = computeGuides(moving, node.x(), node.y());
    if (x !== node.x() || y !== node.y()) {
      node.x(x);
      node.y(y);
    }
    setGuides(guides);
  };
  const onAnyDragEnd = () => {
    setGuides([]);
    commit();
  };

  const setRef = (id: string) => (node: Konva.Node | null) => {
    if (node) nodeRefs.current[id] = node;
    else delete nodeRefs.current[id];
  };

  const renderElement = (el: LabelElement) => {
    const draggable = !el.locked;
    const patchFn = (patch: Partial<LabelElement>, shouldCommit = true) =>
      updateElement(el.id, patch, shouldCommit);

    const selectEl = (e?: any) => {
      e?.cancelBubble !== undefined && (e.cancelBubble = true);
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
    if (!showGrid) return null;
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
          listening={false}
        />
      );
    }
    return lines;
  }, [showGrid, gridSize, labelW, labelH]);

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 overflow-hidden bg-brand-100"
      style={{ minHeight: 0 }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          backgroundImage:
            "radial-gradient(rgba(15,23,42,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        <div
          className="shadow-lg"
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
                anchorStroke="#2563eb"
                anchorFill="#ffffff"
                borderStroke="#2563eb"
                borderDash={[4, 4]}
                keepRatio={false}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 8 || newBox.height < 8) return oldBox;
                  return newBox;
                }}
              />
              {/* Label border */}
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

      {/* Scale indicator */}
      <div className="absolute bottom-3 right-3 text-xs text-brand-600 bg-white/90 border border-brand-200 rounded px-2 py-1">
        {Math.round(scale * 100)}% • {doc.size.widthIn}" × {doc.size.heightIn}"
        ({labelW}×{labelH}px @300DPI)
      </div>
    </div>
  );
});

export default Canvas;
