// Core domain types.

export type ElementType =
  | "text"
  | "image"
  | "qrcode"
  | "rect"
  | "circle"
  | "line";

export type TextAlign = "left" | "center" | "right";
export type QRErrorLevel = "L" | "M" | "Q" | "H";

export type FieldKey =
  | "productName"
  | "sku"
  | "lot"
  | "mfgDate"
  | "expDate"
  | "concentration"
  | "qrLink"
  | "inventoryQr"
  | "notes"
  | null;

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  visible?: boolean;
  field?: FieldKey;
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
  letterSpacing: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
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

export interface CutGuide {
  id: string;
  inset: number;
}

export interface LabelDocument {
  id: string;
  name: string;
  size: LabelSize;
  background: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  backgroundVisible?: boolean;
  elements: LabelElement[];
  cutGuides?: CutGuide[];
}

export interface SavedLabel {
  id: string;
  name: string;
  doc: LabelDocument;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  labels: SavedLabel[];
  createdAt: number;
  thumbnail?: string;
}

export interface CreateLabelForm {
  productName: string;
  sku: string;
  lot: string;
  mfgDate: string;
  expDate: string;
  concentration: string;
  qrLink: string;
  inventoryQrLink: string;
  notes: string;
}

export const DPI = 300;
export const inToPx = (inches: number) => Math.round(inches * DPI);
export const pxToIn = (px: number) => px / DPI;

export const STANDARD_SIZES: LabelSize[] = [
  { widthIn: 1.75, heightIn: 0.75, name: '1.75" × 0.75"' },
  { widthIn: 1.875, heightIn: 0.75, name: '1.875" × 0.75"' },
];
