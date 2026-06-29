import React from 'react';
import { useCanvasInteractions } from '../hooks/useCanvasInteractions';
import { translateKeycode } from '../keycodes';
import { formatLabel, solveCatmullRom, getTargetLayer } from '../utils';
import type { Theme, ParsedKey } from '../types';

interface PrintCanvasProps {
  mappedLayers: ParsedKey[][];
  parsedKeys: ParsedKey[];
  theme: Theme;
  unitSize: number;
  keyGap: number;
  radius: number;
  fontSize: number;
  fontFamily: string;
  labelMode: string;
  colorLayerButtons: boolean;
  arrowColors: string[];
  printOrientation: string;
  printZoom: number;
  setPrintZoom: React.Dispatch<React.SetStateAction<number>>;
  disableArrows: boolean;
  setDisableArrows: React.Dispatch<React.SetStateAction<boolean>>;
  setColorLayerButtons: React.Dispatch<React.SetStateAction<boolean>>;
}

export function PrintCanvas({
  mappedLayers,
  parsedKeys,
  theme,
  unitSize,
  keyGap,
  radius,
  fontSize,
  fontFamily,
  labelMode,
  colorLayerButtons,
  arrowColors,
  printOrientation,
  printZoom,
  setPrintZoom,
  disableArrows
}: PrintCanvasProps) {
  const {
    layerPositions,
    arrowMidpoints,
    setArrowMidpoints,
    hiddenLayers,
    viewOff,
    svgDrag,
    snapGuides,
    svgRef,
    onCanvasDown,
    onLayerDown,
    onArrowHandleDown,
    onSVGMove,
    onSVGUp,
    toggleLayerVisibility,
    fitVisibleToPage
  } = useCanvasInteractions(mappedLayers, parsedKeys, unitSize, keyGap, printOrientation, printZoom, setPrintZoom);

  const CPU = unitSize;
  const CPG = keyGap;
  const CPR = radius;
  const CPF = fontSize;
  const CPAD = 0.5;
  const CLABEL = Math.max(28, fontSize + 12);

  const keyStyle = (key: ParsedKey) => {
    const code = key.keycode ?? '';
    if (code === '__PHANTOM__') return { invisible: true } as any;

    const toLayer = getTargetLayer(code, mappedLayers.length);
    const { type } = translateKeycode(code);

    if (colorLayerButtons && toLayer !== null) {
      const color = arrowColors[toLayer % 8];
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
      case 'layertap': return { fill: theme.keyAccent,   text: theme.keyAccentText,   nested: true };
      case 'modtap':   return { fill: theme.keyModifier, text: theme.keyModifierText, nested: true };
      case 'special':  return { fill: theme.keyAccent,   text: theme.keyAccentText };
      case 'trans':    return { fill: theme.bg, text: theme.keyAlphaText, dashed: true };
      case 'empty':    return { fill: theme.bg, text: theme.keyAlphaText, dashed: true };
      default:         return { fill: theme.keyAlpha,    text: theme.keyAlphaText };
    }
  };

  const renderCanvasKeys = (layerIdx: number, offX: number, offY: number) =>
    (mappedLayers[layerIdx] || []).map((key, i) => {
      const style = keyStyle(key);
      if (style.invisible) return null;
      const x = (key.x + CPAD) * CPU + offX, y = (key.y + CPAD) * CPU + offY;
      const kw = key.w * CPU, kh = key.h * CPU;
      const bx = x + CPG / 2, by = y + CPG / 2, bw = kw - CPG, bh = kh - CPG;
      const { label } = translateKeycode(key.keycode ?? '');
      const lines = (formatLabel(label, labelMode) ?? '').split('\n');
      const tr = key.r ? `rotate(${key.r} ${(key.rx! + CPAD) * CPU + offX} ${(key.ry! + CPAD) * CPU + offY})` : undefined;
      
      if (style.nested) {
        const tap = lines[0] ?? '', hold = (lines[1] ?? '').replace(/[()]/g, '');
        const ip = 2, ir = Math.max(0, CPR - 2), ih = Math.round(bh * 0.52), iw = bw - ip * 2;
        const ix = bx + ip, iy = by + ip, hy = iy + ih + (bh - ih - ip) / 2 + CPF * 0.35;
        return (
          <g key={i} transform={tr}>
            {theme.id !== 'mono_print' && <rect x={bx} y={by + 1} width={bw} height={bh} fill="rgba(0,0,0,0.12)" rx={CPR} />}
            <rect x={bx} y={by} width={bw} height={bh} fill={style.fill} stroke={theme.boardColor} strokeWidth={1} rx={CPR} />
            <text x={bx + bw / 2} y={hy} textAnchor="middle" fontSize={CPF * 0.78} fill={style.text} fontWeight="700" style={{ userSelect: 'none' }}>{hold}</text>
            {theme.id !== 'mono_print' && <rect x={ix} y={iy + 1} width={iw} height={ih} fill="rgba(0,0,0,0.15)" rx={ir} />}
            <rect x={ix} y={iy} width={iw} height={ih} fill={theme.keyAlpha} stroke={theme.boardColor} strokeWidth={0.75} rx={ir} />
            <text x={ix + iw / 2} y={iy + ih / 2 + CPF * 0.35} textAnchor="middle" fontSize={CPF} fill={theme.keyAlphaText} fontWeight="700" style={{ userSelect: 'none' }}>{tap}</text>
          </g>
        );
      }
      return (
        <g key={i} transform={tr}>
          {!(style as any).ghost && theme.id !== 'mono_print' && <rect x={bx} y={by + 1} width={bw} height={bh} fill="rgba(0,0,0,0.12)" rx={CPR} />}
          <rect x={bx} y={by} width={bw} height={bh}
            fill={style.fill}
            stroke={(style as any).ghost ? theme.keyAlpha + '66' : (style as any).dashed ? theme.keyModifierText + '44' : theme.boardColor}
            strokeWidth={1} strokeDasharray={(style as any).dashed ? '3 2' : (style as any).ghost ? '2 2' : undefined} rx={CPR} />
          {!(style as any).ghost && (
            <text x={x + kw / 2} y={y + kh / 2 + (lines.length > 1 ? -CPF / 2 : CPF / 3.5)}
              textAnchor="middle" fontSize={CPF} fill={style.text} fontWeight="600" style={{ userSelect: 'none' }}>
              {lines.map((ln, li) => <tspan key={li} x={x + kw / 2} dy={li > 0 ? CPF + 1.5 : 0}>{ln}</tspan>)}
            </text>
          )}
        </g>
      );
    });

  const buildCanvasArrows = () => {
    if (!parsedKeys.length || !mappedLayers.length) return [];
    const mx = Math.max(...parsedKeys.map(k => k.x + k.w));
    const my = Math.max(...parsedKeys.map(k => k.y + k.h));
    const kbW = (mx + CPAD * 2) * CPU, kbH = (my + CPAD * 2) * CPU;

    const boxes: Record<number, { x1: number, y1: number, x2: number, y2: number }> = {};
    mappedLayers.forEach((_, i) => {
      const p = layerPositions[i] || { x: 0, y: 0 };
      boxes[i] = { x1: p.x, y1: p.y, x2: p.x + kbW, y2: p.y + kbH + CLABEL };
    });

    const arrows: any[] = []; let gIdx = 0;
    mappedLayers.forEach((_, fromLayer) => {
      if (hiddenLayers[fromLayer]) return;
      (mappedLayers[fromLayer] || []).forEach((key, keyIndex) => {
        const to = getTargetLayer(key.keycode ?? '', mappedLayers.length);
        if (to === null || to === fromLayer || !layerPositions[to] || !layerPositions[fromLayer]) return;
        if (hiddenLayers[to]) return;
        
        const fp = layerPositions[fromLayer], tp = layerPositions[to];
        const sx = fp.x + (key.x + CPAD) * CPU + key.w * CPU / 2;
        const sy = fp.y + CLABEL + (key.y + CPAD) * CPU + key.h * CPU / 2;
        const ex = tp.x + kbW / 2;
        const ey = tp.y + CLABEL * 0.4;

        const dx = ex - sx, dy = ey - sy, len = Math.sqrt(dx * dx + dy * dy) || 1;
        const px = -dy / len, py = dx / len;
        const spread = (gIdx % 7 - 3) * 14;
        const arcH = 50 + (gIdx % 5) * 18;

        const arrowId = `${fromLayer}-${keyIndex}`;
        const custom = arrowMidpoints[arrowId];

        const c1x = sx + dx * 0.25 + px * (spread + arcH * 0.3);
        const c1y = sy + dy * 0.25 + py * (spread + arcH * 0.3);
        const c2x = ex - dx * 0.25 + px * (spread + arcH * 0.2);
        const c2y = ey - dy * 0.25 + py * (spread + arcH * 0.2);
        let mx2 = (c1x + c2x) / 2, my2 = (c1y + c2y) / 2;

        Object.entries(boxes).forEach(([bi, b]) => {
          if (+bi === fromLayer || +bi === to) return;
          if (mx2 > b.x1 && mx2 < b.x2 && my2 > b.y1 && my2 < b.y2) {
            const dists = [
              { d: mx2 - b.x1, dir: 'left' }, { d: b.x2 - mx2, dir: 'right' },
              { d: my2 - b.y1, dir: 'top' }, { d: b.y2 - my2, dir: 'bottom' },
            ];
            const { d, dir } = dists.reduce((a, v) => v.d < a.d ? v : a);
            const push = d + 30;
            if (dir === 'left') { mx2 -= push; }
            if (dir === 'right') { mx2 += push; }
            if (dir === 'top') { my2 -= push; }
            if (dir === 'bottom') { my2 += push; }
          }
        });

        const p0 = (custom && custom[0]) ? custom[0] : { x: c1x, y: c1y };
        const p1 = (custom && custom[1]) ? custom[1] : { x: mx2, y: my2 };
        const p2 = (custom && custom[2]) ? custom[2] : { x: c2x, y: c2y };

        arrows.push({
          arrowId, fromLayer, toLayer: to,
          sx, sy, ex, ey, p0, p1, p2,
          color: theme.id === 'mono_print' ? '#000000' : arrowColors[to % 8]
        });
        gIdx++;
      });
    });
    return arrows;
  };

  if (!parsedKeys.length || !mappedLayers.length) return null;

  const mx = Math.max(...parsedKeys.map(k => k.x + k.w));
  const my = Math.max(...parsedKeys.map(k => k.y + k.h));
  const kbW = (mx + CPAD * 2) * CPU, kbH = (my + CPAD * 2) * CPU;
  // Exact A4 aspect ratio with 8mm margins:
  // Portrait printable area: 194mm x 281mm. Base 1200 -> 1738.
  // Landscape printable area: 281mm x 194mm. Base 1800 -> 1243.
  const baseVW = printOrientation === 'landscape' ? 1800 : 1200;
  const baseVH = printOrientation === 'landscape' ? 1240 : 1735;
  const VW = baseVW * printZoom;
  const VH = baseVH * printZoom;
  const arrows = buildCanvasArrows();
  const isDraggingLayer = svgDrag?.type === 'layer';

  return (
    <>
      <div className="no-print checkboxes-row" style={{ padding: '0.5rem 1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', marginBottom: '10px', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--slate-400)', fontWeight: 600 }}>Visible Layers:</span>
        {mappedLayers.map((_, i) => (
          <label key={i} className="checkbox-label" style={{ margin: 0 }}>
            <input type="checkbox" checked={!hiddenLayers[i]} onChange={() => toggleLayerVisibility(i)} />
            <span>Layer {i}</span>
          </label>
        ))}
      </div>

      <div className="canvas-hint no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🖱 Drag keyboards to arrange (snaps to align) · Drag 3 points on arrows to bend · Drag background/wheel to pan · Ctrl+Wheel to zoom</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fitVisibleToPage} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }} title="Scale and center all visible layers to fit on one page">
            🔍 Fit to Page
          </button>
          {Object.keys(arrowMidpoints).length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setArrowMidpoints({})} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}>
              🔄 Reset Arrows
            </button>
          )}
        </div>
      </div>
      <div className="print-svg-container" style={{ background: theme.bg, borderRadius: 12, overflow: 'hidden' }}>
        <svg ref={svgRef as React.RefObject<SVGSVGElement>}
          id="print-svg"
          viewBox={`${viewOff.x} ${viewOff.y} ${VW} ${VH}`}
          style={{ display: 'block', width: '100%', height: '70vh', cursor: svgDrag ? 'grabbing' : 'grab', fontFamily }}
          onMouseDown={onCanvasDown}
          onMouseMove={onSVGMove}
          onMouseUp={onSVGUp}
          onMouseLeave={onSVGUp}
        >
          {/* Infinite background */}
          <rect x={-5000} y={-5000} width={15000} height={15000} fill={theme.bg} />
          {/* Dot grid */}
          <pattern id="dot-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill={theme.id === 'mono_print' ? 'rgba(0,0,0,0.15)' : theme.keyAlpha + '22'} />
          </pattern>
          <rect x={-5000} y={-5000} width={15000} height={15000} fill="url(#dot-grid)" className="no-print" />

          {/* Print Boundary Overlay */}
          <rect x={viewOff.x + 20} y={viewOff.y + 20} width={VW - 40} height={VH - 40} 
            fill="none" stroke="var(--amber-500)" strokeWidth="4" strokeDasharray="12,12" 
            rx="8" className="no-print" style={{ pointerEvents: 'none', opacity: 0.5 }} />
          <text x={viewOff.x + 30} y={viewOff.y + 45} fill="var(--amber-500)" fontSize="16" fontWeight="bold" 
            className="no-print" style={{ pointerEvents: 'none', opacity: 0.7 }}>Print Boundary (A4 {printOrientation})</text>

          {/* Arrow shadows */}
          {!disableArrows && arrows.map((a, i) => (
            <path key={`as${i}`} d={solveCatmullRom([ {x: a.sx, y: a.sy}, a.p0, a.p1, a.p2, {x: a.ex, y: a.ey} ])}
              fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={3} className="no-print" />
          ))}

          {/* Layer keyboards */}
          {mappedLayers.map((_, layerIdx) => {
            if (hiddenLayers[layerIdx]) return null;
            const p = layerPositions[layerIdx] || { x: 0, y: 0 };
            const isActive = svgDrag?.type === 'layer' && (svgDrag as any).layerIdx === layerIdx;
            return (
              <g key={layerIdx} transform={`translate(${p.x},${p.y})`}
                onMouseDown={e => onLayerDown(e, layerIdx)}
                style={{ cursor: isDraggingLayer && isActive ? 'grabbing' : 'grab' }}
              >
                {isActive && theme.id !== 'mono_print' && <rect x={2} y={2} width={kbW} height={kbH + CLABEL} fill="rgba(0,0,0,0.35)" rx={CPR + 4} />}
                <rect x={0} y={0} width={kbW} height={CLABEL}
                  fill={theme.id === 'mono_print' ? '#ffffff' : theme.boardColor} rx={CPR + 2}
                  stroke={theme.id === 'mono_print' ? '#000000' : (isActive ? arrowColors[layerIdx % 8] : 'transparent')} strokeWidth={1.5} />
                <text x={kbW / 2} y={CLABEL * 0.68}
                  textAnchor="middle" fontSize={13} fontWeight="800"
                  fill={theme.id === 'mono_print' ? '#000000' : arrowColors[layerIdx % 8]} style={{ userSelect: 'none', pointerEvents: 'none' }}
                >Layer {layerIdx}</text>
                
                <g className="no-print" style={{ cursor: 'pointer' }}
                  onMouseDown={e => { e.stopPropagation(); toggleLayerVisibility(layerIdx); }}
                >
                  <circle cx={kbW - 14} cy={CLABEL / 2} r={8} fill={theme.id === 'mono_print' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'} />
                  <text x={kbW - 14} y={CLABEL / 2 + 3} textAnchor="middle" fontSize={10} fill={theme.id === 'mono_print' ? '#000000' : '#ffffff'} fontWeight="bold" style={{ userSelect: 'none' }}>×</text>
                </g>

                <rect x={CPAD * CPU - 6} y={CLABEL + CPAD * CPU - 6}
                  width={kbW - CPAD * 2 * CPU + 12} height={kbH - CPAD * 2 * CPU + 12}
                  fill={theme.id === 'mono_print' ? '#ffffff' : theme.boardColor}
                  stroke={theme.id === 'mono_print' ? '#000000' : 'none'}
                  strokeWidth={theme.id === 'mono_print' ? 1.5 : 0}
                  rx={CPR + 4} />
                <g style={{ pointerEvents: 'none' }}>{renderCanvasKeys(layerIdx, 0, CLABEL)}</g>
              </g>
            );
          })}

          {/* Arrows */}
          {!disableArrows && arrows.map((a, i) => (
            <g key={`a${i}`} style={{ pointerEvents: 'none' }}>
              <path d={solveCatmullRom([{ x: a.sx, y: a.sy }, a.p0, a.p1, a.p2, { x: a.ex, y: a.ey }])}
                fill="none" stroke={a.color} strokeWidth={1.8} strokeDasharray="6 3" opacity={0.9} />
              <circle cx={a.ex} cy={a.ey} r={4} fill={a.color} />
              <circle cx={a.sx} cy={a.sy} r={2.5} fill={a.color} opacity={0.7} />
            </g>
          ))}

          {/* Draggable Arrow Handles */}
          {!disableArrows && arrows.map((a, i) => {
            const isDraggingThis = svgDrag && svgDrag.type === 'arrowControl' && (svgDrag as any).arrowId === a.arrowId;
            return (
              <g key={`ah${i}`} className="no-print">
                {isDraggingThis && (
                  <g style={{ pointerEvents: 'none' }} opacity={0.45}>
                    <line x1={a.sx} y1={a.sy} x2={a.p0.x} y2={a.p0.y} stroke={a.color} strokeWidth={1} strokeDasharray="3 3" />
                    <line x1={a.p0.x} y1={a.p0.y} x2={a.p1.x} y2={a.p1.y} stroke={a.color} strokeWidth={1} strokeDasharray="3 3" />
                    <line x1={a.p1.x} y1={a.p1.y} x2={a.p2.x} y2={a.p2.y} stroke={a.color} strokeWidth={1} strokeDasharray="3 3" />
                    <line x1={a.p2.x} y1={a.p2.y} x2={a.ex} y2={a.ey} stroke={a.color} strokeWidth={1} strokeDasharray="3 3" />
                  </g>
                )}
                <circle cx={a.p0.x} cy={a.p0.y} r={12} fill="transparent" style={{ cursor: 'move' }} onMouseDown={e => onArrowHandleDown(e, a.arrowId, 0, a.p0.x, a.p0.y)} />
                <circle cx={a.p0.x} cy={a.p0.y} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />

                <circle cx={a.p1.x} cy={a.p1.y} r={12} fill="transparent" style={{ cursor: 'move' }} onMouseDown={e => onArrowHandleDown(e, a.arrowId, 1, a.p1.x, a.p1.y)} />
                <circle cx={a.p1.x} cy={a.p1.y} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />

                <circle cx={a.p2.x} cy={a.p2.y} r={12} fill="transparent" style={{ cursor: 'move' }} onMouseDown={e => onArrowHandleDown(e, a.arrowId, 2, a.p2.x, a.p2.y)} />
                <circle cx={a.p2.x} cy={a.p2.y} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
              </g>
            );
          })}

          {/* Smart alignment guides */}
          {snapGuides.map((g, idx) => {
            if (g.type === 'v') {
              return <line key={`sg${idx}`} x1={g.x} y1={(g.y1||0) - 60} x2={g.x} y2={(g.y2||0) + 60} stroke="#ff4d4d" strokeWidth={1.5} strokeDasharray="5 3" className="no-print" />;
            } else {
              return <line key={`sg${idx}`} x1={(g.x1||0) - 60} y1={g.y} x2={(g.x2||0) + 60} y2={g.y} stroke="#ff4d4d" strokeWidth={1.5} strokeDasharray="5 3" className="no-print" />;
            }
          })}
        </svg>
      </div>
    </>
  );
}
