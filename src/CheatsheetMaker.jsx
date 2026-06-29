import React, { useState, useEffect, useRef } from 'react';
import { PRESETS } from './presets';
import { translateKeycode } from './keycodes';
import { parseKLE, mapLayersToLayout } from './kleParser';

// ── Themes ──────────────────────────────────────────────────────────────────
// All text/fill combos target ≥ 4.5:1 contrast (WCAG AA).
const THEMES = {
  mono_print: {
    id: 'mono_print', name: 'Ink-Saver B&W',
    // White background, white alphas, very light gray modifiers/accents, black outlines
    bg: '#ffffff',
    keyAlpha: '#ffffff',    keyAlphaText: '#000000',
    keyModifier: '#f3f4f6', keyModifierText: '#000000',
    keyAccent: '#e5e7eb',   keyAccentText: '#000000',
    boardColor: '#000000',
  },
  gmk_olivia: {
    id: 'gmk_olivia', name: 'GMK Olivia',
    // Light pinkish alphas on dark bg — high contrast throughout
    bg: '#1c1c1c',
    keyAlpha: '#f1e3dc',    keyAlphaText: '#1a1a1a',    // 14:1
    keyModifier: '#2a2a2a', keyModifierText: '#f1e3dc',  // 11:1
    keyAccent: '#eab8b1',   keyAccentText: '#1a1a1a',    // 9:1
    boardColor: '#0e0e0e',
  },
  gmk_laser: {
    id: 'gmk_laser', name: 'GMK Laser',
    // Deep teal alphas — readable off-white legend, hot-pink accent with white
    bg: '#0d0a1b',
    keyAlpha: '#005f73',    keyAlphaText: '#e0f7fa',     // 8:1  (light cyan on dark teal)
    keyModifier: '#1b1834', keyModifierText: '#00e5ff',  // 9:1  (bright cyan on near-black)
    keyAccent: '#ff007f',   keyAccentText: '#ffffff',    // 5.8:1
    boardColor: '#06040f',
  },
  gmk_carbon: {
    id: 'gmk_carbon', name: 'GMK Carbon',
    // Warm beige alphas, charcoal mods, orange accent with dark text for contrast
    bg: '#1e1e1e',
    keyAlpha: '#eae6df',    keyAlphaText: '#1c1c1c',     // 13:1
    keyModifier: '#3a3a3a', keyModifierText: '#f0a060',  // 6:1  (warm orange on charcoal)
    keyAccent: '#ff6600',   keyAccentText: '#1c1c1c',    // 6.5:1 (dark on orange — replaces white which was 4.3:1)
    boardColor: '#111111',
  },
  sleek_dark: {
    id: 'sleek_dark', name: 'Cyber Slate',
    // Navy alphas, slate mods, electric blue accent
    bg: '#0f172a',
    keyAlpha: '#1e293b',    keyAlphaText: '#f1f5f9',     // 13:1
    keyModifier: '#334155', keyModifierText: '#f1f5f9',  // 7.5:1 (bumped from #cbd5e1 which was 4.8:1)
    keyAccent: '#3b82f6',   keyAccentText: '#ffffff',    // 5.8:1
    boardColor: '#020617',
  },
  minimal_light: {
    id: 'minimal_light', name: 'Light',
    // White alphas on light board — dark text everywhere
    bg: '#f0f4f8',
    keyAlpha: '#ffffff',    keyAlphaText: '#0f172a',     // 19:1
    keyModifier: '#dde3ec', keyModifierText: '#1e293b',  // 10:1
    keyAccent: '#1e3a5f',   keyAccentText: '#ffffff',    // 12:1
    boardColor: '#c8d3df',
  },
  everforest: {
    id: 'everforest', name: 'Everforest',
    // Everforest Dark — authentic sainnhe/everforest palette
    bg: '#2d353b',
    keyAlpha: '#3d484d',    keyAlphaText: '#d3c6aa',     // 8:1  (warm off-white on forest surface)
    keyModifier: '#272e33', keyModifierText: '#83c092',  // 6.5:1 (aqua on dark bg)
    keyAccent: '#a7c080',   keyAccentText: '#1e2326',    // 9:1  (dark on sage green)
    boardColor: '#1e2326',
  },
};


// ── Label formatting maps ────────────────────────────────────────────────────
const ABBREV_MAP = {
  'Backspace': 'Bksp', 'Space': 'Spc', 'Enter': 'Ent',
  'Delete': 'Del', 'Insert': 'Ins', 'Shift': 'Shft',
  'Play/Pause': 'Play', 'PgUp': 'PgUp', 'PgDn': 'PgDn',
  'Scroll': 'Scrl', 'Pause': 'Paus',
};

const EMOJI_MAP = {
  'Space': '⎵', 'Backspace': '⌫', 'Enter': '↵', 'Tab': '⇥',
  'Shift': '⇧', 'Caps': '⇪', 'GUI': '⌘', 'Delete': '⌦',
  'Esc': '⎋', 'Vol+': '🔊', 'Vol-': '🔉', 'Mute': '🔇',
  'Play/Pause': '⏯', 'Next': '⏭', 'Prev': '⏮',
  'PrtSc': '📷', 'Home': '⇱', 'End': '⇲',
  'PgUp': '⇞', 'PgDn': '⇟', '▽': '▽',
};

function formatLabel(label, mode) {
  if (!label) return label;
  // Only transform the first line (for tap/mod labels that have \n)
  const lines = label.split('\n');
  const first = lines[0];
  if (mode === 'abbrev') lines[0] = ABBREV_MAP[first] ?? first;
  else if (mode === 'emoji') lines[0] = EMOJI_MAP[first] ?? first;
  return lines.join('\n');
}

