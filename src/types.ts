export interface Theme {
  id: string;
  name: string;
  bg: string;
  keyAlpha: string;
  keyAlphaText: string;
  keyModifier: string;
  keyModifierText: string;
  keyAccent: string;
  keyAccentText: string;
  boardColor: string;
}

export interface ParsedKey {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  rx?: number;
  ry?: number;
  keycode?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Arrow {
  arrowId: string;
  layerIdx: number;
  targetIdx: number;
  color: string;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  p0: Point;
  p1: Point;
  p2: Point;
}

export interface SnapGuide {
  type: 'v' | 'h';
  x?: number;
  y?: number;
  y1?: number;
  y2?: number;
  x1?: number;
  x2?: number;
}

export type DragState =
  | { type: 'pan'; sx: number; sy: number; ox: number; oy: number }
  | { type: 'layer'; layerIdx: number; sx: number; sy: number; ox: number; oy: number }
  | { type: 'arrowControl'; arrowId: string; pointIndex: number; sx: number; sy: number; ox: number; oy: number }
  | { type: 'pane'; sx: number; sy: number; ox: number; oy: number }
  | { type: 'printBox'; sx: number; sy: number; ox: number; oy: number }
  | { type: 'printBoxResize'; corner: 'tl' | 'tr' | 'bl' | 'br'; sx: number; sy: number; ox: number; oy: number; initialW: number; initialH: number };

export interface LayoutInfo {
  name: string;
  tappingTerm?: number;
  comboTerm?: number;
}

export interface Combo {
  idx: number;
  keys: string[];
  action: string;
}

export interface TapDance {
  idx: number;
  tap: string;
  hold: string;
  doubleTap: string;
  tapHold: string;
  term: number;
}
