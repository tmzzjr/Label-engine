import { Line } from "react-konva";

export interface Guide {
  orientation: "V" | "H";
  coord: number;
  kind: "center" | "edge";
}

interface Props {
  guides: Guide[];
  width: number;
  height: number;
}

// Red = canvas center line, Blue = element-to-element alignment.
export default function AlignmentGuides({ guides, width, height }: Props) {
  return (
    <>
      {guides.map((g, i) => {
        const isCenter = g.kind === "center";
        const stroke = isCenter ? "#ef4444" : "#2563eb";
        if (g.orientation === "V") {
          return (
            <Line
              key={i}
              points={[g.coord, 0, g.coord, height]}
              stroke={stroke}
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
              perfectDrawEnabled={false}
            />
          );
        }
        return (
          <Line
            key={i}
            points={[0, g.coord, width, g.coord]}
            stroke={stroke}
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}
    </>
  );
}
