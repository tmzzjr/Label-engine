import React from "react";
import { Image as KImage } from "react-konva";
import useImage from "use-image";
import type { ImageElement as IE } from "../../types";

interface Props {
  el: IE;
  draggable: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<IE>, commit?: boolean) => void;
  nodeRef?: React.Ref<any>;
}

export default function ImageElementNode({
  el,
  draggable,
  onSelect,
  onChange,
  nodeRef,
}: Props) {
  const [img] = useImage(el.src, "anonymous");
  return (
    <KImage
      ref={nodeRef}
      id={el.id}
      image={img as any}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={el.opacity}
      draggable={draggable}
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragMove={(e) => onChange({ x: e.target.x(), y: e.target.y() }, false)}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() }, true)}
      onTransform={(e) => {
        const node = e.target as any;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        let newWidth = Math.max(10, node.width() * scaleX);
        let newHeight = Math.max(10, node.height() * scaleY);
        if (el.keepAspect && el.naturalWidth && el.naturalHeight) {
          const aspect = el.naturalWidth / el.naturalHeight;
          if (Math.abs(scaleX - 1) > Math.abs(scaleY - 1)) {
            newHeight = newWidth / aspect;
          } else {
            newWidth = newHeight * aspect;
          }
        }
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
