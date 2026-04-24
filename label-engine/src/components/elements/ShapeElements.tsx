import React from "react";
import { Rect, Ellipse, Line } from "react-konva";
import type {
  CircleElement,
  LineElement,
  RectElement,
} from "../../types";

type AnyShape = RectElement | CircleElement | LineElement;
interface Props<T extends AnyShape> {
  el: T;
  draggable: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<T>, commit?: boolean) => void;
  nodeRef?: React.Ref<any>;
}

function baseHandlers<T extends AnyShape>(
  el: T,
  onSelect: () => void,
  onChange: (patch: Partial<T>, commit?: boolean) => void
) {
  return {
    onMouseDown: onSelect,
    onTap: onSelect,
    onDragMove: (e: any) =>
      onChange({ x: e.target.x(), y: e.target.y() } as Partial<T>, false),
    onDragEnd: (e: any) =>
      onChange({ x: e.target.x(), y: e.target.y() } as Partial<T>, true),
    onTransform: (e: any) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const newWidth = Math.max(4, el.width * scaleX);
      const newHeight = Math.max(4, el.height * scaleY);
      node.scaleX(1);
      node.scaleY(1);
      onChange(
        {
          x: node.x(),
          y: node.y(),
          width: newWidth,
          height: newHeight,
          rotation: node.rotation(),
        } as Partial<T>,
        false
      );
    },
    onTransformEnd: () => onChange({} as Partial<T>, true),
  };
}

export function RectNode({
  el,
  draggable,
  onSelect,
  onChange,
  nodeRef,
}: Props<RectElement>) {
  return (
    <Rect
      ref={nodeRef}
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={el.opacity}
      fill={el.fill}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      cornerRadius={el.cornerRadius}
      draggable={draggable}
      {...baseHandlers(el, onSelect, onChange)}
    />
  );
}

export function CircleNode({
  el,
  draggable,
  onSelect,
  onChange,
  nodeRef,
}: Props<CircleElement>) {
  return (
    <Ellipse
      ref={nodeRef}
      id={el.id}
      x={el.x + el.width / 2}
      y={el.y + el.height / 2}
      radiusX={el.width / 2}
      radiusY={el.height / 2}
      rotation={el.rotation}
      opacity={el.opacity}
      fill={el.fill}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      draggable={draggable}
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragMove={(e) =>
        onChange(
          { x: e.target.x() - el.width / 2, y: e.target.y() - el.height / 2 },
          false
        )
      }
      onDragEnd={(e) =>
        onChange(
          { x: e.target.x() - el.width / 2, y: e.target.y() - el.height / 2 },
          true
        )
      }
      onTransform={(e) => {
        const node = e.target as any;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const newWidth = Math.max(4, el.width * scaleX);
        const newHeight = Math.max(4, el.height * scaleY);
        node.scaleX(1);
        node.scaleY(1);
        onChange(
          {
            x: node.x() - newWidth / 2,
            y: node.y() - newHeight / 2,
            width: newWidth,
            height: newHeight,
            rotation: node.rotation(),
          },
          false
        );
      }}
      onTransformEnd={() => onChange({}, true)}
    />
  );
}

export function LineNode({
  el,
  draggable,
  onSelect,
  onChange,
  nodeRef,
}: Props<LineElement>) {
  return (
    <Line
      ref={nodeRef}
      id={el.id}
      x={el.x}
      y={el.y}
      points={[0, el.height / 2, el.width, el.height / 2]}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      rotation={el.rotation}
      opacity={el.opacity}
      draggable={draggable}
      hitStrokeWidth={Math.max(10, el.strokeWidth + 6)}
      {...baseHandlers(el, onSelect, onChange)}
    />
  );
}
