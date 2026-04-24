import React, { useEffect, useState } from "react";
import { Image as KImage } from "react-konva";
import QRCode from "qrcode";
import type { QRCodeElement as QE } from "../../types";

interface Props {
  el: QE;
  draggable: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<QE>, commit?: boolean) => void;
  nodeRef?: React.Ref<any>;
}

export default function QRCodeElementNode({
  el,
  draggable,
  onSelect,
  onChange,
  nodeRef,
}: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(el.value || " ", {
      errorCorrectionLevel: el.errorLevel,
      margin: 0,
      width: 512,
      color: { dark: el.fg, light: el.bg === "transparent" ? "#ffffff00" : el.bg },
    })
      .then((url) => {
        if (cancelled) return;
        const im = new Image();
        im.onload = () => !cancelled && setImg(im);
        im.src = url;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [el.value, el.errorLevel, el.fg, el.bg]);

  const side = Math.min(el.width, el.height);

  return (
    <KImage
      ref={nodeRef}
      id={el.id}
      image={img as any}
      x={el.x}
      y={el.y}
      width={side}
      height={side}
      rotation={el.rotation}
      opacity={el.opacity}
      draggable={draggable}
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragMove={(e) => onChange({ x: e.target.x(), y: e.target.y() }, false)}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() }, true)}
      onTransform={(e) => {
        const node = e.target as any;
        const s = Math.max(node.scaleX(), node.scaleY());
        const newSide = Math.max(16, side * s);
        node.scaleX(1);
        node.scaleY(1);
        onChange(
          {
            x: node.x(),
            y: node.y(),
            width: newSide,
            height: newSide,
            rotation: node.rotation(),
          },
          false
        );
      }}
      onTransformEnd={() => onChange({}, true)}
    />
  );
}
