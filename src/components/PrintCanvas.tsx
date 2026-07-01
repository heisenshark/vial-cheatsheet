import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useCanvasInteractions } from '../hooks/useCanvasInteractions';
import { translateKeycode } from '../keycodes';
import { formatLabel, solveCatmullRom, getTargetLayer } from '../utils';
import type { Theme, ParsedKey } from '../types';

function distanceToSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return Math.hypot(x - ax, y - ay);
  }
  let t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx;
  const py = ay + t * dy;
  return Math.hypot(x - px, y - py);
}

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
  onRegisterControls?: (controls: {
    hiddenLayers: Record<number, boolean>;
    toggleLayerVisibility: (i: number) => void;
    fitToPage: () => void;
    resetArrows: () => void;
    canResetArrows: boolean;
  }) => void;
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
  setHiddenLayers,
  onRegisterControls
}: PrintCanvasProps) {
  const {
    layerPositions,
    arrowMidpoints,
    resetArrows,
    infoPanePos,
    printBoxPos,
    printScale,
    viewOff,
    svgDrag,
    snapGuides,
    svgRef,
    onCanvasDown,
    onLayerDown,
    onPaneDown,
    onArrowHandleDown,
    onPrintBoxDown,
    onPrintBoxResizeDown,
    onSVGMove,
    onSVGUp,
    toggleLayerVisibility,
    fitVisibleToPage,
    gridLayoutVisibleLayers,
    addArrowPoint,
    deleteArrowPoint
  } = useCanvasInteractions(mappedLayers, parsedKeys, unitSize, keyGap, printOrientation, printZoom, setPrintZoom, !!showInfoPane, combos, tapDances, hiddenLayers, setHiddenLayers);

  useEffect(() => {
    onRegisterControls?.({
      hiddenLayers,
      toggleLayerVisibility,
      fitToPage: fitVisibleToPage,
      gridLayout: gridLayoutVisibleLayers,
      resetArrows,
      canResetArrows: Object.keys(arrowMidpoints).length > 0
    });
  }, [hiddenLayers, toggleLayerVisibility, fitVisibleToPage, gridLayoutVisibleLayers, resetArrows, arrowMidpoints, onRegisterControls]);

  const handlePathDoubleClick = (
    e: React.MouseEvent,
    arrowId: string,
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    currentPts: any[]
  ) => {
    if (e.ctrlKey || e.metaKey) return;
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse() || svg.getScreenCTM()?.inverse()!);
    const mx = transformed.x;
    const my = transformed.y;

    const allPts = [{ x: sx, y: sy }, ...currentPts, { x: ex, y: ey }];
    let bestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < allPts.length - 1; i++) {
      const dist = distanceToSegment(mx, my, allPts[i].x, allPts[i].y, allPts[i + 1].x, allPts[i + 1].y);
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
      }
    }

    addArrowPoint(arrowId, { x: mx, y: my }, bestIndex);
  };

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
      const { label, altLabel } = translateKeycode(key.keycode ?? '');
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
            {altLabel ? (
              <>
                <text x={ix + iw / 2} y={iy + ih * 0.45} textAnchor="middle" fontSize={CPF * 0.75} fill={theme.keyAlphaText} fontWeight="700" style={{ userSelect: 'none' }}>{altLabel}</text>
                <text x={ix + iw / 2} y={iy + ih * 0.85} textAnchor="middle" fontSize={CPF * 0.9} fill={theme.keyAlphaText} fontWeight="700" style={{ userSelect: 'none' }}>{tap}</text>
              </>
            ) : (
              <text x={ix + iw / 2} y={iy + ih / 2 + CPF * 0.35} textAnchor="middle" fontSize={CPF} fill={theme.keyAlphaText} fontWeight="700" style={{ userSelect: 'none' }}>{tap}</text>
            )}
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
            altLabel ? (
              <text textAnchor="middle" fill={style.text} fontWeight="600" style={{ userSelect: 'none' }}>
                <tspan x={x + kw / 2} y={y + kh * 0.4} fontSize={CPF * 0.75}>{altLabel}</tspan>
                <tspan x={x + kw / 2} y={y + kh * 0.75} fontSize={CPF}>{lines[0]}</tspan>
              </text>
            ) : (
              <text x={x + kw / 2} y={y + kh / 2 + (lines.length > 1 ? -CPF / 2 : CPF / 3.5)}
                textAnchor="middle" fontSize={CPF} fill={style.text} fontWeight="600" style={{ userSelect: 'none' }}>
                {lines.map((ln, li) => <tspan key={li} x={x + kw / 2} dy={li > 0 ? CPF + 1.5 : 0}>{ln}</tspan>)}
              </text>
            )
          )}
        </g>
      );
    });

  const buildCanvasArrows = () => {
    if (!parsedKeys.length || !mappedLayers.length) return [];
    const mx = Math.max(...parsedKeys.map(k => k.x + k.w));
    const my = Math.max(...parsedKeys.map(k => k.y + k.h));
    const kbW = (mx + CPAD * 2) * CPU, kbH = (my + CPAD * 2) * CPU;

    const arrows: any[] = [];

    mappedLayers.forEach((layer, layerIdx) => {
      if (hiddenLayers[layerIdx]) return;
      const lp = layerPositions[layerIdx] || { x: 0, y: 0 };
      const lCx = lp.x + kbW / 2;
      const lCy = lp.y + (kbH + CLABEL) / 2;

      layer.forEach(k => {
        const to = getTargetLayer(k.keycode, mappedLayers.length);
        if (to === null || to === layerIdx || hiddenLayers[to]) return;

        const tp = layerPositions[to];
        if (!tp) return;
        const tCx = tp.x + kbW / 2;
        const tCy = tp.y + (kbH + CLABEL) / 2;

        const kCx = lp.x + (k.x + CPAD + k.w / 2) * CPU;
        const kCy = lp.y + (k.y + CPAD + k.h / 2) * CPU + CLABEL;
        const kW = k.w * CPU;
        const kH = k.h * CPU;

        const tkCx = tp.x + (k.x + CPAD + k.w / 2) * CPU;
        const tkCy = tp.y + (k.y + CPAD + k.h / 2) * CPU + CLABEL;

        const arrowId = `${layerIdx}-to-${to}`;
        const data = arrowMidpoints[arrowId];
        const hasCustom = data !== undefined;
        const storedPts = data?.pts;

        // Default mathematical midpoint of straight line
        const mx2 = (kCx + tCx) / 2;
        const my2 = (kCy + tCy) / 2;
        const tempPts = (hasCustom && storedPts) ? storedPts : [{ x: mx2, y: my2 }];

        // Start snaps towards custom startAim if set, else first midpoint
        const startAim = data?.startAim ? data.startAim : (tempPts.length > 0 ? tempPts[0] : { x: tCx, y: tCy });
        const startPt = getBoxIntersection(kCx, kCy, kW, kH, startAim.x, startAim.y);
        const sx = startPt.x, sy = startPt.y;

        // End snaps towards custom endAim if set, else last midpoint
        const endAim = data?.endAim ? data.endAim : (tempPts.length > 0 ? tempPts[tempPts.length - 1] : { x: kCx, y: kCy });
        const endPt = getBoxIntersection(tCx, tCy, kbW, kbH + CLABEL, endAim.x, endAim.y);
        const ex = endPt.x, ey = endPt.y;

        // If user hasn't customized it, calculate fresh center based on snapped positions
        const finalPts = (hasCustom && storedPts)
          ? storedPts
          : [{ x: (sx + ex) / 2, y: (sy + ey) / 2 }];

        arrows.push({
          arrowId, fromLayer: layerIdx, toLayer: to,
          sx, sy, ex, ey, pts: finalPts,
          startAim, endAim,
          color: (theme.id === 'mono_print' && !colorLayerButtons) ? '#000000' : arrowColors[to % 8]
        });
      });
    });

    // Add info pane target layer arrows mathematically
    if (showInfoPane && layoutInfo) {
      const paneW = 340;
      const paneH = 600; // estimated height
      const paneCx = infoPanePos.x + paneW / 2;
      const paneCy = infoPanePos.y + paneH / 2;

      // Calculate mathematical positions for target keycaps inside the Info Pane
      const computedPanePositions: Record<string, {x: number, y: number, w: number, h: number}> = {};
      const headerH = 38;
      const contentPad = 16;
      const metadataH = 93;
      const blockGap = 16;
      const subHeaderH = 31;
      const rowH = 32; // 26px keycap + 6px gap
      
      let currentY = headerH + contentPad; // starts at 54
      currentY += metadataH + blockGap; // now at 163
      
      if (combos.length > 0) {
        const comboStartY = currentY + subHeaderH; // 194
        combos.forEach((c, idx) => {
          const target = getTargetLayer(c.action, mappedLayers.length);
          if (target != null) {
            const arrowId = `pane-to-${target}`;
            const keyCenterY = comboStartY + idx * rowH + 13;
            computedPanePositions[arrowId] = {
              x: infoPanePos.x + 298, // center X of right keycap
              y: infoPanePos.y + keyCenterY,
              w: 52,
              h: 26
            };
          }
        });
        currentY += subHeaderH + combos.length * rowH - 6 + blockGap;
      }
      
      if (tapDances.length > 0) {
        const tdStartY = currentY + subHeaderH;
        tapDances.forEach((td, idx) => {
          const tapTarget = getTargetLayer(td.tap, mappedLayers.length);
          const holdTarget = getTargetLayer(td.hold, mappedLayers.length);
          const keyCenterY = tdStartY + idx * rowH + 13;
          
          if (tapTarget != null) {
            const arrowId = `pane-to-${tapTarget}`;
            computedPanePositions[arrowId] = {
              x: infoPanePos.x + 75, // center X of left keycap
              y: infoPanePos.y + keyCenterY,
              w: 52,
              h: 26
            };
          }
          if (holdTarget != null) {
            const arrowId = `pane-to-${holdTarget}`;
            computedPanePositions[arrowId] = {
              x: infoPanePos.x + 298, // center X of right keycap
              y: infoPanePos.y + keyCenterY,
              w: 52,
              h: 26
            };
          }
        });
      }

      // Build the arrows for each unique active layer target
      const targetLayers = new Set<number>();
      combos.forEach(c => {
        const to = getTargetLayer(c.action, mappedLayers.length);
        if (to !== null && !hiddenLayers[to]) targetLayers.add(to);
      });
      tapDances.forEach(td => {
        const toT = getTargetLayer(td.tap, mappedLayers.length);
        if (toT !== null && !hiddenLayers[toT]) targetLayers.add(toT);
        const toH = getTargetLayer(td.hold, mappedLayers.length);
        if (toH !== null && !hiddenLayers[toH]) targetLayers.add(toH);
      });

      targetLayers.forEach(to => {
        const arrowId = `pane-to-${to}`;
        const tp = layerPositions[to];
        if (!tp) return;
        const tCx = tp.x + kbW / 2;
        const tCy = tp.y + (kbH + CLABEL) / 2;

        const measured = computedPanePositions[arrowId];
        const data = arrowMidpoints[arrowId];
        const hasCustom = data !== undefined;
        const storedPts = data?.pts;

        // Default mathematical midpoint of straight line
        const mx2 = (measured ? (measured.x + tCx) / 2 : (paneCx + tCx) / 2);
        const my2 = (measured ? (measured.y + tCy) / 2 : (paneCy + tCy) / 2);
        const tempPts = (hasCustom && storedPts) ? storedPts : [{ x: mx2, y: my2 }];

        let sx: number, sy: number;
        const startAim = data?.startAim ? data.startAim : (tempPts.length > 0 ? tempPts[0] : { x: tCx, y: tCy });
        if (measured) {
          const edge = getBoxIntersection(measured.x, measured.y, measured.w, measured.h, startAim.x, startAim.y);
          sx = edge.x;
          sy = edge.y;
        } else {
          sx = infoPanePos.x + paneW / 2;
          sy = infoPanePos.y;
        }

        // End: snap to nearest edge of target layer box
        const endAim = data?.endAim ? data.endAim : (tempPts.length > 0 ? tempPts[tempPts.length - 1] : { x: paneCx, y: paneCy });
        const endPt = getBoxIntersection(tCx, tCy, kbW, kbH + CLABEL, endAim.x, endAim.y);
        const ex = endPt.x, ey = endPt.y;

        // Rebuild center if not customized
        const finalPts = (hasCustom && storedPts)
          ? storedPts
          : [{ x: (sx + ex) / 2, y: (sy + ey) / 2 }];

        arrows.push({
          arrowId, fromLayer: -1, toLayer: to,
          sx, sy, ex, ey, pts: finalPts,
          startAim, endAim,
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
  const baseVW = 2500;
  const baseVH = 2500;
  const VW = baseVW * printZoom;
  const VH = baseVH * printZoom;

  const printBoxW = printOrientation === 'landscape' ? 1800 * printScale : 1200 * printScale;
  const printBoxH = printOrientation === 'landscape' ? 1240 * printScale : 1735 * printScale;
  const printBoxX = printBoxPos.x;
  const printBoxY = printBoxPos.y;
  const activeViewBox = `${printBoxX} ${printBoxY} ${printBoxW} ${printBoxH}`;

  useEffect(() => {
    const handleBeforePrint = () => {
      const svg = document.getElementById('print-svg');
      if (svg) {
        svg.setAttribute('viewBox', activeViewBox);
      }
    };
    const handleAfterPrint = () => {
      const svg = document.getElementById('print-svg');
      if (svg) {
        svg.setAttribute('viewBox', `${viewOff.x} ${viewOff.y} ${VW} ${VH}`);
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printOrientation, viewOff.x, viewOff.y, VW, VH, activeViewBox]);
  const isDraggingLayer = svgDrag?.type === 'layer';

  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  const arrows = buildCanvasArrows();

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
      <div className="print-svg-container" style={{ background: theme.bg, borderRadius: 12, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <svg ref={svgRef as React.RefObject<SVGSVGElement>}
          id="print-svg"
          viewBox={`${viewOff.x} ${viewOff.y} ${VW} ${VH}`}
          data-active-viewbox={activeViewBox}
          style={{ display: 'block', width: '100%', flexGrow: 1, cursor: svgDrag ? 'grabbing' : 'grab', fontFamily }}
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
          <g className="print-boundary-group">
            {/* The Box */}
            <rect x={printBoxX} y={printBoxY} width={printBoxW} height={printBoxH} 
              fill="none" stroke="var(--amber-500)" strokeWidth="4" strokeDasharray="12,12" 
              rx="8" className="no-print" style={{ pointerEvents: 'none', opacity: 0.5 }} />
            
            {/* The Draggable Header */}
            <rect x={printBoxX} y={printBoxY} width={printBoxW} height={50} 
              fill="var(--amber-500)" opacity={0.1} className="no-print"
              style={{ cursor: 'move' }} onMouseDown={e => onPrintBoxDown(e, printBoxX, printBoxY)} />
              
            <text x={printBoxX + 15} y={printBoxY + 30} fill="var(--amber-500)" fontSize="18" fontWeight="bold" 
              className="no-print" style={{ pointerEvents: 'none', opacity: 0.8 }}>
              Print Boundary (A4 {printOrientation}) - Drag to Move
            </text>

            {/* Resize Handles */}
            <circle cx={printBoxX} cy={printBoxY} r={12} fill="var(--amber-500)" className="no-print" style={{ cursor: 'nwse-resize' }} 
              onMouseDown={e => onPrintBoxResizeDown(e, 'tl', printBoxX, printBoxY, printBoxW, printBoxH)} />
            <circle cx={printBoxX + printBoxW} cy={printBoxY} r={12} fill="var(--amber-500)" className="no-print" style={{ cursor: 'nesw-resize' }} 
              onMouseDown={e => onPrintBoxResizeDown(e, 'tr', printBoxX, printBoxY, printBoxW, printBoxH)} />
            <circle cx={printBoxX} cy={printBoxY + printBoxH} r={12} fill="var(--amber-500)" className="no-print" style={{ cursor: 'nesw-resize' }} 
              onMouseDown={e => onPrintBoxResizeDown(e, 'bl', printBoxX, printBoxY, printBoxW, printBoxH)} />
            <circle cx={printBoxX + printBoxW} cy={printBoxY + printBoxH} r={12} fill="var(--amber-500)" className="no-print" style={{ cursor: 'nwse-resize' }} 
              onMouseDown={e => onPrintBoxResizeDown(e, 'br', printBoxX, printBoxY, printBoxW, printBoxH)} />
          </g>

          {/* Arrow shadows */}
          {!disableArrows && arrows.map((a, i) => (
            <path key={`as${i}`} d={solveCatmullRom([ {x: a.sx, y: a.sy}, ...a.pts, {x: a.ex, y: a.ey} ])}
              fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={arrowWidth + 1} className="no-print" />
          ))}

          {/* Layer keyboards */}
          {mappedLayers.map((_, layerIdx) => {
            if (hiddenLayers[layerIdx]) return null;
            const p = layerPositions[layerIdx] || { x: 0, y: 0 };
            const isActive = svgDrag?.type === 'layer' && (svgDrag as any).layerIdx === layerIdx;
            const titleStr = layerNames[layerIdx] ?? `Layer ${layerIdx}`;
            const titleW = Math.max(140, titleStr.length * 8 + 50);
            const titleX = kbW / 2 - titleW / 2;

            return (
              <g key={layerIdx} transform={`translate(${p.x},${p.y})`}
                onMouseDown={e => onLayerDown(e, layerIdx)}
                style={{ cursor: isDraggingLayer && isActive ? 'grabbing' : 'grab' }}
              >
                {isActive && theme.id !== 'mono_print' && <rect x={2} y={2} width={kbW} height={kbH + CLABEL} fill="rgba(0,0,0,0.35)" rx={CPR + 4} />}
                <rect x={titleX} y={0} width={titleW} height={CLABEL}
                  fill={colorLayerButtons ? arrowColors[layerIdx % 8] : (theme.id === 'mono_print' ? '#ffffff' : theme.boardColor)} rx={CPR + 2}
                  stroke={theme.id === 'mono_print' && !colorLayerButtons ? '#000000' : (isActive && !colorLayerButtons ? arrowColors[layerIdx % 8] : 'transparent')} strokeWidth={1.5} />
                <text x={kbW / 2} y={CLABEL * 0.68}
                  textAnchor="middle" fontSize={13} fontWeight="800"
                  fill={colorLayerButtons ? '#121212' : (theme.id === 'mono_print' ? '#000000' : arrowColors[layerIdx % 8])} style={{ userSelect: 'none', pointerEvents: 'none' }}
                >{titleStr}</text>
                
                <g className="no-print" style={{ cursor: 'pointer' }}
                  onMouseDown={e => { e.stopPropagation(); toggleLayerVisibility(layerIdx); }}
                >
                  <circle cx={titleX + titleW - 14} cy={CLABEL / 2} r={8} fill={theme.id === 'mono_print' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'} />
                  <text x={titleX + titleW - 14} y={CLABEL / 2 + 3} textAnchor="middle" fontSize={10} fill={theme.id === 'mono_print' ? '#000000' : '#ffffff'} fontWeight="bold" style={{ userSelect: 'none' }}>×</text>
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

          {/* Info Pane — rendered as pure SVG elements so it behaves identically on screen and print */}
          {showInfoPane && (() => {
            const paneW = 340;
            const headerH = 38;
            const contentPad = 16;
            const metadataH = 93;
            const blockGap = 16;
            const subHeaderH = 31;
            const rowH = 32;

            // Compute exact height
            const cLen = combos ? combos.length : 0;
            const tdLen = tapDances ? tapDances.length : 0;
            const paneHeight = headerH + contentPad + metadataH +
              (cLen > 0 ? blockGap + subHeaderH + cLen * rowH : 0) +
              (tdLen > 0 ? blockGap + subHeaderH + tdLen * rowH : 0) + 16;

            const renderSvgKeycap = (x: number, y: number, w: number, h: number, text: string, targetLayer: number | null = null) => {
              const isLayerTrigger = targetLayer != null && colorLayerButtons;
              const bg = isLayerTrigger 
                ? arrowColors[targetLayer % 8] 
                : (theme.id === 'mono_print' ? '#f0f0f0' : 'rgba(255,255,255,0.06)');
              const textColor = isLayerTrigger 
                ? '#121212' 
                : (theme.id === 'mono_print' ? '#000000' : theme.keyAlphaText);
              return (
                <g>
                  <rect x={x} y={y} width={w} height={h} fill={bg} stroke={theme.boardColor} strokeWidth={1} rx={4} />
                  <text x={x + w / 2} y={y + h / 2 + 3.5} textAnchor="middle" fontSize={11} fontWeight="bold" fill={textColor} style={{ userSelect: 'none' }}>{text}</text>
                </g>
              );
            };

            let currentY = headerH + contentPad; // starts at 54

            return (
              <g transform={`translate(${infoPanePos.x}, ${infoPanePos.y})`}>
                {/* Background card */}
                <rect x={0} y={0} width={paneW} height={paneHeight} 
                  fill={theme.id === 'mono_print' ? '#ffffff' : theme.bg} 
                  stroke={theme.boardColor} strokeWidth={2} rx={12} />

                {/* Header bar (draggable handle) */}
                <rect x={1} y={1} width={paneW - 2} height={headerH} 
                  fill={theme.id === 'mono_print' ? '#f4f4f5' : theme.boardColor} 
                  stroke={theme.id === 'mono_print' ? '#000000' : 'none'}
                  strokeWidth={theme.id === 'mono_print' ? 1 : 0}
                  rx={10} 
                  onMouseDown={onPaneDown} 
                  style={{ cursor: 'move' }} 
                  className="no-print" />
                
                {/* Header text */}
                <text x={16} y={23} 
                  fill={theme.id === 'mono_print' ? '#000000' : theme.keyAlphaText} 
                  fontSize={14} fontWeight={600} style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  Layout Info & Extras
                </text>

                {/* Metadata Section */}
                <text x={16} y={currentY + 15} fill={theme.keyAccentText} fontSize={18} fontWeight="bold" style={{ userSelect: 'none' }}>
                  {layoutInfo?.name || 'Default Layout'}
                </text>

                <g fontSize={13} fill={theme.id === 'mono_print' ? '#000000' : theme.keyAlphaText} style={{ userSelect: 'none', opacity: 0.9 }}>
                  <text x={16} y={currentY + 40}>Tapping Term:</text>
                  <text x={150} y={currentY + 40} fontWeight="bold">{layoutInfo?.tappingTerm ?? 'N/A'} ms</text>

                  <text x={16} y={currentY + 60}>Combo Term:</text>
                  <text x={150} y={currentY + 60} fontWeight="bold">{layoutInfo?.comboTerm ?? 'N/A'} ms</text>

                  <text x={16} y={currentY + 80}>One-shot:</text>
                  <text x={150} y={currentY + 80} fontWeight="bold">{layoutInfo?.oneshotTimeout ?? 'N/A'} ms</text>
                </g>

                {/* Combos Section */}
                {(() => {
                  if (cLen === 0) return null;
                  currentY += metadataH + blockGap; // 163
                  const sectionY = currentY;

                  return (
                    <g>
                      {/* Section line and header */}
                      <line x1={16} y1={sectionY} x2={paneW - 16} y2={sectionY} stroke={theme.boardColor} strokeWidth={1} />
                      <text x={16} y={sectionY + 20} fill={theme.keyAlphaText} fontSize={14} fontWeight="bold" style={{ userSelect: 'none' }}>Combos</text>

                      {combos.map((c, idx) => {
                        const target = getTargetLayer(c.action, mappedLayers.length);
                        const rowY = sectionY + subHeaderH + idx * rowH; // starts at 194
                        
                        // Render trigger keys inline
                        let keyX = 16;
                        return (
                          <g key={idx}>
                            {/* Left column: Trigger keys */}
                            {c.keys.filter(k => k && k !== 'KC_NO').map((k, kIdx) => {
                              const label = formatLabel(translateKeycode(k).label || k, labelMode);
                              const kw = Math.max(30, label.length * 7 + 10);
                              const rendered = (
                                <g key={kIdx} transform={`translate(${keyX}, ${rowY})`}>
                                  {renderSvgKeycap(0, 0, kw, 26, label)}
                                </g>
                              );
                              keyX += kw + 4;
                              return rendered;
                            })}

                            {/* Right column: Target Action Keycap */}
                            <g transform={`translate(${paneW - 16 - 52}, ${rowY})`}>
                              {renderSvgKeycap(0, 0, 52, 26, formatLabel(translateKeycode(c.action).label || c.action, labelMode), target)}
                            </g>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}

                {/* Tap Dances Section */}
                {(() => {
                  if (tdLen === 0) return null;
                  if (cLen > 0) {
                    currentY += subHeaderH + cLen * rowH - 6 + blockGap;
                  } else {
                    currentY += metadataH + blockGap;
                  }
                  const sectionY = currentY;

                  return (
                    <g>
                      {/* Section line and header */}
                      <line x1={16} y1={sectionY} x2={paneW - 16} y2={sectionY} stroke={theme.boardColor} strokeWidth={1} />
                      <text x={16} y={sectionY + 20} fill={theme.keyAlphaText} fontSize={14} fontWeight="bold" style={{ userSelect: 'none' }}>Tap Dances</text>

                      {tapDances.map((td, idx) => {
                        const tapTarget = getTargetLayer(td.tap, mappedLayers.length);
                        const holdTarget = getTargetLayer(td.hold, mappedLayers.length);
                        const rowY = sectionY + subHeaderH + idx * rowH;

                        return (
                          <g key={idx}>
                            {/* Left Column: Tap */}
                            <g transform={`translate(${16}, ${rowY})`}>
                              <text x={0} y={17} fill={theme.keyAlphaText} opacity={0.7} fontSize={11} style={{ userSelect: 'none' }}>Tap:</text>
                              <g transform="translate(26, 0)">
                                {renderSvgKeycap(0, 0, 52, 26, formatLabel(translateKeycode(td.tap).label || td.tap, labelMode), tapTarget)}
                              </g>
                            </g>

                            {/* Right Column: Hold */}
                            <g transform={`translate(${paneW - 16 - 90}, ${rowY})`}>
                              <text x={0} y={17} fill={theme.keyAlphaText} opacity={0.7} fontSize={11} style={{ userSelect: 'none' }}>Hold:</text>
                              <g transform="translate(32, 0)">
                                {renderSvgKeycap(0, 0, 52, 26, formatLabel(translateKeycode(td.hold).label || td.hold, labelMode), holdTarget)}
                              </g>
                            </g>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </g>
            );
          })()}

          {/* Arrows and Draggable Handles */}
          {!disableArrows && arrows.map((a, i) => {
            const isDraggingThis = svgDrag && svgDrag.type === 'arrowControl' && (svgDrag as any).arrowId === a.arrowId;
            const splinePath = solveCatmullRom([ {x: a.sx, y: a.sy}, ...a.pts, {x: a.ex, y: a.ey} ]);
            return (
              <g key={`arrow-group-${i}`} className="arrow-interactive-group">
                {/* Thick invisible hitbox to catch hover and add points */}
                <path 
                  d={splinePath} 
                  fill="none" 
                  stroke="transparent" 
                  strokeWidth={30} 
                  style={{ pointerEvents: 'stroke', cursor: 'default' }} 
                  className="no-print" 
                  onDoubleClick={e => handlePathDoubleClick(e, a.arrowId, a.sx, a.sy, a.ex, a.ey, a.pts)}
                />
                
                {/* The visible arrow */}
                <path d={splinePath} fill="none" stroke={a.color} strokeWidth={arrowWidth} markerEnd={`url(#arrowhead-${a.color.replace('#','')})`} />
                
                {/* Draggable Arrow Handles */}
                <g className="no-print">
                  {isDraggingThis && (
                    <g style={{ pointerEvents: 'none' }} opacity={0.45}>
                      {(() => {
                        const points = [{ x: a.sx, y: a.sy }, ...a.pts, { x: a.ex, y: a.ey }];
                        return points.slice(0, -1).map((p, idx) => (
                          <line
                            key={`guide-${idx}`}
                            x1={p.x}
                            y1={p.y}
                            x2={points[idx + 1].x}
                            y2={points[idx + 1].y}
                            stroke={a.color}
                            strokeWidth={1}
                            strokeDasharray="3 3"
                          />
                        ));
                      })()}
                    </g>
                  )}
                  
                  {/* Point handles (all interactive, Ctrl+Click to delete) */}
                  {a.pts.map((p, idx) => (
                    <g key={`handle-${idx}`}>
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r={20} 
                        fill="transparent" 
                        style={{ cursor: 'move' }} 
                        onMouseDown={e => {
                          if (e.ctrlKey || e.metaKey) {
                            e.stopPropagation();
                            deleteArrowPoint(a.arrowId, idx);
                          } else {
                            onArrowHandleDown(e, a.arrowId, idx, p.x, p.y);
                          }
                        }} 
                      />
                      <circle cx={p.x} cy={p.y} r={7} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                    </g>
                  ))}

                  {/* Start/End boundary control points (only visible when arrow is hovered) */}
                  <g className={`secondary-handle ${isDraggingThis ? 'dragging' : ''}`}>
                    <circle 
                      cx={a.sx} 
                      cy={a.sy} 
                      r={20} 
                      fill="transparent" 
                      style={{ cursor: 'move' }} 
                      onMouseDown={e => onArrowHandleDown(e, a.arrowId, -1, a.startAim.x, a.startAim.y)} 
                    />
                    <circle cx={a.sx} cy={a.sy} r={7} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />

                    <circle 
                      cx={a.ex} 
                      cy={a.ey} 
                      r={20} 
                      fill="transparent" 
                      style={{ cursor: 'move' }} 
                      onMouseDown={e => onArrowHandleDown(e, a.arrowId, -2, a.endAim.x, a.endAim.y)} 
                    />
                    <circle cx={a.ex} cy={a.ey} r={7} fill={a.color} stroke="#ffffff" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
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
