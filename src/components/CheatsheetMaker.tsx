import React, { useState, useEffect, useRef } from 'react';
import { PRESETS } from '../presets';
import { parseKLE, mapLayersToLayout } from '../kleParser';
import { THEMES } from '../themes';
import { comboKeyLabel } from '../utils';
import type { ParsedKey, Theme, Combo, TapDance } from '../types';

import { LayerSvg } from './LayerSvg';
import { PrintCanvas } from './PrintCanvas';

export default function CheatsheetMaker() {
  const [parsedKeys, setParsedKeys] = useState<ParsedKey[]>([]);
  const [mappedLayers, setMappedLayers] = useState<ParsedKey[][]>([]);

  const [combos, setCombos] = useState<Combo[]>([]);
  const [tapDances, setTapDances] = useState<TapDance[]>([]);

  const [selectedPreset, setSelectedPreset] = useState('split58');
  const [activeLayer, setActiveLayer] = useState<number | 'extras' | null>(null);

  const [themeId, setThemeId] = useState('everforest');
  const unitSize = 50; // Constant keycap size
  const [keyGap, setKeyGap] = useState(3);
  const [radius, setRadius] = useState(6);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [labelMode, setLabelMode] = useState('default');

  const [printMode, setPrintMode] = useState(false);
  const [printOrientation, setPrintOrientation] = useState('landscape');
  const [printZoom, setPrintZoom] = useState(1);
  const [disableArrows, setDisableArrows] = useState(false);
  const [colorLayerButtons, setColorLayerButtons] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme: Theme = (THEMES as any)[themeId];
  const ARROW_COLORS = ['#a7c080','#83c092','#7fbbb3','#d699b6','#dbbc7f','#e69875','#e67e80','#9da9a0'];

  useEffect(() => {
    if (!document.getElementById('gf-cheatsheet')) {
      const l = document.createElement('link');
      l.id = 'gf-cheatsheet';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@400;600;700&family=Fira+Code:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap';
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    const preset = (PRESETS as any)[selectedPreset];
    if (!preset) return;
    setParsedKeys(parseKLE(preset.keymap));
  }, [selectedPreset]);

  const showToast = (type: string, msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const parseVilFile = (text: string, name: string) => {
    try {
      const data = JSON.parse(text);
      if (!data.layout || !Array.isArray(data.layout)) {
        showToast('error', 'Unrecognised format — expected a Vial .vil export.');
        return;
      }

      const flatLayers = data.layout.map((layer: any[]) =>
        layer.flat().map(k => (k === -1 ? '__PHANTOM__' : k))
      );

      const numRows = data.layout[0].length;
      const numCols = data.layout[0][0]?.length ?? 6;
      const matrix = { rows: numRows, cols: numCols };

      const presetKey = (numRows === 10 && numCols === 6) ? 'split58' : selectedPreset;
      setSelectedPreset(presetKey);

      const keys = parseKLE((PRESETS as any)[presetKey].keymap);
      const mapped = mapLayersToLayout(keys, flatLayers, matrix);

      setParsedKeys(keys);
      setMappedLayers(mapped);
      setActiveLayer(null);
      setPrintMode(false);

      if (data.combo) {
        const active = data.combo
          .map((c: any[], i: number) => ({ idx: i, keys: c.slice(0, 4), action: c[4] }))
          .filter((c: Combo) => c.action && c.action !== 'KC_NO' && c.keys.some(k => k && k !== 'KC_NO'));
        setCombos(active);
      }

      if (data.tap_dance) {
        const active = data.tap_dance
          .map((td: any[], i: number) => ({
            idx: i, tap: td[0], hold: td[1], doubleTap: td[2], tapHold: td[3], term: td[4]
          }))
          .filter((td: TapDance) => [td.tap, td.hold, td.doubleTap, td.tapHold].some(k => k && k !== 'KC_NO'));
        setTapDances(active);
      }

      showToast('success', `Loaded "${name}" — ${flatLayers.length} layers, ${keys.length} keys`);
    } catch (e: any) {
      showToast('error', 'Failed to parse file: ' + e.message);
    }
  };

  const handleFileInput = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => parseVilFile(e.target?.result as string, file.name);
    reader.readAsText(file);
  };

  const downloadSVG = (layerIdx: number) => {
    const el = document.getElementById(`layer-svg-${layerIdx}`);
    if (!el) return;
    const src = '<?xml version="1.0" standalone="no">\n' + new XMLSerializer().serializeToString(el);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
    a.download = `layer_${layerIdx}.svg`;
    a.click();
  };

  const downloadPrintSVG = () => {
    const el = document.getElementById('print-svg');
    if (!el) return;
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('.no-print').forEach(node => node.remove());
    const src = '<?xml version="1.0" standalone="no">\n' + new XMLSerializer().serializeToString(clone);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
    a.download = `cheatsheet_print_${printOrientation}.svg`;
    a.click();
  };

  const layersToRender = activeLayer === null
    ? mappedLayers.map((_, i) => i)
    : typeof activeLayer === 'number' ? [activeLayer] : [];

  const hasExtras = combos.length > 0 || tapDances.length > 0;

  return (
    <div className="maker-container">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <header className="maker-header">
        <div className="header-info">
          <h1>Vial Cheatsheet Generator</h1>
          <p>Upload your <code>.vil</code> file to generate a cheatsheet for every layer</p>
        </div>
        <div className="header-actions">
          {mappedLayers.length > 0 && (
            <>
              <button className={`btn ${printMode ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPrintMode(p => !p)}>
                {printMode ? '← Edit View' : '📄 Print Layout'}
              </button>
              {printMode && (
                <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Print</button>
              )}
            </>
          )}
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>📂 Upload .vil File</button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json,.vil" onChange={e => handleFileInput(e.target.files?.[0])} />
        </div>
      </header>

      <div className="workspace-grid">
        <div className="canvas-wrapper">
          {mappedLayers.length === 0 ? (
            <div className={`drag-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileInput(e.dataTransfer.files?.[0]); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="empty-state">
                <span className="empty-icon">⌨️</span>
                <h3>Drop your .vil file here</h3>
                <p>Or click to browse — Vial backup files (.vil / .json) are supported</p>
              </div>
            </div>
          ) : printMode ? (
            <div className="print-layout-wrapper">
              <style>{`
                @media print {
                  @page {
                    size: A4 ${printOrientation === 'landscape' ? 'landscape' : 'portrait'};
                    margin: 8mm;
                  }
                }
              `}</style>
              
              <div className="print-toolbar no-print">
                <div className="print-toolbar-group">
                  <span className="print-toolbar-label">A4 Layout:</span>
                  <div className="print-toolbar-btn-group">
                    <button className={`print-btn-toggle ${printOrientation === 'landscape' ? 'active' : ''}`} onClick={() => setPrintOrientation('landscape')}>Landscape (Horizontal)</button>
                    <button className={`print-btn-toggle ${printOrientation === 'portrait' ? 'active' : ''}`} onClick={() => setPrintOrientation('portrait')}>Portrait (Vertical)</button>
                  </div>
                </div>

                <div className="print-toolbar-group checkboxes-row" style={{ gap: '1rem' }}>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={!disableArrows} onChange={e => setDisableArrows(!e.target.checked)} />
                    <span>Show Arrows</span>
                  </label>
                  
                  <label className="checkbox-label">
                    <input type="checkbox" checked={colorLayerButtons} onChange={e => setColorLayerButtons(e.target.checked)} />
                    <span>Color Layer Triggers</span>
                  </label>
                </div>

                <div className="print-toolbar-group">
                  <span className="print-toolbar-label">Zoom:</span>
                  <button className="btn btn-secondary" onClick={() => setPrintZoom(z => Math.max(0.2, z - 0.1))} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}>➖</button>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--slate-200)', minWidth: '45px', textAlign: 'center' }}>{Math.round(printZoom * 100)}%</span>
                  <button className="btn btn-secondary" onClick={() => setPrintZoom(z => Math.min(5.0, z + 0.1))} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}>➕</button>
                </div>

                <div className="print-toolbar-group">
                  <button className="btn btn-secondary" onClick={downloadPrintSVG} style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}>💾 Download SVG</button>
                  <button className="btn btn-primary" onClick={() => window.print()} style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}>🖨️ Print / PDF</button>
                </div>
              </div>

              <PrintCanvas
                mappedLayers={mappedLayers}
                parsedKeys={parsedKeys}
                theme={theme}
                unitSize={unitSize}
                keyGap={keyGap}
                radius={radius}
                fontSize={fontSize}
                fontFamily={fontFamily}
                labelMode={labelMode}
                colorLayerButtons={colorLayerButtons}
                arrowColors={ARROW_COLORS}
                printOrientation={printOrientation}
                printZoom={printZoom}
                setPrintZoom={setPrintZoom}
                disableArrows={disableArrows}
                setDisableArrows={setDisableArrows}
                setColorLayerButtons={setColorLayerButtons}
              />
            </div>
          ) : (
            <div>
              <div className="layer-filter-bar">
                <button className={`layer-tab ${activeLayer === null ? 'active' : ''}`} onClick={() => setActiveLayer(null)}>All</button>
                {mappedLayers.map((_, i) => (
                  <button key={i} className={`layer-tab ${activeLayer === i ? 'active' : ''}`} onClick={() => setActiveLayer(i)}>{i}</button>
                ))}
                {hasExtras && <button className={`layer-tab ${activeLayer === 'extras' ? 'active' : ''}`} onClick={() => setActiveLayer('extras')}>Extras</button>}
              </div>

              <div className="layer-list">
                {layersToRender.map(i => (
                  <div key={i} className="layer-card">
                    <div className="layer-header">
                      <h3>Layer {i}</h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => downloadSVG(i)}>Download SVG</button>
                    </div>
                    <div className="layer-svg-container">
                      <LayerSvg
                        layerIdx={i}
                        keys={mappedLayers[i]}
                        theme={theme}
                        unitSize={unitSize}
                        keyGap={keyGap}
                        radius={radius}
                        fontSize={fontSize}
                        fontFamily={fontFamily}
                        labelMode={labelMode}
                        colorLayerButtons={colorLayerButtons}
                        arrowColors={ARROW_COLORS}
                        mappedLayersLength={mappedLayers.length}
                      />
                    </div>
                  </div>
                ))}
                
                {activeLayer === 'extras' && (
                  <div className="extras-section">
                    {combos.length > 0 && (
                      <div className="glass-card extras-card panel">
                        <h3>Combos</h3>
                        <table className="extras-table">
                          <thead>
                            <tr>
                              <th>Keys</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {combos.map((c: Combo) => (
                              <tr key={`c-${c.idx}`}>
                                <td>
                                  <div className="combo-keys">
                                    {c.keys.filter(k => k && k !== 'KC_NO').map((k, idx, arr) => (
                                      <React.Fragment key={idx}>
                                        <span className="key-chip">{comboKeyLabel(k)}</span>
                                        {idx < arr.length - 1 && <span className="combo-plus">+</span>}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </td>
                                <td>
                                  <span className="key-chip key-chip-accent">{comboKeyLabel(c.action)}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {tapDances.length > 0 && (
                      <div className="glass-card extras-card panel">
                        <h3>Tap Dances</h3>
                        <table className="extras-table">
                          <thead>
                            <tr>
                              <th>Index</th>
                              <th>Tap</th>
                              <th>Hold</th>
                              <th>Double Tap</th>
                              <th>Tap+Hold</th>
                              <th>Term</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tapDances.map((td: TapDance) => (
                              <tr key={`td-${td.idx}`}>
                                <td className="extras-idx">TD_{td.idx}</td>
                                <td>{td.tap && td.tap !== 'KC_NO' ? <span className="key-chip">{comboKeyLabel(td.tap)}</span> : <span className="td-empty">—</span>}</td>
                                <td>{td.hold && td.hold !== 'KC_NO' ? <span className="key-chip">{comboKeyLabel(td.hold)}</span> : <span className="td-empty">—</span>}</td>
                                <td>{td.doubleTap && td.doubleTap !== 'KC_NO' ? <span className="key-chip">{comboKeyLabel(td.doubleTap)}</span> : <span className="td-empty">—</span>}</td>
                                <td>{td.tapHold && td.tapHold !== 'KC_NO' ? <span className="key-chip">{comboKeyLabel(td.tapHold)}</span> : <span className="td-empty">—</span>}</td>
                                <td className="td-term">{td.term ? `${td.term}ms` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar Tools ── */}
        <aside className="sidebar-panels no-print">
          
          <div className="glass-card panel">
            <h3>Physical Layout</h3>
            <div className="form-group">
              <select className="select-input" value={selectedPreset} onChange={(e) => {
                setSelectedPreset(e.target.value);
                setMappedLayers([]);
              }}>
                {Object.entries(PRESETS).map(([k, v]: [string, any]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="glass-card panel">
            <h3>Theme</h3>
            <div className="theme-grid">
              {Object.values(THEMES).map((t: any) => (
                <button key={t.id} className={`theme-badge ${themeId === t.id ? 'active' : ''}`} onClick={() => setThemeId(t.id)} style={{ background: t.bg }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: t.keyAlpha }}></span>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: t.keyModifier }}></span>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: t.keyAccent }}></span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card panel">
            <h3>Typography & Labels</h3>
            <div className="form-group">
              <label>Label Style</label>
              <select className="select-input" value={labelMode} onChange={(e) => setLabelMode(e.target.value)}>
                <option value="default">QMK Defaults</option>
                <option value="abbrev">Shortened (Bksp, Ent)</option>
                <option value="emoji">Symbols (⌫, ↵, ⇧)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Font Family</label>
              <select className="select-input" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                <option value="Inter">Inter (Clean)</option>
                <option value="Outfit">Outfit (Modern)</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="Fira Code">Fira Code</option>
                <option value="system-ui">System Default</option>
              </select>
            </div>
            <div className="sliders-grid">
              <div className="slider-item">
                <label>Font Size: {fontSize}px</label>
                <input type="range" min="8" max="18" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="glass-card panel">
            <h3>Dimensions</h3>
            <div className="sliders-grid">
              <div className="slider-item">
                <label>Gap: {keyGap}px</label>
                <input type="range" min="0" max="10" value={keyGap} onChange={e => setKeyGap(Number(e.target.value))} />
              </div>
              <div className="slider-item">
                <label>Border Radius: {radius}px</label>
                <input type="range" min="0" max="16" value={radius} onChange={e => setRadius(Number(e.target.value))} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
