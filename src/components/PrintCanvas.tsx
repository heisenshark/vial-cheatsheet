import React, { useState, useEffect } from 'react';
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
  arrowWidth: number;
  layoutInfo?: any;
  combos?: any[];
  tapDances?: any[];
  showInfoPane?: boolean;
  setShowInfoPane: React.Dispatch<React.SetStateAction<boolean>>;
  layerNames: Record<number, string>;
  setLayerNames: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  hiddenLayers: Record<number, boolean>;
  setHiddenLayers: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

function getBoxIntersection(cx: number, cy: number, w: number, h: number, tx: number, ty: number): Point {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scaleX = dx !== 0 ? Math.abs((w / 2) / dx) : Infinity;
  const scaleY = dy !== 0 ? Math.abs((h / 2) / dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  // Cap the scale to not overshoot the target
  const clampedScale = Math.min(scale, 1);
  return {
    x: cx + dx * clampedScale,
    y: cy + dy * clampedScale
  };
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
  disableArrows,
  setColorLayerButtons,
  arrowWidth,
  layoutInfo,
  combos = [],
  tapDances = [],
  showInfoPane,
  setShowInfoPane,
  layerNames,
  setLayerNames,
  hiddenLayers,
  setHiddenLayers
}: PrintCanvasProps) {
  const {
    layerPositions,
    arrowMidpoints,
    resetArrows,
    infoPanePos,
    viewOff,
    svgDrag,
    snapGuides,
    svgRef,
    onCanvasDown,
    onLayerDown,
    onPaneDown,
    onArrowHandleDown,
    onSVGMove,
    onSVGUp,
    toggleLayerVisibility,
    fitVisibleToPage
  } = useCanvasInteractions(mappedLayers, parsedKeys, unitSize, keyGap, printOrientation, printZoom, setPrintZoom, !!showInfoPane, combos, tapDances, hiddenLayers, setHiddenLayers);

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

  const buildCanvasArrows = (paneKeyPositions: Record<string, {x: number, y: number, w: number, h: number}> = {}) => {
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
        const cx = fp.x + (key.x + CPAD) * CPU + key.w * CPU / 2;
        const cy = fp.y + CLABEL + (key.y + CPAD) * CPU + key.h * CPU / 2;
        
        const tCx = tp.x + kbW / 2;
        const tCy = tp.y + (kbH + CLABEL) / 2;

        const arrowId = `${fromLayer}-${keyIndex}`;
        const custom = arrowMidpoints[arrowId];

        const startTarget = (custom && custom[3]) ? custom[3] : { x: tCx, y: tCy };
        const endTarget = (custom && custom[4]) ? custom[4] : { x: cx, y: cy };

        const startPoint = getBoxIntersection(cx, cy, key.w * CPU, key.h * CPU, startTarget.x, startTarget.y);
        const endPoint = getBoxIntersection(tCx, tCy, kbW, kbH + CLABEL, endTarget.x, endTarget.y);

        const sx = startPoint.x;
        const sy = startPoint.y;
        const ex = endPoint.x;
        const ey = endPoint.y;

        const dx = ex - sx, dy = ey - sy, len = Math.sqrt(dx * dx + dy * dy) || 1;
        const px = -dy / len, py = dx / len;
        const spread = (gIdx % 7 - 3) * 14;
        const arcH = 50 + (gIdx % 5) * 18;

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
          color: (theme.id === 'mono_print' && !colorLayerButtons) ? '#000000' : arrowColors[to % 8]
        });
        gIdx++;
      });
    });

    if (showInfoPane) {
      const paneW = 340;
      const paneH = 36; // just header height — arrow comes from top of pane
      const paneCx = infoPanePos.x + paneW / 2;
      const paneCy = infoPanePos.y + paneH / 2;

      // Collect unique target layers from combos and tap dances
      const targetLayers = new Set<number>();
      combos.forEach(c => {
        const to = getTargetLayer(c.action, mappedLayers.length);
        if (to !== null && layerPositions[to] && !hiddenLayers[to]) targetLayers.add(to);
      });
      tapDances.forEach(td => {
        [td.tap, td.hold].forEach(action => {
          const to = getTargetLayer(action, mappedLayers.length);
          if (to !== null && layerPositions[to] && !hiddenLayers[to]) targetLayers.add(to);
        });
      });

      targetLayers.forEach(to => {
        const arrowId = `pane-to-${to}`;
        const tp = layerPositions[to];
        const tCx = tp.x + kbW / 2;
        const tCy = tp.y + (kbH + CLABEL) / 2;

        const custom = arrowMidpoints[arrowId];

        // Start is clamped to keycap edge: drag position used as direction, projected onto box boundary
        const measured = paneKeyPositions[arrowId];
        let sx: number, sy: number;
        if (measured) {
          // Use custom[3] as direction target if dragged, else aim toward target layer
          const aimed = (custom && custom[3]) ? custom[3] : { x: tCx, y: tCy };
          const edge = getBoxIntersection(measured.x, measured.y, measured.w, measured.h, aimed.x, aimed.y);
          sx = edge.x;
          sy = edge.y;
        } else {
          sx = infoPanePos.x + paneW / 2;
          sy = infoPanePos.y;
        }

        // End: snap to nearest edge of target layer box
        const endAimX = (custom && custom[4]) ? custom[4].x : paneCx;
        const endAimY = (custom && custom[4]) ? custom[4].y : paneCy;
        const endPt = getBoxIntersection(tCx, tCy, kbW, kbH + CLABEL, endAimX, endAimY);
        const ex = endPt.x, ey = endPt.y;

        const dx = ex - sx, dy = ey - sy;
        const c1x = sx + dx * 0.25, c1y = sy + dy * 0.25;
        const c2x = ex - dx * 0.25, c2y = ey - dy * 0.25;
        const mx2 = (c1x + c2x) / 2, my2 = (c1y + c2y) / 2;

        const p0 = (custom && custom[0]) ? custom[0] : { x: c1x, y: c1y };
        const p1 = (custom && custom[1]) ? custom[1] : { x: mx2, y: my2 };
        const p2 = (custom && custom[2]) ? custom[2] : { x: c2x, y: c2y };

        arrows.push({
          arrowId, fromLayer: -1, toLayer: to,
          sx, sy, ex, ey, p0, p1, p2,
          color: (theme.id === 'mono_print' && !colorLayerButtons) ? '#000000' : arrowColors[to % 8]
        });
      });
    }

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
  const isDraggingLayer = svgDrag?.type === 'layer';

  // Measure actual SVG-space positions of layer-trigger keycaps inside the foreignObject
  const [paneKeyPositions, setPaneKeyPositions] = useState<Record<string, {x: number, y: number, w: number, h: number}>>({});
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !showInfoPane) { setPaneKeyPositions({}); return; }
    const doMeasure = () => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const elements = svg.querySelectorAll('[data-pane-arrow-id]');
      const positions: Record<string, {x: number, y: number}> = {};
      elements.forEach(el => {
        const id = el.getAttribute('data-pane-arrow-id');
        if (!id) return;
        const rect = el.getBoundingClientRect();
        const ctmInv = ctm.inverse();
        const ptC = svg.createSVGPoint();
        ptC.x = rect.left + rect.width / 2;
        ptC.y = rect.top + rect.height / 2;
        const svgC = ptC.matrixTransform(ctmInv);
        const ptTL = svg.createSVGPoint();
        ptTL.x = rect.left; ptTL.y = rect.top;
        const svgTL = ptTL.matrixTransform(ctmInv);
        const ptBR = svg.createSVGPoint();
        ptBR.x = rect.right; ptBR.y = rect.bottom;
        const svgBR = ptBR.matrixTransform(ctmInv);
        positions[id] = {
          x: svgC.x, y: svgC.y,
          w: Math.abs(svgBR.x - svgTL.x),
          h: Math.abs(svgBR.y - svgTL.y)
        };
      });
      setPaneKeyPositions(positions);
    };
    // Use rAF so we measure after each browser paint — updates live during drag
    const raf = requestAnimationFrame(doMeasure);
    return () => cancelAnimationFrame(raf);
  }, [showInfoPane, combos, tapDances, infoPanePos, svgRef, viewOff, printZoom]);

  const arrows = buildCanvasArrows(paneKeyPositions);

  const Keycap = ({ children, targetLayer, arrowId }: { children: React.ReactNode, targetLayer?: number | null, arrowId?: string }) => {
    const isLayerTrigger = targetLayer != null && colorLayerButtons;
    return (
      <div
        data-pane-arrow-id={targetLayer != null && arrowId ? arrowId : undefined}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: isLayerTrigger ? arrowColors[targetLayer % 8] : (theme.id === 'mono_print' ? '#f0f0f0' : 'rgba(255,255,255,0.05)'),
          border: `1px solid ${theme.boardColor}`, borderRadius: '4px', padding: '3px 8px',
          minWidth: '24px', height: '26px', fontSize: '12px', fontWeight: 600,
          boxShadow: '0 2px 0 rgba(0,0,0,0.15)', 
          color: isLayerTrigger ? '#121212' : (theme.id === 'mono_print' ? '#000000' : theme.keyAlphaText),
          whiteSpace: 'nowrap', margin: '0 2px'
        }}
      >
        {children}
      </div>
    );
  };

  return (
    <>
      <div className="canvas-hint no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span>🖱 Drag keyboards to arrange (snaps to align) · Drag 3 points on arrows to bend · Drag background/wheel to pan · Ctrl+Wheel to zoom</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fitVisibleToPage} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }} title="Scale and center all visible layers to fit on one page">
            🔍 Fit to Page
          </button>
          {Object.keys(arrowMidpoints).length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => resetArrows()} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }} title="Reset all arrow curves to their default calculated positions">
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

          <defs>
            {Array.from(new Set(arrows.map(a => a.color))).map(c => (
              <marker key={c} id={`arrowhead-${c.replace('#','')}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill={c} />
              </marker>
            ))}
          </defs>

          {/* Print Boundary Overlay */}
          <rect x={viewOff.x + 20} y={viewOff.y + 20} width={VW - 40} height={VH - 40} 
            fill="none" stroke="var(--amber-500)" strokeWidth="4" strokeDasharray="12,12" 
            rx="8" className="no-print" style={{ pointerEvents: 'none', opacity: 0.5 }} />
          <text x={viewOff.x + 30} y={viewOff.y + 45} fill="var(--amber-500)" fontSize="16" fontWeight="bold" 
            className="no-print" style={{ pointerEvents: 'none', opacity: 0.7 }}>Print Boundary (A4 {printOrientation})</text>

          {/* Arrow shadows */}
          {!disableArrows && arrows.map((a, i) => (
            <path key={`as${i}`} d={solveCatmullRom([ {x: a.sx, y: a.sy}, a.p0, a.p1, a.p2, {x: a.ex, y: a.ey} ])}
              fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={arrowWidth + 1} className="no-print" />
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
                  fill={colorLayerButtons ? arrowColors[layerIdx % 8] : (theme.id === 'mono_print' ? '#ffffff' : theme.boardColor)} rx={CPR + 2}
                  stroke={theme.id === 'mono_print' && !colorLayerButtons ? '#000000' : (isActive && !colorLayerButtons ? arrowColors[layerIdx % 8] : 'transparent')} strokeWidth={1.5} />
                <text x={kbW / 2} y={CLABEL * 0.68}
                  textAnchor="middle" fontSize={13} fontWeight="800"
                  fill={colorLayerButtons ? '#121212' : (theme.id === 'mono_print' ? '#000000' : arrowColors[layerIdx % 8])} style={{ userSelect: 'none', pointerEvents: 'none' }}
                >{layerNames[layerIdx] ?? `Layer ${layerIdx}`}</text>
                
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

          {/* Info Pane — rendered before arrows so arrows draw on top */}
          {showInfoPane && (
            <g transform={`translate(${infoPanePos.x}, ${infoPanePos.y})`}>
              <foreignObject x={0} y={0} width={340} height={1200}>
                <div style={{
                  width: '100%',
                  background: theme.id === 'mono_print' ? '#ffffff' : theme.bg,
                  border: `2px solid ${theme.boardColor}`,
                  borderRadius: '12px',
                  color: theme.id === 'mono_print' ? '#000000' : theme.keyAlphaText,
                  fontFamily: fontFamily,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div onMouseDown={onPaneDown} className="no-print" style={{
                    padding: '10px 16px',
                    background: theme.id === 'mono_print' ? '#f4f4f5' : theme.boardColor,
                    cursor: 'move',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: theme.id === 'mono_print' ? '#000000' : theme.keyAlphaText,
                    borderTopLeftRadius: '10px',
                    borderTopRightRadius: '10px',
                    borderBottom: theme.id === 'mono_print' ? '1px solid #000000' : 'none'
                  }}>
                    Layout Info & Extras
                  </div>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: theme.keyAccentText }}>{layoutInfo?.name || 'Default Layout'}</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px', opacity: 0.9 }}>
                        <span>Tapping Term:</span><span style={{ fontWeight: 600 }}>{layoutInfo?.tappingTerm ?? 'N/A'} ms</span>
                        <span>Combo Term:</span><span style={{ fontWeight: 600 }}>{layoutInfo?.comboTerm ?? 'N/A'} ms</span>
                        <span>One-shot:</span><span style={{ fontWeight: 600 }}>{layoutInfo?.oneshotTimeout ?? 'N/A'} ms</span>
                      </div>
                    </div>

                    {combos.length > 0 && (
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', borderBottom: `1px solid ${theme.boardColor}`, paddingBottom: '4px' }}>Combos</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', fontSize: '12px' }}>
                          {combos.map((c, i) => (
                            <React.Fragment key={i}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px', opacity: 0.9 }}>
                                {c.keys.filter(k => k && k !== 'KC_NO').map((k, idx) => (
                                  <React.Fragment key={idx}>
                                    {idx > 0 && <span style={{ opacity: 0.5 }}>+</span>}
                                    <Keycap>{formatLabel(translateKeycode(k).label || k, labelMode)}</Keycap>
                                  </React.Fragment>
                                ))}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <Keycap targetLayer={getTargetLayer(c.action, mappedLayers.length)} arrowId={`pane-to-${getTargetLayer(c.action, mappedLayers.length)}`}>{formatLabel(translateKeycode(c.action).label || c.action, labelMode)}</Keycap>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}

                    {tapDances.length > 0 && (
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', borderBottom: `1px solid ${theme.boardColor}`, paddingBottom: '4px' }}>Tap Dances</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', fontSize: '12px' }}>
                          {tapDances.map((td, i) => (
                            <React.Fragment key={i}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.9 }}>
                                <span style={{ opacity: 0.7 }}>Tap:</span>
                                <Keycap targetLayer={getTargetLayer(td.tap, mappedLayers.length)} arrowId={`pane-to-${getTargetLayer(td.tap, mappedLayers.length)}`}>{formatLabel(translateKeycode(td.tap).label || td.tap, labelMode)}</Keycap>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                                <span style={{ opacity: 0.7 }}>Hold:</span>
                                <Keycap targetLayer={getTargetLayer(td.hold, mappedLayers.length)} arrowId={`pane-to-${getTargetLayer(td.hold, mappedLayers.length)}`}>{formatLabel(translateKeycode(td.hold).label || td.hold, labelMode)}</Keycap>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </foreignObject>
            </g>
          )}

          {/* Arrows and Draggable Handles */}
          {!disableArrows && arrows.map((a, i) => {
            const isDraggingThis = svgDrag && svgDrag.type === 'arrowControl' && (svgDrag as any).arrowId === a.arrowId;
            const splinePath = solveCatmullRom([ {x: a.sx, y: a.sy}, a.p0, a.p1, a.p2, {x: a.ex, y: a.ey} ]);
            return (
              <g key={`arrow-group-${i}`} className="arrow-interactive-group">
                {/* Thick invisible hitbox to catch hover */}
                <path d={splinePath} fill="none" stroke="transparent" strokeWidth={30} style={{ pointerEvents: 'stroke' }} className="no-print" />
                
                {/* The visible arrow */}
                <path d={splinePath} fill="none" stroke={a.color} strokeWidth={arrowWidth} markerEnd={`url(#arrowhead-${a.color.replace('#','')})`} />
                
                {/* Draggable Arrow Handles */}
                <g className="no-print">
                  {isDraggingThis && (
                    <g style={{ pointerEvents: 'none' }} opacity={0.45}>
                      <line x1={a.sx} y1={a.sy} x2={a.p0.x} y2={a.p0.y} stroke={a.color} strokeWidth={1} strokeDasharray="3 3" />
                      <line x1={a.p0.x} y1={a.p0.y} x2={a.p1.x} y2={a.p1.y} stroke={a.color} strokeWidth={1} strokeDasharray="3 3" />
                      <line x1={a.p1.x} y1={a.p1.y} x2={a.p2.x} y2={a.p2.y} stroke={a.color} strokeWidth={1} strokeDasharray="3 3" />
                      <line x1={a.p2.x} y1={a.p2.y} x2={a.ex} y2={a.ey} stroke={a.color} strokeWidth={1} strokeDasharray="3 3" />
                    </g>
                  )}
                  
                  {/* Middle point ALWAYS visible */}
                  <circle cx={a.p1.x} cy={a.p1.y} r={12} fill="transparent" style={{ cursor: 'move' }} onMouseDown={e => onArrowHandleDown(e, a.arrowId, 1, a.p1.x, a.p1.y)} />
                  <circle cx={a.p1.x} cy={a.p1.y} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />

                  {/* Secondary points (hidden unless hovered) */}
                  <g className={`secondary-handle ${isDraggingThis ? 'dragging' : ''}`}>
                    <circle cx={a.p0.x} cy={a.p0.y} r={12} fill="transparent" style={{ cursor: 'move' }} onMouseDown={e => onArrowHandleDown(e, a.arrowId, 0, a.p0.x, a.p0.y)} />
                    <circle cx={a.p0.x} cy={a.p0.y} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />

                    <circle cx={a.p2.x} cy={a.p2.y} r={12} fill="transparent" style={{ cursor: 'move' }} onMouseDown={e => onArrowHandleDown(e, a.arrowId, 2, a.p2.x, a.p2.y)} />
                    <circle cx={a.p2.x} cy={a.p2.y} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />

                    {/* Start handle: clamped to keycap boundary for pane arrows, free for regular arrows */}
                    <circle cx={a.sx} cy={a.sy} r={12} fill="transparent" style={{ cursor: 'move' }} onMouseDown={e => onArrowHandleDown(e, a.arrowId, 3, a.sx, a.sy)} />
                    <circle cx={a.sx} cy={a.sy} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />

                    <circle cx={a.ex} cy={a.ey} r={12} fill="transparent" style={{ cursor: 'move' }} onMouseDown={e => onArrowHandleDown(e, a.arrowId, 4, a.ex, a.ey)} />
                    <circle cx={a.ex} cy={a.ey} r={5} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                  </g>
                </g>
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
