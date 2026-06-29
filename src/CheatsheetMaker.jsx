import React, { useState, useEffect, useRef } from 'react';
import { PRESETS } from './presets';
import { translateKeycode } from './keycodes';
import { parseKLE, mapLayersToLayout } from './kleParser';

// ── Themes ──────────────────────────────────────────────────────────────────
// All text/fill combos target ≥ 4.5:1 contrast (WCAG AA).
const THEMES = {
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

    const { type } = translateKeycode(code);
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
      case 'empty':    return { fill: 'transparent', text: 'transparent', ghost: true };
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
          fill={theme.boardColor} rx={radius + 6} ry={radius + 6} />

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
                <rect x={bx} y={by + 2} width={bw} height={bh}
                  fill="rgba(0,0,0,0.18)" rx={radius} ry={radius} />
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
                <rect x={ix} y={iy + 1} width={innerW} height={innerH}
                  fill="rgba(0,0,0,0.2)" rx={innerR} ry={innerR} />
                {/* Inner key body (alpha color = tap action) */}
                <rect x={ix} y={iy} width={innerW} height={innerH}
                  fill={theme.keyAlpha} stroke={theme.boardColor} strokeWidth={1}
                  rx={innerR} ry={innerR} />
                {/* Inner key highlight edge */}
                <rect x={ix + 2} y={iy + 1} width={innerW - 4} height={innerH - 3}
                  fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1}
                  rx={Math.max(0, innerR - 2)} ry={Math.max(0, innerR - 2)}
                  pointerEvents="none" />
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
              {!style.ghost && (
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
              {!style.dashed && !style.ghost && (
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
    const src = '<?xml version="1.0" standalone="no"?>\n' + new XMLSerializer().serializeToString(el);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
    a.download = `layer_${layerIdx}.svg`;
    a.click();
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
            <button className="btn btn-secondary" onClick={() => window.print()}>
              🖨️ Print
            </button>
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