function solveCatmullRom(pts) {
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

// ── Main Component ───────────────────────────────────────────────────────────
export default function CheatsheetMaker() {
  // Layout data
  const [parsedKeys, setParsedKeys]     = useState([]);
  const [parsedMatrix, setParsedMatrix] = useState({ rows: 10, cols: 6 });
  const [mappedLayers, setMappedLayers] = useState([]);
  const [fileName, setFileName]         = useState('');

  // Extras from .vil
  const [combos, setCombos]         = useState([]);   // active combos
  const [tapDances, setTapDances]   = useState([]);   // active tap dances

  // Preset / view
  const [selectedPreset, setSelectedPreset] = useState('split58');
  const [activeLayer, setActiveLayer]       = useState(null); // null = all

  // Style
  const [themeId, setThemeId]       = useState('everforest');
  const [unitSize, setUnitSize]     = useState(50);
  const [keyGap, setKeyGap]         = useState(3);
  const [radius, setRadius]         = useState(6);
  const [fontSize, setFontSize]     = useState(12);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [labelMode, setLabelMode]   = useState('default'); // 'default' | 'abbrev' | 'emoji'

  // Print layout — free-form canvas
  const [printMode, setPrintMode]     = useState(false);
  const [printOrientation, setPrintOrientation] = useState('landscape');
  const [printZoom, setPrintZoom]               = useState(1);
  const [layerPositions, setLayerPos] = useState({});   // {idx: {x,y}}
  const [arrowMidpoints, setArrowMidpoints] = useState({}); // {arrowId: [{x,y}, {x,y}, {x,y}]}
  const [hiddenLayers, setHiddenLayers]     = useState({});   // {layerIdx: boolean}
  const [viewOff, setViewOff]         = useState({ x: -40, y: -40 });
  const [svgDrag, setSvgDrag]         = useState(null); // null | {type,layerIdx?,sx,sy,ox,oy}
  const [snapGuides, setSnapGuides]             = useState([]);
  const [disableArrows, setDisableArrows]       = useState(false);
  const [colorLayerButtons, setColorLayerButtons] = useState(true);
  const svgRef  = useRef(null);
  const dragCTM = useRef(null); // frozen CTM at drag-start to avoid feedback
  const arrowsRef = useRef([]);

  // UI
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast]           = useState(null);
  const fileInputRef = useRef(null);

  const theme = THEMES[themeId];

  // Load Google Fonts once
  useEffect(() => {
    if (!document.getElementById('gf-cheatsheet')) {
      const l = document.createElement('link');
      l.id = 'gf-cheatsheet';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@400;600;700&family=Fira+Code:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap';
      document.head.appendChild(l);
    }
  }, []);

  // Rebuild coordinate keys when preset changes
  useEffect(() => {
    const preset = PRESETS[selectedPreset];
    if (!preset) return;
    setParsedKeys(parseKLE(preset.keymap));
    setParsedMatrix(preset.matrix);
  }, [selectedPreset]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Parse .vil file ────────────────────────────────────────────────────────
  const parseVilFile = (text, name) => {
    try {
      const data = JSON.parse(text);
      if (!data.layout || !Array.isArray(data.layout)) {
        showToast('error', 'Unrecognised format — expected a Vial .vil export.');
        return;
      }

      // Flatten each 2D layer; -1 entries are phantom matrix positions (no physical key)
      const flatLayers = data.layout.map(layer =>
        layer.flat().map(k => (k === -1 ? '__PHANTOM__' : k))
      );

      const numRows = data.layout[0].length;
      const numCols = data.layout[0][0]?.length ?? 6;
      const matrix  = { rows: numRows, cols: numCols };

      const presetKey = (numRows === 10 && numCols === 6) ? 'split58' : selectedPreset;
      setSelectedPreset(presetKey);

      const keys   = parseKLE(PRESETS[presetKey].keymap);
      const mapped = mapLayersToLayout(keys, flatLayers, matrix);

      setParsedKeys(keys);
      setParsedMatrix(matrix);
      setMappedLayers(mapped);
      setFileName(name);
      setActiveLayer(null);
      setPrintMode(false);

      // ── Parse combos ──
      if (data.combo) {
        const active = data.combo
          .map((c, i) => ({ idx: i, keys: c.slice(0, 4), action: c[4] }))
          .filter(c => c.action && c.action !== 'KC_NO' && c.keys.some(k => k && k !== 'KC_NO'));
        setCombos(active);
      }

      // ── Parse tap dances ──
      if (data.tap_dance) {
        const active = data.tap_dance
          .map((td, i) => ({
            idx: i,
            tap:       td[0], hold:     td[1],
            doubleTap: td[2], tapHold:  td[3],
            term:      td[4],
          }))
          .filter(td =>
            [td.tap, td.hold, td.doubleTap, td.tapHold].some(k => k && k !== 'KC_NO')
          );
        setTapDances(active);
      }

      showToast('success', `Loaded "${name}" — ${flatLayers.length} layers, ${keys.length} keys`);
    } catch (e) {
      showToast('error', 'Failed to parse file: ' + e.message);
    }
  };

  const handleFileInput = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => parseVilFile(e.target.result, file.name);
    reader.readAsText(file);
  };

  // ── SVG helpers ────────────────────────────────────────────────────────────
  const getDims = () => {
    if (!parsedKeys.length) return { w: 0, h: 0, pad: 0.5 };
    const pad  = 0.5;
    const maxX = Math.max(...parsedKeys.map(k => k.x + k.w));
    const maxY = Math.max(...parsedKeys.map(k => k.y + k.h));
    return { w: (maxX + pad * 2) * unitSize, h: (maxY + pad * 2) * unitSize, pad };
  };

  const keyStyle = (key) => {
    const code = key.keycode ?? '';
    if (code === '__PHANTOM__') return { invisible: true };

    const toLayer = getTargetLayer(code);
    const { type } = translateKeycode(code);

    if (colorLayerButtons && toLayer !== null) {
      const color = ARROW_COLORS[toLayer % 8];
      const isNested = (type === 'layertap' || type === 'modtap');
      return {
        fill: color,
        text: '#121212',
        nested: isNested
      };
    }

    switch (type) {
      case 'modifier': return { fill: theme.keyModifier, text: theme.keyModifierText };
      case 'layer':
      case 'accent':   return { fill: theme.keyAccent,   text: theme.keyAccentText };
      // Tap-hold keys → rendered as nested key-within-key
      case 'layertap': return { fill: theme.keyAccent,   text: theme.keyAccentText,   nested: true };
      case 'modtap':   return { fill: theme.keyModifier, text: theme.keyModifierText, nested: true };
      // Esc, Space, Enter, Tab → accent so they stand out from plain alphas
      case 'special':  return { fill: theme.keyAccent,   text: theme.keyAccentText };
      case 'trans':    return { fill: theme.bg, text: theme.keyAlphaText, dashed: true };
      case 'empty':    return { fill: theme.bg, text: theme.keyAlphaText, dashed: true };
      default:         return { fill: theme.keyAlpha,    text: theme.keyAlphaText };
    }
  };

  const renderSVG = (layerIdx, keys) => {
    const { w, h, pad } = getDims();
    return (
      <svg id={`layer-svg-${layerIdx}`} viewBox={`0 0 ${w} ${h}`} width="100%"
        style={{ maxHeight: 420, fontFamily, display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Board bezel */}
        <rect x={pad * unitSize - 10} y={pad * unitSize - 10}
          width={w - pad * 2 * unitSize + 20} height={h - pad * 2 * unitSize + 20}
          fill={theme.id === 'mono_print' ? '#ffffff' : theme.boardColor}
          stroke={theme.id === 'mono_print' ? '#000000' : 'none'}
          strokeWidth={theme.id === 'mono_print' ? 1.5 : 0}
          rx={radius + 6} ry={radius + 6} />

        {keys.map((key, i) => {
          const style = keyStyle(key);
          if (style.invisible) return null;

          const x = (key.x + pad) * unitSize;
          const y = (key.y + pad) * unitSize;
          const kw = key.w * unitSize;
          const kh = key.h * unitSize;
          const bx = x + keyGap / 2, by = y + keyGap / 2;
          const bw = kw - keyGap,    bh = kh - keyGap;

          const { label } = translateKeycode(key.keycode ?? '');
          const formatted = formatLabel(label, labelMode);
          const lines = (formatted ?? '').split('\n');

          const transform = key.r
            ? `rotate(${key.r} ${(key.rx + pad) * unitSize} ${(key.ry + pad) * unitSize})`
            : undefined;

          // ── Nested key-within-key for mod-tap / layer-tap ────────────────
          if (style.nested) {
            const tapLabel  = lines[0] ?? '';
            const holdLabel = (lines[1] ?? '').replace(/[()]/g, '');

            // Inner keycap covers the top portion of the outer key
            const ip   = 3;                           // inner padding
            const innerR = Math.max(0, radius - 2);
            const innerH = Math.round(bh * 0.52);
            const innerW = bw - ip * 2;
            const ix = bx + ip;
            const iy = by + ip;

            // Hold label sits centred in the exposed outer strip at the bottom
            const holdY = iy + innerH + (bh - innerH - ip) / 2 + fontSize * 0.35;

            return (
              <g key={i} transform={transform}>
                {/* Outer shadow */}
                {theme.id !== 'mono_print' && (
                  <rect x={bx} y={by + 2} width={bw} height={bh}
                    fill="rgba(0,0,0,0.18)" rx={radius} ry={radius} />
                )}
                {/* Outer body (hold action color) */}
                <rect x={bx} y={by} width={bw} height={bh}
                  fill={style.fill} stroke={theme.boardColor} strokeWidth={1.5}
                  rx={radius} ry={radius} />
                {/* Hold label */}
                <text x={bx + bw / 2} y={holdY}
                  textAnchor="middle" fontSize={fontSize * 0.78} fill={style.text}
                  fontWeight="700" style={{ userSelect: 'none', pointerEvents: 'none' }}
                >{holdLabel}</text>
                {/* Inner key shadow */}
                {theme.id !== 'mono_print' && (
                  <rect x={ix} y={iy + 1} width={innerW} height={innerH}
                    fill="rgba(0,0,0,0.2)" rx={innerR} ry={innerR} />
                )}
                {/* Inner key body (alpha color = tap action) */}
                <rect x={ix} y={iy} width={innerW} height={innerH}
                  fill={theme.keyAlpha} stroke={theme.boardColor} strokeWidth={1}
                  rx={innerR} ry={innerR} />
                {/* Inner key highlight edge */}
                {theme.id !== 'mono_print' && (
                  <rect x={ix + 2} y={iy + 1} width={innerW - 4} height={innerH - 3}
                    fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1}
                    rx={Math.max(0, innerR - 2)} ry={Math.max(0, innerR - 2)}
                    pointerEvents="none" />
                )}
                {/* Tap legend */}
                <text x={ix + innerW / 2} y={iy + innerH / 2 + fontSize * 0.35}
                  textAnchor="middle" fontSize={fontSize} fill={theme.keyAlphaText}
                  fontWeight="700" style={{ userSelect: 'none', pointerEvents: 'none' }}
                >{tapLabel}</text>
              </g>
            );
          }

          // ── Standard key ─────────────────────────────────────────────────
          return (
            <g key={i} transform={transform}>
              {!style.ghost && theme.id !== 'mono_print' && (
                <rect x={bx} y={by + 2} width={bw} height={bh}
                  fill="rgba(0,0,0,0.15)" rx={radius} ry={radius} />
              )}
              <rect x={bx} y={by} width={bw} height={bh}
                fill={style.fill}
                stroke={
                  style.dashed ? theme.keyModifierText + '44'
                  : style.ghost  ? theme.keyAlpha + '66'
                  : theme.boardColor
                }
                strokeWidth={1.5}
                strokeDasharray={style.dashed ? '4 3' : undefined}
                rx={radius} ry={radius} />
              {!style.dashed && !style.ghost && theme.id !== 'mono_print' && (
                <rect x={bx + 2} y={by + 1} width={bw - 4} height={bh - 3}
                  fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1}
                  rx={Math.max(0, radius - 2)} ry={Math.max(0, radius - 2)}
                  pointerEvents="none" />
              )}
              {!style.ghost && (
                <text
                  x={x + kw / 2}
                  y={y + kh / 2 + (lines.length > 1 ? -fontSize / 2 : fontSize / 3.5)}
                  textAnchor="middle" fontSize={fontSize} fill={style.text}
                  fontWeight="600" style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {lines.map((ln, li) => (
                    <tspan key={li} x={x + kw / 2} dy={li > 0 ? fontSize + 2 : 0}>{ln}</tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  const downloadSVG = (layerIdx) => {
    const el = document.getElementById(`layer-svg-${layerIdx}`);
    if (!el) return;
    const src = '<?xml version="1.0" standalone="no">\n' + new XMLSerializer().serializeToString(el);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
    a.download = `layer_${layerIdx}.svg`;
    a.click();
  };

  // ── Layer target helper ────────────────────────────────────────────────────
  function getTargetLayer(code) {
    if (!code || typeof code !== 'string') return null;
    const m = code.match(/(?:MO|TO|TG|TT|DF|OSL|LT|LT\d*)\(?(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1]);
    return n < mappedLayers.length ? n : null;
  }

  // ── Interactive canvas ─────────────────────────────────────────────────────
  const ARROW_COLORS = ['#a7c080','#83c092','#7fbbb3','#d699b6','#dbbc7f','#e69875','#e67e80','#9da9a0'];
  const CPU = unitSize;
  const CPG = keyGap;
  const CPR = radius;
  const CPF = fontSize;
  const CPAD = 0.5;
  const CLABEL = Math.max(28, fontSize + 12);

  // Initialise positions in a 2-col grid whenever layers are loaded
  useEffect(() => {
    if (!parsedKeys.length || !mappedLayers.length) return;
    const mx = Math.max(...parsedKeys.map(k=>k.x+k.w));
    const my = Math.max(...parsedKeys.map(k=>k.y+k.h));
    const cw = (mx+CPAD*2)*CPU + 80;
    const ch = (my+CPAD*2)*CPU + CLABEL + 60;
    const pos = {};
    mappedLayers.forEach((_,i) => {
      pos[i] = { x: (i%2)*cw + 20, y: Math.floor(i/2)*ch + 20 };
    });
    setLayerPos(pos);
    setViewOff({ x:-40, y:-40 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedLayers.length, parsedKeys.length]);

  const fitVisibleToPage = () => {
    if (!parsedKeys.length || !mappedLayers.length) return;
    const mx = Math.max(...parsedKeys.map(k => k.x + k.w));
    const my = Math.max(...parsedKeys.map(k => k.y + k.h));
    const kbW = (mx + CPAD * 2) * CPU;
    const kbH = (my + CPAD * 2) * CPU;
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    let hasVisible = false;
    mappedLayers.forEach((_, i) => {
      if (hiddenLayers[i]) return;
      const p = layerPositions[i] || { x: 0, y: 0 };
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + kbW);
      maxY = Math.max(maxY, p.y + kbH + CLABEL);
      hasVisible = true;
    });
    if (!hasVisible) return;
    const margin = 80;
    minX -= margin;
    minY -= margin;
    maxX += margin;
    maxY += margin;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const baseVW = printOrientation === 'landscape' ? 1800 : 1200;
    const baseVH = printOrientation === 'landscape' ? 1270 : 1700;
    const requiredZoom = Math.max(contentW / baseVW, contentH / baseVH);
    const finalZoom = Math.max(0.2, Math.min(5.0, requiredZoom));
    setPrintZoom(finalZoom);
    const VW = baseVW * finalZoom;
    const VH = baseVH * finalZoom;
    const centerX = minX + contentW / 2;
    const centerY = minY + contentH / 2;
    setViewOff({
      x: centerX - VW / 2,
      y: centerY - VH / 2
    });
  };

  const downloadPrintSVG = () => {
    const el = document.getElementById('print-svg');
    if (!el) return;
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    const src = '<?xml version="1.0" standalone="no">\n' + new XMLSerializer().serializeToString(clone);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
    a.download = `cheatsheet_print_${printOrientation}.svg`;
    a.click();
  };

  useEffect(() => {
    if (printMode) {
      fitVisibleToPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printMode, printOrientation]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey) {
        const zoomFactor = 1.05;
        setPrintZoom(prev => {
          const next = e.deltaY < 0 ? prev / zoomFactor : prev * zoomFactor;
          return Math.max(0.2, Math.min(5.0, next));
        });
      } else {
        setViewOff(prev => ({
          x: prev.x + e.deltaX,
          y: prev.y + e.deltaY
        }));
      }
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      svg.removeEventListener('wheel', handleWheel);
    };
  }, [printMode]);

  // SVG coordinate helper — uses frozen CTM to avoid feedback during drag
  const toSVG = (e) => {
    const svg = svgRef.current; if (!svg) return {x:0,y:0};
    const ctm = dragCTM.current || svg.getScreenCTM().inverse();
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(ctm);
  };

  const onCanvasDown = (e) => {
    const svg = svgRef.current; if (!svg) return;
    dragCTM.current = svg.getScreenCTM().inverse();
    const {x,y} = toSVG(e);
    setSvgDrag({ type:'pan', sx:x, sy:y, ox:viewOff.x, oy:viewOff.y });
  };
  const onLayerDown = (e, layerIdx) => {
    e.stopPropagation();
    const svg = svgRef.current; if (!svg) return;
    dragCTM.current = svg.getScreenCTM().inverse();
    const {x,y} = toSVG(e);
    const p = layerPositions[layerIdx] || {x:0,y:0};
    setSvgDrag({ type:'layer', layerIdx, sx:x, sy:y, ox:p.x, oy:p.y });
  };
  const onArrowHandleDown = (e, arrowId, pointIndex, curX, curY) => {
    e.stopPropagation();
    const svg = svgRef.current; if (!svg) return;
    dragCTM.current = svg.getScreenCTM().inverse();
    const {x,y} = toSVG(e);
    setSvgDrag({ type: 'arrowControl', arrowId, pointIndex, sx: x, sy: y, ox: curX, oy: curY });
  };
  const onSVGMove = (e) => {
    if (!svgDrag) return;
    const {x,y} = toSVG(e);
    const dx=x-svgDrag.sx, dy=y-svgDrag.sy;
    if (svgDrag.type==='pan') {
      setViewOff({ x:svgDrag.ox-dx, y:svgDrag.oy-dy });
    } else if (svgDrag.type==='layer') {
      const activeLayerIdx = svgDrag.layerIdx;
      const targetX = svgDrag.ox + dx;
      const targetY = svgDrag.oy + dy;
      
      let snappedX = targetX;
      let snappedY = targetY;
      let guides = [];
      const threshold = 12; // snap threshold in px
      
      const mx = Math.max(...parsedKeys.map(k => k.x + k.w));
      const my = Math.max(...parsedKeys.map(k => k.y + k.h));
      const kbW = (mx + CPAD * 2) * CPU;
      const kbH = (my + CPAD * 2) * CPU;
      
      mappedLayers.forEach((_, i) => {
        if (i === activeLayerIdx || hiddenLayers[i]) return;
        const otherP = layerPositions[i] || { x: 0, y: 0 };
        
        const otherLeft = otherP.x;
        const otherRight = otherP.x + kbW;
        const otherCenterX = otherP.x + kbW / 2;
        
        const otherTop = otherP.y;
        const otherBottom = otherP.y + kbH + CLABEL;
        const otherCenterY = otherP.y + (kbH + CLABEL) / 2;
        
        const curLeft = targetX;
        const curRight = targetX + kbW;
        const curCenterX = targetX + kbW / 2;
        
        const curTop = targetY;
        const curBottom = targetY + kbH + CLABEL;
        const curCenterY = targetY + (kbH + CLABEL) / 2;
        
        // Snap X (Vertical lines)
        if (Math.abs(curLeft - otherLeft) < threshold) {
          snappedX = otherLeft;
          guides.push({ type: 'v', x: otherLeft, y1: Math.min(targetY, otherTop), y2: Math.max(targetY + kbH + CLABEL, otherBottom) });
        } else if (Math.abs(curRight - otherRight) < threshold) {
          snappedX = otherRight - kbW;
          guides.push({ type: 'v', x: otherRight, y1: Math.min(targetY, otherTop), y2: Math.max(targetY + kbH + CLABEL, otherBottom) });
        } else if (Math.abs(curCenterX - otherCenterX) < threshold) {
          snappedX = otherCenterX - kbW / 2;
          guides.push({ type: 'v', x: otherCenterX, y1: Math.min(targetY, otherTop), y2: Math.max(targetY + kbH + CLABEL, otherBottom) });
        } else if (Math.abs(curLeft - otherRight) < threshold) {
          snappedX = otherRight;
          guides.push({ type: 'v', x: otherRight, y1: Math.min(targetY, otherTop), y2: Math.max(targetY + kbH + CLABEL, otherBottom) });
        } else if (Math.abs(curRight - otherLeft) < threshold) {
          snappedX = otherLeft - kbW;
          guides.push({ type: 'v', x: otherLeft, y1: Math.min(targetY, otherTop), y2: Math.max(targetY + kbH + CLABEL, otherBottom) });
        }
        
        // Snap Y (Horizontal lines)
        if (Math.abs(curTop - otherTop) < threshold) {
          snappedY = otherTop;
          guides.push({ type: 'h', y: otherTop, x1: Math.min(targetX, otherLeft), x2: Math.max(targetX + kbW, otherRight) });
        } else if (Math.abs(curBottom - otherBottom) < threshold) {
          snappedY = otherBottom - (kbH + CLABEL);
          guides.push({ type: 'h', y: otherBottom, x1: Math.min(targetX, otherLeft), x2: Math.max(targetX + kbW, otherRight) });
        } else if (Math.abs(curCenterY - otherCenterY) < threshold) {
          snappedY = otherCenterY - (kbH + CLABEL) / 2;
          guides.push({ type: 'h', y: otherCenterY, x1: Math.min(targetX, otherLeft), x2: Math.max(targetX + kbW, otherRight) });
        } else if (Math.abs(curTop - otherBottom) < threshold) {
          snappedY = otherBottom;
          guides.push({ type: 'h', y: otherBottom, x1: Math.min(targetX, otherLeft), x2: Math.max(targetX + kbW, otherRight) });
        } else if (Math.abs(curBottom - otherTop) < threshold) {
          snappedY = otherTop - (kbH + CLABEL);
          guides.push({ type: 'h', y: otherTop, x1: Math.min(targetX, otherLeft), x2: Math.max(targetX + kbW, otherRight) });
        }
      });
      
      setLayerPos(prev => ({ ...prev, [activeLayerIdx]: { x: snappedX, y: snappedY } }));
      setSnapGuides(guides);
    } else if (svgDrag.type==='arrowControl') {
      const idx = svgDrag.pointIndex;
      const arrow = arrowsRef.current.find(a => a.arrowId === svgDrag.arrowId);
      if (arrow) {
        setArrowMidpoints(prev => {
          const current = prev[svgDrag.arrowId] || [arrow.p0, arrow.p1, arrow.p2];
          const points = [...current];
          points[idx] = { x: svgDrag.ox + dx, y: svgDrag.oy + dy };
          return { ...prev, [svgDrag.arrowId]: points };
        });
      }
    }
  };
  const onSVGUp = () => {
    setSvgDrag(null);
    dragCTM.current=null;
    setSnapGuides([]);
  };

  // Render keys for one layer at an offset (print scale)
  const renderCanvasKeys = (layerIdx, offX, offY) =>
    (mappedLayers[layerIdx]||[]).map((key,i) => {
      const style = keyStyle(key);
      if (style.invisible) return null;
      const x=(key.x+CPAD)*CPU+offX, y=(key.y+CPAD)*CPU+offY;
      const kw=key.w*CPU, kh=key.h*CPU;
      const bx=x+CPG/2, by=y+CPG/2, bw=kw-CPG, bh=kh-CPG;
      const {label}=translateKeycode(key.keycode??'');
      const lines=(formatLabel(label,labelMode)??'').split('\n');
      const tr=key.r?`rotate(${key.r} ${(key.rx+CPAD)*CPU+offX} ${(key.ry+CPAD)*CPU+offY})`:undefined;
      if (style.nested) {
        const tap=lines[0]??'', hold=(lines[1]??'').replace(/[()]/g,'');
        const ip=2,ir=Math.max(0,CPR-2),ih=Math.round(bh*0.52),iw=bw-ip*2;
        const ix=bx+ip,iy=by+ip,hy=iy+ih+(bh-ih-ip)/2+CPF*0.35;
        return (<g key={i} transform={tr}>
          {theme.id !== 'mono_print' && <rect x={bx} y={by+1} width={bw} height={bh} fill="rgba(0,0,0,0.12)" rx={CPR}/>}
          <rect x={bx} y={by} width={bw} height={bh} fill={style.fill} stroke={theme.boardColor} strokeWidth={1} rx={CPR}/>
          <text x={bx+bw/2} y={hy} textAnchor="middle" fontSize={CPF*0.78} fill={style.text} fontWeight="700" style={{userSelect:'none'}}>{hold}</text>
          {theme.id !== 'mono_print' && <rect x={ix} y={iy+1} width={iw} height={ih} fill="rgba(0,0,0,0.15)" rx={ir}/>}
          <rect x={ix} y={iy} width={iw} height={ih} fill={theme.keyAlpha} stroke={theme.boardColor} strokeWidth={0.75} rx={ir}/>
          <text x={ix+iw/2} y={iy+ih/2+CPF*0.35} textAnchor="middle" fontSize={CPF} fill={theme.keyAlphaText} fontWeight="700" style={{userSelect:'none'}}>{tap}</text>
        </g>);
      }
      return (<g key={i} transform={tr}>
        {!style.ghost&&theme.id !== 'mono_print'&&<rect x={bx} y={by+1} width={bw} height={bh} fill="rgba(0,0,0,0.12)" rx={CPR}/>}
        <rect x={bx} y={by} width={bw} height={bh}
          fill={style.fill}
          stroke={style.ghost?theme.keyAlpha+'66':style.dashed?theme.keyModifierText+'44':theme.boardColor}
          strokeWidth={1} strokeDasharray={style.dashed?'3 2':style.ghost?'2 2':undefined} rx={CPR}/>
        {!style.ghost&&(
          <text x={x+kw/2} y={y+kh/2+(lines.length>1?-CPF/2:CPF/3.5)}
            textAnchor="middle" fontSize={CPF} fill={style.text} fontWeight="600" style={{userSelect:'none'}}>
            {lines.map((ln,li)=><tspan key={li} x={x+kw/2} dy={li>0?CPF+1.5:0}>{ln}</tspan>)}
          </text>
        )}
      </g>);
    });

  const toggleLayerVisibility = (layerIdx) => {
    setHiddenLayers(prev => ({ ...prev, [layerIdx]: !prev[layerIdx] }));
  };

  // Build spread+obstacle-avoiding arrows
  const buildCanvasArrows = () => {
    if (!parsedKeys.length) return [];
    const mx=Math.max(...parsedKeys.map(k=>k.x+k.w));
    const my=Math.max(...parsedKeys.map(k=>k.y+k.h));
    const kbW=(mx+CPAD*2)*CPU, kbH=(my+CPAD*2)*CPU;

    // Bounding boxes for each layer card
    const boxes = {};
    mappedLayers.forEach((_,i) => {
      const p=layerPositions[i]||{x:0,y:0};
      boxes[i]={x1:p.x, y1:p.y, x2:p.x+kbW, y2:p.y+kbH+CLABEL};
    });

    const arrows=[]; let gIdx=0;
    mappedLayers.forEach((_,fromLayer) => {
      if (hiddenLayers[fromLayer]) return;
      (mappedLayers[fromLayer]||[]).forEach((key, keyIndex) => {
        const to = getTargetLayer(key.keycode??'');
        if (to===null||to===fromLayer||!layerPositions[to]||!layerPositions[fromLayer]) return;
        if (hiddenLayers[to]) return;
        const fp=layerPositions[fromLayer], tp=layerPositions[to];
        const sx=fp.x+(key.x+CPAD)*CPU+key.w*CPU/2;
        const sy=fp.y+CLABEL+(key.y+CPAD)*CPU+key.h*CPU/2;
        const ex=tp.x+kbW/2;
        const ey=tp.y+CLABEL*0.4;

        // perpendicular spread based on global arrow index
        const dx=ex-sx, dy=ey-sy, len=Math.sqrt(dx*dx+dy*dy)||1;
        const px=-dy/len, py=dx/len; // perpendicular unit
        const spread=(gIdx%7-3)*14;  // -42..+42 in steps of 14
        const arcH=50+(gIdx%5)*18;   // 50,68,86,104,122

        const arrowId = `${fromLayer}-${keyIndex}`;
        const custom = arrowMidpoints[arrowId];

        const c1x=sx+dx*0.25+px*(spread+arcH*0.3);
        const c1y=sy+dy*0.25+py*(spread+arcH*0.3);
        const c2x=ex-dx*0.25+px*(spread+arcH*0.2);
        const c2y=ey-dy*0.25+py*(spread+arcH*0.2);
        let mx2=(c1x+c2x)/2, my2=(c1y+c2y)/2;

        // Push mid-control out of any blocking layer bounding box
        Object.entries(boxes).forEach(([bi,b]) => {
          if (+bi===fromLayer||+bi===to) return;
          if (mx2>b.x1&&mx2<b.x2&&my2>b.y1&&my2<b.y2) {
            const dists=[
              {d:mx2-b.x1,dir:'left'},  {d:b.x2-mx2,dir:'right'},
              {d:my2-b.y1,dir:'top'},   {d:b.y2-my2,dir:'bottom'},
            ];
            const {d,dir}=dists.reduce((a,v)=>v.d<a.d?v:a);
            const push=d+30;
            if (dir==='left')  { mx2-=push; }
            if (dir==='right') { mx2+=push; }
            if (dir==='top')   { my2-=push; }
            if (dir==='bottom'){ my2+=push; }
          }
        });

        const p0 = (custom && custom[0]) ? custom[0] : { x: c1x, y: c1y };
        const p1 = (custom && custom[1]) ? custom[1] : { x: mx2, y: my2 };
        const p2 = (custom && custom[2]) ? custom[2] : { x: c2x, y: c2y };

        arrows.push({
          arrowId,
          fromLayer,
          toLayer: to,
          sx, sy, ex, ey,
          p0, p1, p2,
          color: theme.id === 'mono_print' ? '#000000' : ARROW_COLORS[to%8]
        });
        gIdx++;
      });
    });
    return arrows;
  };

  const renderInteractiveCanvas = () => {
    if (!parsedKeys.length||!mappedLayers.length) return null;
    const mx=Math.max(...parsedKeys.map(k=>k.x+k.w));
    const my=Math.max(...parsedKeys.map(k=>k.y+k.h));
    const kbW=(mx+CPAD*2)*CPU, kbH=(my+CPAD*2)*CPU;
    const baseVW = printOrientation === 'landscape' ? 1800 : 1200;
    const baseVH = printOrientation === 'landscape' ? 1270 : 1700;
    const VW = baseVW * printZoom;
    const VH = baseVH * printZoom;
    const arrows=buildCanvasArrows();
    arrowsRef.current = arrows;
    const isDraggingLayer = svgDrag?.type==='layer';

    return (
      <svg ref={svgRef}
        id="print-svg"
        viewBox={`${viewOff.x} ${viewOff.y} ${VW} ${VH}`}
        style={{display:'block',width:'100%',height:'70vh',cursor:svgDrag?'grabbing':'grab',fontFamily}}
        onMouseDown={onCanvasDown}
        onMouseMove={onSVGMove}
        onMouseUp={onSVGUp}
        onMouseLeave={onSVGUp}
      >
        {/* Infinite background */}
        <rect x={-5000} y={-5000} width={15000} height={15000} fill={theme.bg}/>
        {/* Dot grid */}
        <pattern id="dot-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="1" fill={theme.id === 'mono_print' ? 'rgba(0,0,0,0.15)' : theme.keyAlpha+'22'}/>
        </pattern>
        <rect x={-5000} y={-5000} width={15000} height={15000} fill="url(#dot-grid)" className="no-print"/>

        {/* Arrow shadows */}
        {!disableArrows && arrows.map((a,i)=>(
          <path key={`as${i}`} d={solveCatmullRom([ {x: a.sx, y: a.sy}, a.p0, a.p1, a.p2, {x: a.ex, y: a.ey} ])}
            fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={3} className="no-print"/>
        ))}

        {/* Layer keyboards */}
        {mappedLayers.map((_,layerIdx) => {
          if (hiddenLayers[layerIdx]) return null;
          const p=layerPositions[layerIdx]||{x:0,y:0};
          const isActive=svgDrag?.layerIdx===layerIdx;
          return (
            <g key={layerIdx} transform={`translate(${p.x},${p.y})`}
              onMouseDown={e=>onLayerDown(e,layerIdx)}
              style={{cursor:isDraggingLayer&&isActive?'grabbing':'grab'}}
            >
              {/* Card shadow when dragging */}
              {isActive&&theme.id !== 'mono_print'&&<rect x={2} y={2} width={kbW} height={kbH+CLABEL} fill="rgba(0,0,0,0.35)" rx={CPR+4}/>}
              {/* Drag handle / label bar */}
              <rect x={0} y={0} width={kbW} height={CLABEL}
                fill={theme.id === 'mono_print' ? '#ffffff' : theme.boardColor} rx={CPR+2}
                stroke={theme.id === 'mono_print' ? '#000000' : (isActive?ARROW_COLORS[layerIdx%8]:'transparent')} strokeWidth={1.5}/>
              <text x={kbW/2} y={CLABEL*0.68}
                textAnchor="middle" fontSize={13} fontWeight="800"
                fill={theme.id === 'mono_print' ? '#000000' : ARROW_COLORS[layerIdx%8]} style={{userSelect:'none',pointerEvents:'none'}}
              >Layer {layerIdx}</text>
              {/* Quick Hide button */}
              <g className="no-print" style={{ cursor: 'pointer' }}
                onMouseDown={e => { e.stopPropagation(); toggleLayerVisibility(layerIdx); }}
              >
                <circle cx={kbW - 14} cy={CLABEL / 2} r={8} fill={theme.id === 'mono_print' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'} />
                <text x={kbW - 14} y={CLABEL / 2 + 3} textAnchor="middle" fontSize={10} fill={theme.id === 'mono_print' ? '#000000' : '#ffffff'} fontWeight="bold" style={{ userSelect: 'none' }}>×</text>
              </g>
              {/* Board bezel */}
              <rect x={CPAD*CPU-6} y={CLABEL+CPAD*CPU-6}
                width={kbW-CPAD*2*CPU+12} height={kbH-CPAD*2*CPU+12}
                fill={theme.id === 'mono_print' ? '#ffffff' : theme.boardColor}
                stroke={theme.id === 'mono_print' ? '#000000' : 'none'}
                strokeWidth={theme.id === 'mono_print' ? 1.5 : 0}
                rx={CPR+4}/>
              {/* Keys */}
              <g style={{pointerEvents:'none'}}>{renderCanvasKeys(layerIdx,0,CLABEL)}</g>
            </g>
          );
        })}

        {/* Arrows */}
        {!disableArrows && arrows.map((a,i)=>(
          <g key={`a${i}`} style={{pointerEvents:'none'}}>
            <path d={solveCatmullRom([ {x: a.sx, y: a.sy}, a.p0, a.p1, a.p2, {x: a.ex, y: a.ey} ])}
              fill="none" stroke={a.color} strokeWidth={1.8} strokeDasharray="6 3" opacity={0.9}/>
            <circle cx={a.ex} cy={a.ey} r={4} fill={a.color}/>
            <circle cx={a.sx} cy={a.sy} r={2.5} fill={a.color} opacity={0.7}/>
          </g>
        ))}

        {/* Draggable Arrow Handles */}
        {!disableArrows && arrows.map((a,i)=>{
          const p0 = a.p0;
          const p1 = a.p1;
          const p2 = a.p2;
          const isDraggingThis = svgDrag && svgDrag.type === 'arrowControl' && svgDrag.arrowId === a.arrowId;
          return (
            <g key={`ah${i}`} className="no-print">
              {/* Faint visual helpers for active editing */}
              {isDraggingThis && (
                <g style={{pointerEvents:'none'}} opacity={0.45}>
                  <line x1={a.sx} y1={a.sy} x2={p0.x} y2={p0.y} stroke={a.color} strokeWidth={1} strokeDasharray="3 3"/>
                  <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={a.color} strokeWidth={1} strokeDasharray="3 3"/>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={a.color} strokeWidth={1} strokeDasharray="3 3"/>
                  <line x1={p2.x} y1={p2.y} x2={a.ex} y2={a.ey} stroke={a.color} strokeWidth={1} strokeDasharray="3 3"/>
                </g>
              )}
              {/* Handle 0 */}
              <circle cx={p0.x} cy={p0.y} r={12} fill="transparent" style={{cursor:'move'}}
                onMouseDown={e => onArrowHandleDown(e, a.arrowId, 0, p0.x, p0.y)}/>
              <circle cx={p0.x} cy={p0.y} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{pointerEvents:'none'}}/>

              {/* Handle 1 */}
              <circle cx={p1.x} cy={p1.y} r={12} fill="transparent" style={{cursor:'move'}}
                onMouseDown={e => onArrowHandleDown(e, a.arrowId, 1, p1.x, p1.y)}/>
              <circle cx={p1.x} cy={p1.y} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{pointerEvents:'none'}}/>

              {/* Handle 2 */}
              <circle cx={p2.x} cy={p2.y} r={12} fill="transparent" style={{cursor:'move'}}
                onMouseDown={e => onArrowHandleDown(e, a.arrowId, 2, p2.x, p2.y)}/>
              <circle cx={p2.x} cy={p2.y} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{pointerEvents:'none'}}/>
            </g>
          );
        })}

        {/* Smart alignment guides */}
        {snapGuides.map((g, idx) => {
          if (g.type === 'v') {
            return (
              <line key={`sg${idx}`} x1={g.x} y1={g.y1 - 60} x2={g.x} y2={g.y2 + 60}
                stroke="#ff4d4d" strokeWidth={1.5} strokeDasharray="5 3" className="no-print" />
            );
          } else {
            return (
              <line key={`sg${idx}`} x1={g.x1 - 60} y1={g.y} x2={g.x2 + 60} y2={g.y}
                stroke="#ff4d4d" strokeWidth={1.5} strokeDasharray="5 3" className="no-print" />
            );
          }
        })}
      </svg>
    );
  };

  // ── Combo label helper ─────────────────────────────────────────────────────
  const comboKeyLabel = (k) => {
    if (!k || k === 'KC_NO') return null;
    return translateKeycode(k).label || k;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const layersToRender = activeLayer === null
    ? mappedLayers.map((_, i) => i)
    : [activeLayer];

  const hasExtras = combos.length > 0 || tapDances.length > 0;

  return (
    <div className="maker-container">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <header className="maker-header">
        <div className="header-info">
          <h1>Vial Cheatsheet Generator</h1>
          <p>Upload your <code>.vil</code> file to generate a cheatsheet for every layer</p>
        </div>
        <div className="header-actions">
          {mappedLayers.length > 0 && (
            <>
              <button
                className={`btn ${printMode ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPrintMode(p => !p)}
              >
                {printMode ? '← Edit View' : '📄 Print Layout'}
              </button>
              {printMode && (
                <button className="btn btn-secondary" onClick={() => window.print()}>
                  🖨️ Print
                </button>
              )}
            </>
          )}
          <button className="btn btn-primary" onClick={() => fileInputRef.current.click()}>
            📂 Upload .vil File
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }}
            accept=".json,.vil" onChange={e => handleFileInput(e.target.files?.[0])} />
        </div>
      </header>

      <div className="workspace-grid">
        {/* ── Main canvas ─────────────────────────────────────────────────── */}
        <div className="canvas-wrapper">
          {mappedLayers.length === 0 ? (
            <div
              className={`drag-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileInput(e.dataTransfer.files?.[0]); }}
              onClick={() => fileInputRef.current.click()}
            >
              <div className="empty-state">
                <span className="empty-icon">⌨️</span>
                <h3>Drop your .vil file here</h3>
                <p>Or click to browse — Vial backup files (.vil / .json) are supported</p>
              </div>
            </div>
          ) : printMode ? (
            /* ── Interactive Canvas ──────────────────────────────────── */
            <div className="print-layout-wrapper">
              <style>{`
                @media print {
                  @page {
                    size: A4 ${printOrientation === 'landscape' ? 'landscape' : 'portrait'};
                    margin: 8mm;
                  }
                }
              `}</style>
              
              {/* Print Toolbar */}
              <div className="print-toolbar no-print">
                <div className="print-toolbar-group">
                  <span className="print-toolbar-label">A4 Layout:</span>
                  <div className="print-toolbar-btn-group">
                    <button 
                      className={`print-btn-toggle ${printOrientation === 'landscape' ? 'active' : ''}`}
                      onClick={() => setPrintOrientation('landscape')}
                    >
                      Landscape (Horizontal)
                    </button>
                    <button 
                      className={`print-btn-toggle ${printOrientation === 'portrait' ? 'active' : ''}`}
                      onClick={() => setPrintOrientation('portrait')}
                    >
                      Portrait (Vertical)
                    </button>
                  </div>
                </div>

                <div className="print-toolbar-group" style={{ gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--slate-200)', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={!disableArrows} onChange={e => setDisableArrows(!e.target.checked)} style={{ cursor: 'pointer' }} />
                    <span>Show Arrows</span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--slate-200)', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={colorLayerButtons} onChange={e => setColorLayerButtons(e.target.checked)} style={{ cursor: 'pointer' }} />
                    <span>Color Layer Triggers</span>
                  </label>
                </div>

                <div className="print-toolbar-group">
                  <span className="print-toolbar-label">Zoom:</span>
                  <button className="btn btn-secondary" onClick={() => setPrintZoom(z => Math.max(0.2, z - 0.1))} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}>
                    ➖
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--slate-200)', minWidth: '45px', textAlign: 'center' }}>
                    {Math.round(printZoom * 100)}%
                  </span>
                  <button className="btn btn-secondary" onClick={() => setPrintZoom(z => Math.min(5.0, z + 0.1))} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}>
                    ➕
                  </button>
                  <button className="btn btn-secondary" onClick={fitVisibleToPage} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', marginLeft: '6px' }} title="Scale and center all visible layers to fit on one page">
                    🔍 Fit to Page
                  </button>
                </div>

                <div className="print-toolbar-group">
                  <button className="btn btn-secondary" onClick={downloadPrintSVG} style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}>
                    💾 Download SVG
                  </button>
                  <button className="btn btn-primary" onClick={() => window.print()} style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}>
                    🖨️ Print / PDF
                  </button>
                </div>
              </div>

              <div className="canvas-hint no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🖱 Drag keyboards to arrange (snaps to align) · Drag 3 points on arrows to bend · Drag background/wheel to pan · Ctrl+Wheel to zoom</span>
                {Object.keys(arrowMidpoints).length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setArrowMidpoints({})} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}>
                    🔄 Reset Arrows
                  </button>
                )}
              </div>
              <div className="print-svg-container" style={{background:theme.bg,borderRadius:12,overflow:'hidden'}}>
                {renderInteractiveCanvas()}
              </div>
            </div>
          ) : (
            <div>
              {/* Layer filter tabs */}
              <div className="layer-filter-bar">
                <button
                  className={`layer-tab ${activeLayer === null ? 'active' : ''}`}
                  onClick={() => setActiveLayer(null)}
                >
                  All
                </button>
                {mappedLayers.map((_, i) => (
                  <button key={i}
                    className={`layer-tab ${activeLayer === i ? 'active' : ''}`}
                    onClick={() => setActiveLayer(i)}
                  >
                    {i}
                  </button>
                ))}
                {hasExtras && (
                  <button
                    className={`layer-tab ${activeLayer === 'extras' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('extras')}
                  >
                    Combos & TD
                  </button>
                )}
              </div>

              {/* Layer cards */}
              {activeLayer !== 'extras' && layersToRender.map(idx => (
                <div key={idx} className="glass-card layer-card-cheatsheet">
                  <div className="layer-card-header">
                    <span className="layer-number-badge">{idx}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => downloadSVG(idx)}>
                      ↓ SVG
                    </button>
                  </div>
                  <div className="svg-container" style={{ background: theme.bg }}>
                    {renderSVG(idx, mappedLayers[idx])}
                  </div>
                </div>
              ))}

              {/* Combos & Tap Dance section */}
              {(activeLayer === null || activeLayer === 'extras') && hasExtras && (
                <div className="extras-section">

                  {/* Combos */}
                  {combos.length > 0 && (
                    <div className="glass-card panel extras-card">
                      <h3>Combos</h3>
                      <table className="extras-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Keys</th>
                            <th>→ Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {combos.map(c => {
                            const comboKeys = c.keys.map(comboKeyLabel).filter(Boolean);
                            const action = translateKeycode(c.action).label || c.action;
                            return (
                              <tr key={c.idx}>
                                <td className="extras-idx">{c.idx}</td>
                                <td>
                                  <span className="combo-keys">
                                    {comboKeys.map((k, ki) => (
                                      <React.Fragment key={ki}>
                                        <span className="key-chip">{k}</span>
                                        {ki < comboKeys.length - 1 && <span className="combo-plus">+</span>}
                                      </React.Fragment>
                                    ))}
                                  </span>
                                </td>
                                <td><span className="key-chip key-chip-accent">{action}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tap Dances */}
                  {tapDances.length > 0 && (
                    <div className="glass-card panel extras-card">
                      <h3>Tap Dance</h3>
                      <table className="extras-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Tap</th>
                            <th>Hold</th>
                            <th>Double Tap</th>
                            <th>Tap + Hold</th>
                            <th>Term</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tapDances.map(td => {
                            const fmt = k => k && k !== 'KC_NO'
                              ? <span className="key-chip">{translateKeycode(k).label || k}</span>
                              : <span className="td-empty">—</span>;
                            return (
                              <tr key={td.idx}>
                                <td className="extras-idx">TD{td.idx}</td>
                                <td>{fmt(td.tap)}</td>
                                <td>{fmt(td.hold)}</td>
                                <td>{fmt(td.doubleTap)}</td>
                                <td>{fmt(td.tapHold)}</td>
                                <td className="td-term">{td.term}ms</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="sidebar-panels">

          {/* Physical Layout */}
          <div className="glass-card panel">
            <h3>Physical Layout</h3>
            <div className="form-group">
              <label>Keyboard Preset</label>
              <select value={selectedPreset} onChange={e => setSelectedPreset(e.target.value)} className="select-input">
                <option value="split58">Split 58 (Lily58 / Sofle / Iris)</option>
                <option value="corne">Corne (40% Split)</option>
                <option value="ansi60">60% ANSI</option>
              </select>
            </div>
            {fileName && (
              <div className="info-badge" style={{ marginTop: 0 }}>
                <span>File:</span> <strong>{fileName}</strong>
              </div>
            )}
          </div>

          {printMode && (
            <div className="glass-card panel">
              <h3>Visible Layers</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {mappedLayers.map((_, idx) => {
                  const isVisible = !hiddenLayers[idx];
                  return (
                    <button
                      key={idx}
                      className={`layer-tab ${isVisible ? 'active' : ''}`}
                      onClick={() => toggleLayerVisibility(idx)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.45rem 0.6rem' }}
                    >
                      <span style={{ fontSize: '0.9rem' }}>{isVisible ? '👁️' : '🙈'}</span>
                      <span>L{idx}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Style */}
          <div className="glass-card panel">
            <h3>Style</h3>

            <div className="form-group">
              <label>Color Theme</label>
              <div className="theme-grid">
                {Object.values(THEMES).map(t => (
                  <button key={t.id}
                    className={`theme-badge ${themeId === t.id ? 'active' : ''}`}
                    style={{ background: t.bg, borderColor: t.keyAccent }}
                    onClick={() => setThemeId(t.id)} title={t.name}
                  >
                    <span style={{ color: t.keyAlpha }}>●</span>
                    <span style={{ color: t.keyModifier }}>●</span>
                    <span style={{ color: t.keyAccent }}>●</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Label Style</label>
              <div className="layer-tabs">
                {[['default', 'Full'], ['abbrev', 'Short'], ['emoji', 'Emoji']].map(([val, label]) => (
                  <button key={val}
                    className={`layer-tab ${labelMode === val ? 'active' : ''}`}
                    onClick={() => setLabelMode(val)}
                  >{label}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Font</label>
              <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="select-input">
                <option value="Inter">Inter</option>
                <option value="Outfit">Outfit</option>
                <option value="Fira Code">Fira Code</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem', paddingBottom: '0.4rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--slate-200)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={!disableArrows} onChange={e => setDisableArrows(!e.target.checked)} style={{ cursor: 'pointer' }} />
                <span>Show Connecting Arrows</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--slate-200)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={colorLayerButtons} onChange={e => setColorLayerButtons(e.target.checked)} style={{ cursor: 'pointer' }} />
                <span>Color Layer Trigger Keys</span>
              </label>
            </div>

            <div className="sliders-grid">
              <div className="slider-item">
                <label>Key size ({unitSize}px)</label>
                <input type="range" min="30" max="72" value={unitSize} onChange={e => setUnitSize(+e.target.value)} />
              </div>
              <div className="slider-item">
                <label>Gap ({keyGap}px)</label>
                <input type="range" min="0" max="8" value={keyGap} onChange={e => setKeyGap(+e.target.value)} />
              </div>
              <div className="slider-item">
                <label>Rounding ({radius}px)</label>
                <input type="range" min="0" max="16" value={radius} onChange={e => setRadius(+e.target.value)} />
              </div>
              <div className="slider-item">
                <label>Font size ({fontSize}px)</label>
                <input type="range" min="7" max="18" value={fontSize} onChange={e => setFontSize(+e.target.value)} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
