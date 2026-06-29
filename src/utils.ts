import { translateKeycode } from './keycodes';

// ── Label formatting maps ────────────────────────────────────────────────────
export const ABBREV_MAP = {
  'Backspace': 'Bksp', 'Space': 'Spc', 'Enter': 'Ent',
  'Delete': 'Del', 'Insert': 'Ins', 'Shift': 'Shft',
  'Play/Pause': 'Play', 'PgUp': 'PgUp', 'PgDn': 'PgDn',
  'Scroll': 'Scrl', 'Pause': 'Paus',
};

export const EMOJI_MAP = {
  'Space': '⎵', 'Backspace': '⌫', 'Enter': '↵', 'Tab': '⇥',
  'Shift': '⇧', 'Caps': '⇪', 'GUI': '⌘', 'Delete': '⌦',
  'Esc': '⎋', 'Vol+': '🔊', 'Vol-': '🔉', 'Mute': '🔇',
  'Play/Pause': '⏯', 'Next': '⏭', 'Prev': '⏮',
  'PrtSc': '📷', 'Home': '⇱', 'End': '⇲',
  'PgUp': '⇞', 'PgDn': '⇟', '▽': '▽',
};

export function formatLabel(label, mode) {
  if (!label) return label;
  // Only transform the first line (for tap/mod labels that have \n)
  const lines = label.split('\n');
  const first = lines[0];
  if (mode === 'abbrev') lines[0] = ABBREV_MAP[first] ?? first;
  else if (mode === 'emoji') lines[0] = EMOJI_MAP[first] ?? first;
  return lines.join('\n');
}

export function solveCatmullRom(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[0];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || pts[i + 1];
    
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function getTargetLayer(code, numLayers) {
  if (!code || typeof code !== 'string') return null;
  const m = code.match(/(?:MO|TO|TG|TT|DF|OSL|LT|LT\d*)\(?(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1]);
  return n < numLayers ? n : null;
}

export function comboKeyLabel(k) {
  if (!k || k === 'KC_NO') return null;
  return translateKeycode(k).label || k;
}
