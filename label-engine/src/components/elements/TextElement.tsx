import React from "react";
import { Text } from "react-konva";
import type { TextElement as TE } from "../../types";

interface Props {
  el: TE;
  draggable: boolean;
  hidden?: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<TE>, commit?: boolean) => void;
  onDoubleClick?: () => void;
  nodeRef?: React.Ref<any>;
}

export default function TextElementNode({
  el,
  draggable,
  hidden,
  onSelect,
  onChange,
  onDoubleClick,
  nodeRef,
}: Props) {
  const fontStyle =
    [el.italic ? "italic" : "", el.bold ? "bold" : ""]
      .filter(Boolean)
      .join(" ") || "normal";
  return (
    <Text
      ref={nodeRef}
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={hidden ? 0 : el.opacity}
      visible={!hidden}
      draggable={draggable}
      text={el.text}
      fontFamily={el.fontFamily}
      fontSize={el.fontSize}
      fontStyle={fontStyle}
      textDecoration={el.underline ? "underline" : ""}
      fill={el.fill}
      align={el.align}
      lineHeight={el.lineHeight}
      verticalAlign="top"
      wrap="word"
      onMouseDown={onSelect}
      onTap={onSelect}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
      onDragMove={(e) => onChange({ x: e.target.x(), y: e.target.y() }, false)}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() }, true)}
      onTransform={(e) => {
        const node = e.target as any;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const newWidth = Math.max(20, node.width() * scaleX);
        const newHeight = Math.max(12, node.height() * scaleY);
        node.scaleX(1);
        node.scaleY(1);
        onChange(
          {
            x: node.x(),
            y: node.y(),
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
