import React, { useEffect, useState } from "react";
import { Image as KImage, Rect, Text } from "react-konva";
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
  const empty = !el.value || !el.value.trim();

  useEffect(() => {
    if (empty) {
      setImg(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(el.value, {
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
  }, [el.value, el.errorLevel, el.fg, el.bg, empty]);

  const side = Math.min(el.width, el.height);

  const shared = {
    ref: nodeRef,
    id: el.id,
    x: el.x,
    y: el.y,
    width: side,
    height: side,
    rotation: el.rotation,
    opacity: el.opacity,
    draggable,
    onMouseDown: onSelect,
    onTap: onSelect,
    onDragMove: (e: any) =>
      onChange({ x: e.target.x(), y: e.target.y() }, false),
    onDragEnd: (e: any) =>
      onChange({ x: e.target.x(), y: e.target.y() }, true),
    onTransform: (e: any) => {
      const node = e.target;
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
    },
    onTransformEnd: () => onChange({}, true),
  };

  if (empty) {
    // Red placeholder QR — signals missing link.
    return (
      <>
        <Rect
          {...shared}
          fill="#fee2e2"
          stroke="#ef4444"
          strokeWidth={2}
          cornerRadius={4}
        />
        <Text
          text={"QR\nno link"}
          x={el.x}
          y={el.y + side / 2 - 14}
          width={side}
          align="center"
          fontSize={Math.max(8, side * 0.15)}
          fontStyle="bold"
          fill="#b91c1c"
          listening={false}
          rotation={el.rotation}
        />
      </>
    );
  }

  return <KImage {...shared} image={img as any} />;
}
