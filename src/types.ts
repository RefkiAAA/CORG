/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CardShape = 'box' | 'box-d' | 'box-2' | 'para' | 'para-d' | 'para-2';
export type CardStatus = 'terisi' | 'kosong' | 'rekrut' | '';
export type LineStyle = 'elbow' | 'straight' | 'curve';
export type BranchPoint = 'parent' | 'child';
export type ToolMode = 'select' | 'link';

export interface CardColor {
  f: string; // fill
  s: string; // stroke
  t: string; // text
}

export interface Card {
  id: string;
  l: number; // lane index
  dx: number; // offset x in lane
  y: number; // offset y
  jab: string; // job title
  names: string[]; // employee names
  lv: number; // level index 1-10 (0 = unassigned)
  tr: 'S' | 'I' | ''; // S: Struktural, I: Individual Contributor
  customLv?: string; // custom typed level text
  c: CardColor;
  photo: string;
  st: CardStatus;
  grade?: string;
  shape?: CardShape;
  np?: boolean; // non-photo (staf/many names)
  cols?: number; // 1 or 2 columns for names
  note?: string;
  lock?: boolean;
  col?: boolean; // collapse / fold subordinates
}

export interface Lane {
  id: string;
  name: string;
  w: number; // width in px
  color?: string; // background color of swimlane (default #E6E6E6)
  lock?: boolean;
}

export type EdgeOrigin = 'front' | 'back';
export type EdgeEntry = 'front' | 'back';

export interface Edge {
  id: string;
  from: string;
  to: string;
  dash?: boolean;
  sdy?: number; // vertical shift of starting point on source card
  sdx?: number; // horizontal shift of starting point on source card
  tdy?: number; // vertical shift of target point on target card
  tdx?: number; // horizontal shift of target point on target card
  origin?: EdgeOrigin; // 'front' (Depan / kanan) or 'back' (Belakang / kiri). Default: 'front'
  entry?: EdgeEntry;   // 'front' (Depan / kanan) or 'back' (Belakang / kiri).
}

export type LegendShapeType =
  | 'box'
  | 'box-rounded'
  | 'box-double'
  | 'box-dash'
  | 'para'
  | 'diamond'
  | 'line-solid'
  | 'line-thick'
  | 'line-dash'
  | 'line-dot'
  | 'circle-green'
  | 'circle-amber'
  | 'circle-blue'
  | 'circle-red'
  | 'circle-purple'
  | 'badge';

export interface LegendCustomRow {
  id: string;
  shape: LegendShapeType;
  label: string;
  color?: string;
  visible?: boolean;
}

export interface AnnotationItem {
  id: string;
  t: 'text' | 'frame' | 'legend';
  x: number;
  y: number;
  w: number;
  h?: number;
  text?: string;
  fs?: number; // font size
  b?: boolean; // bold
  k?: number; // color index

  // Legend section visibility checklist toggles
  showTitle?: boolean;         // Judul "Legenda Bagan"
  showStructuralLv?: boolean;   // Jenjang Karier Struktural
  showIcLv?: boolean;           // Jenjang Karier Individual Contributor (IC)
  showCardShapes?: boolean;     // Bentuk Kartu
  showLineStyles?: boolean;     // Gaya Garis
  showPositionStatus?: boolean; // Status Posisi
  showHeadcountInfo?: boolean;  // Informasi Total Headcount
  showGradeInfo?: boolean;      // Informasi Grade Jabatan
  showCustomItems?: boolean;    // Item Kustom Tambahan

  // Individual sub-item visibility checkboxes
  showShapeBox?: boolean;
  showShapePara?: boolean;
  showShapeDash?: boolean;
  showLineSolid?: boolean;
  showLineDash?: boolean;
  showStatusTerisi?: boolean;
  showStatusKosong?: boolean;
  showStatusRekrut?: boolean;

  // Custom Shapes (Bentuk)
  shapeBoxType?: LegendShapeType;
  shapeParaType?: LegendShapeType;
  shapeDashType?: LegendShapeType;
  lineSolidType?: LegendShapeType;
  lineDashType?: LegendShapeType;

  // Custom Naming (Penamaan)
  structuralText?: string;
  icText?: string;
  shapeBoxLabel?: string;
  shapeParaLabel?: string;
  shapeDashLabel?: string;
  lineSolidLabel?: string;
  lineDashLabel?: string;
  statusTerisiLabel?: string;
  statusKosongLabel?: string;
  statusRekrutLabel?: string;
  hcLabel?: string;
  gradeLabel?: string;

  // Custom manual rows
  customRows?: LegendCustomRow[];
}

export interface Page {
  id: string;
  name: string;
  title?: string;
  H: number; // minimum page height
  lanes: Lane[];
  cards: Card[];
  edges: Edge[];
  items?: AnnotationItem[];
  ls?: LineStyle;
  arrow?: boolean;
  auto?: boolean; // auto layout on change
  br?: BranchPoint;
  edgeOrigin?: EdgeOrigin; // Default origin for lines on this page ('front' by default)
  edgeEntry?: EdgeEntry;   // Default entry direction for lines on this page
  grid?: boolean;
  hc?: string;
  font?: string;
  showHc?: boolean; // toggle to show/hide headcount row at the bottom of lanes
}

export interface TemplateCard {
  n: string;
  jab: string;
  names: string[];
  c?: CardColor;
  st?: CardStatus;
  grade?: string;
  shape?: CardShape;
  np?: boolean;
  cols?: number;
  lv?: number;
  tr?: 'S' | 'I' | '';
  customLv?: string;
}

export interface ProjectState {
  cur: number;
  compact?: boolean;
  paper?: 'A4' | 'A3' | 'A2';
  orient?: 'landscape' | 'portrait';
  tpl: TemplateCard[];
  pages: Page[];
}

export interface VersionSnapshot {
  name: string;
  t: number;
  d: string; // serialized pages JSON
}
