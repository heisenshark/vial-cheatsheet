import React, { useState, useEffect, useRef } from 'react';
import { PRESETS } from '../presets';
import { parseKLE, mapLayersToLayout } from '../kleParser';
import { THEMES } from '../themes';
import { comboKeyLabel } from '../utils';
import type { ParsedKey, Theme, Combo, TapDance } from '../types';

import { PrintCanvas } from './PrintCanvas';

export default function CheatsheetMaker() {
  const [parsedKeys, setParsedKeys] = useState<ParsedKey[]>([]);
  const [mappedLayers, setMappedLayers] = useState<ParsedKey[][]>([]);

  const [combos, setCombos] = useState<Combo[]>([]);
  const [tapDances, setTapDances] = useState<TapDance[]>([]);
  const [layoutInfo, setLayoutInfo] = useState<any>({ name: 'Default' });
  const [showInfoPane, setShowInfoPane] = useState(true);

  const [selectedPreset, setSelectedPreset] = useState('split58');
  const [layerNames, setLayerNames] = useState<Record<number, string>>({});
  const [hiddenLayers, setHiddenLayers] = useState<Record<number, boolean>>({});

  const [themeId, setThemeId] = useState('everforest');
  const unitSize = 50; // Constant keycap size
  const [keyGap, setKeyGap] = useState(3);
  const [splitGap, setSplitGap] = useState(0);
  const [radius, setRadius] = useState(6);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [labelMode, setLabelMode] = useState('abbrev');

  const [printOrientation, setPrintOrientation] = useState('landscape');
  const [printZoom, setPrintZoom] = useState(1.0);
  const [disableArrows, setDisableArrows] = useState(false);
  const [colorLayerButtons, setColorLayerButtons] = useState(true);
  const [arrowWidth, setArrowWidth] = useState(2.5);

  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvasControls, setCanvasControls] = useState<{
    hiddenLayers: Record<number, boolean>;
    toggleLayerVisibility: (i: number) => void;
    fitToPage: () => void;
    resetArrows: () => void;
    canResetArrows: boolean;
  } | null>(null);
  
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({
    layers: false,
    theme: true,
    typography: true,
    dimensions: true
  });
  const togglePanel = (p: string) => setCollapsedPanels(prev => ({...prev, [p]: !prev[p]}));

  const [sidebarWidth, setSidebarWidth] = useState(260);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      setSidebarWidth(Math.max(180, Math.min(600, startWidth + delta)));
    };
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'ew-resize';
  };

  const theme: Theme = (THEMES as any)[themeId];
  const ARROW_COLORS = ['#a7c080', '#83c092', '#7fbbb3', '#d699b6', '#dbbc7f', '#e69875', '#e67e80', '#9da9a0'];

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

  useEffect(() => {
    if (mappedLayers.length > 0) {
      document.body.classList.add('file-loaded');
    } else {
      document.body.classList.remove('file-loaded');
    }
    return () => document.body.classList.remove('file-loaded');
  }, [mappedLayers.length]);

  const { adjustedParsedKeys, adjustedMappedLayers } = React.useMemo(() => {
    if (splitGap === 0 || parsedKeys.length === 0) return { adjustedParsedKeys: parsedKeys, adjustedMappedLayers: mappedLayers };
    const mx = Math.max(...parsedKeys.map(k => k.x + k.w));
    const midX = mx / 2;
    const adjustKey = (k: ParsedKey) => {
      if (k.x >= midX) return { ...k, x: k.x + splitGap };
      return k;
    };
    return {
      adjustedParsedKeys: parsedKeys.map(adjustKey),
      adjustedMappedLayers: mappedLayers.map(layer => layer.map(adjustKey))
    };
  }, [parsedKeys, mappedLayers, splitGap]);

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
        setTapDances(active);
      }

      const info: any = { name: name.replace(/\.vil$/i, '') };
      if (data.settings) {
        if (data.settings["4"] !== undefined) info.tappingTerm = data.settings["4"];
        if (data.settings["7"] !== undefined) info.comboTerm = data.settings["7"];
        if (data.settings["25"] !== undefined) info.oneshotTimeout = data.settings["25"];
      }
      setLayoutInfo(info);

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

  const downloadPrintSVG = () => {
    const el = document.getElementById('print-svg');
    if (!el) return;
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('.no-print').forEach(node => node.remove());

    const pbAttr = el.getAttribute('data-active-viewbox');
    if (pbAttr) {
      clone.setAttribute('viewBox', pbAttr);
    }

    const src = '<?xml version="1.0" standalone="no">\n' + new XMLSerializer().serializeToString(clone);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
    a.download = `cheatsheet_print_${printOrientation}.svg`;
    a.click();
  };

  const toggleLayerVisibility = (idx: number) => {
    if (canvasControls) {
      canvasControls.toggleLayerVisibility(idx);
    } else {
      setHiddenLayers(prev => ({ ...prev, [idx]: !prev[idx] }));
    }
  };

  const hasExtras = combos.length > 0 || tapDances.length > 0;

  return (
    <div className="maker-container">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json,.vil" onChange={e => handleFileInput(e.target.files?.[0])} />

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
          ) : (
            <div className="print-layout-wrapper">
              <style>{`
                @media print {
                  @page {
                    size: A4 ${printOrientation === 'landscape' ? 'landscape' : 'portrait'};
                    margin: 8mm;
                  }
                }
              `}</style>



              <PrintCanvas
                mappedLayers={adjustedMappedLayers}
                parsedKeys={adjustedParsedKeys}
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
                arrowWidth={arrowWidth}
                layoutInfo={layoutInfo}
                combos={combos}
                tapDances={tapDances}
                showInfoPane={showInfoPane}
                setShowInfoPane={setShowInfoPane}
                layerNames={layerNames}
                setLayerNames={setLayerNames}
                hiddenLayers={hiddenLayers}
                setHiddenLayers={setHiddenLayers}
                onRegisterControls={setCanvasControls}
              />
            </div>
          )}
        </div>

        {/* ── Sidebar Tools ── */}
        <aside className="sidebar-panels no-print" style={{ width: sidebarWidth }}>
          <div className="resize-handle" onMouseDown={startResizing} />

          <div className="glass-card panel" style={{ paddingBottom: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}>📂 Upload .vil File</button>
          </div>

          <div className="glass-card panel">
            <h3>Canvas & Export</h3>
            <div className="form-group">
              <label>A4 Orientation</label>
              <select className="select-input" value={printOrientation} onChange={(e) => setPrintOrientation(e.target.value)}>
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={!disableArrows} onChange={e => setDisableArrows(!e.target.checked)} />
                <span>Show Arrows</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={colorLayerButtons} onChange={e => setColorLayerButtons(e.target.checked)} />
                <span>Color Coded Layers</span>
              </label>
            </div>

            <div className="sliders-grid" style={{ marginTop: '0.5rem' }}>
              <div className="slider-item">
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Zoom</span>
                  <span>{Math.round(printZoom * 100)}%</span>
                </label>
                <input type="range" min="0.2" max="5.0" step="0.1" value={printZoom} onChange={e => setPrintZoom(Number(e.target.value))} />
              </div>
              <div className="slider-item">
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Arrow Width</span>
                  <span>{arrowWidth}px</span>
                </label>
                <input type="range" min="1" max="8" step="0.5" value={arrowWidth} onChange={e => setArrowWidth(Number(e.target.value))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={downloadPrintSVG}>💾 SVG</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => window.print()}>🖨️ PDF</button>
            </div>
            {canvasControls && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={canvasControls.fitToPage}>🔍 Fit to Page</button>
                {canvasControls.canResetArrows && (
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={canvasControls.resetArrows}>🔄 Reset Arrows</button>
                )}
              </div>
            )}
          </div>

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: collapsedPanels.layers ? 0 : '0.5rem' }} onClick={() => togglePanel('layers')}>
              <h3 style={{ margin: 0 }}>Layers & Panels</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>{collapsedPanels.layers ? '▼' : '▲'}</span>
            </div>
            {!collapsedPanels.layers && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {mappedLayers.map((_, i) => {
                  const isVisible = !hiddenLayers[i];
                  const layerColor = ARROW_COLORS[i % 8];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => toggleLayerVisibility(i)}
                        />
                        <span
                          className="toggle-slider"
                          style={{
                            backgroundColor: isVisible ? layerColor : undefined,
                            borderColor: isVisible ? layerColor : undefined
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        value={layerNames[i] ?? `Layer ${i}`}
                        onChange={e => setLayerNames(prev => ({ ...prev, [i]: e.target.value }))}
                        placeholder={`Layer ${i}`}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.85rem',
                          padding: '4px 8px',
                          flex: 1,
                          outline: 'none'
                        }}
                      />
                    </div>
                  );
                })}

                {showInfoPane !== undefined && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showInfoPane}
                        onChange={e => setShowInfoPane(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span style={{ fontSize: '0.85rem', color: '#fff', userSelect: 'none', fontWeight: 600 }}>
                      Info Pane
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass-card panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: collapsedPanels.theme ? 0 : '0.5rem' }} onClick={() => togglePanel('theme')}>
              <h3 style={{ margin: 0 }}>Theme</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>{collapsedPanels.theme ? '▼' : '▲'}</span>
            </div>
            {!collapsedPanels.theme && (
              <div className="theme-grid">
              {Object.values(THEMES).map((t: any) => (
                <button key={t.id} className={`theme-badge ${themeId === t.id ? 'active' : ''}`} onClick={() => setThemeId(t.id)} style={{ background: t.bg }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: t.keyAlpha }}></span>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: t.keyModifier }}></span>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: t.keyAccent }}></span>
                </button>
              ))}
              </div>
            )}
          </div>

          <div className="glass-card panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: collapsedPanels.typography ? 0 : '0.5rem' }} onClick={() => togglePanel('typography')}>
              <h3 style={{ margin: 0 }}>Typography & Labels</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>{collapsedPanels.typography ? '▼' : '▲'}</span>
            </div>
            {!collapsedPanels.typography && (
              <>
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
              </>
            )}
          </div>

          <div className="glass-card panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: collapsedPanels.dimensions ? 0 : '0.5rem' }} onClick={() => togglePanel('dimensions')}>
              <h3 style={{ margin: 0 }}>Dimensions</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>{collapsedPanels.dimensions ? '▼' : '▲'}</span>
            </div>
            {!collapsedPanels.dimensions && (
              <div className="sliders-grid">
              <div className="slider-item">
                <label>Gap: {keyGap}px</label>
                <input type="range" min="0" max="10" value={keyGap} onChange={e => setKeyGap(Number(e.target.value))} />
              </div>
              <div className="slider-item">
                <label>Split Gap: {splitGap.toFixed(1)}</label>
                <input type="range" min="-5" max="5" step="0.1" value={splitGap} onChange={e => setSplitGap(Number(e.target.value))} />
              </div>
              <div className="slider-item">
                <label>Border Radius: {radius}px</label>
                <input type="range" min="0" max="16" value={radius} onChange={e => setRadius(Number(e.target.value))} />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
