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

// Solid pink guides — both center and edge alignments.
export default function AlignmentGuides({ guides, width, height }: Props) {
  const stroke = "#ec4899"; // pink-500
  return (
    <>
      {guides.map((g, i) => {
        if (g.orientation === "V") {
          return (
            <Line
              key={i}
              points={[g.coord, 0, g.coord, height]}
              stroke={stroke}
              strokeWidth={1}
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
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}
    </>
  );
}
