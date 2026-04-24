// Core domain types for the Label Engine editor.

export type ElementType =
  | "text"
  | "image"
  | "qrcode"
  | "rect"
  | "circle"
  | "line";

export type TextAlign = "left" | "center" | "right";
export type QRErrorLevel = "L" | "M" | "Q" | "H";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // top-left in px (canvas coords)
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  opacity: number; // 0..1
  locked?: boolean;
  visible?: boolean;
  // Semantic field key used by CreateLabelModal to auto-fill values.
  field?:
    | "productName"
    | "sku"
    | "lot"
    | "mfgDate"
    | "expDate"
    | "qrLink"
    | "notes"
    | null;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fill: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
  lineHeight: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string; // dataURL
  keepAspect: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
}

export interface QRCodeElement extends BaseElement {
  type: "qrcode";
  value: string;
  errorLevel: QRErrorLevel;
  fg: string;
  bg: string;
}

export interface RectElement extends BaseElement {
  type: "rect";
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface CircleElement extends BaseElement {
  type: "circle";
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface LineElement extends BaseElement {
  type: "line";
  stroke: string;
  strokeWidth: number;
}

export type LabelElement =
  | TextElement
  | ImageElement
  | QRCodeElement
  | RectElement
  | CircleElement
  | LineElement;

export interface LabelSize {
  widthIn: number;
  heightIn: number;
  name?: string;
}

export interface LabelDocument {
  id: string;
  name: string;
  size: LabelSize;
  background: string;
  backgroundImage?: string; // dataURL (template image)
  elements: LabelElement[];
}

export interface SavedTemplate {
  id: string;
  name: string;
  doc: LabelDocument;
  createdAt: number;
  thumbnail?: string;
}

export interface CreateLabelForm {
  productName: string;
  sku: string;
  lot: string;
  mfgDate: string;
  expDate: string;
  qrLink: string;
  notes: string;
}

export const DPI = 300;
export const inToPx = (inches: number) => Math.round(inches * DPI);
export const pxToIn = (px: number) => px / DPI;

export const STANDARD_SIZES: LabelSize[] = [
  { widthIn: 0.75, heightIn: 1.75, name: '0.75" × 1.75"' },
  { widthIn: 0.75, heightIn: 1.875, name: '0.75" × 1.875"' },
];
