import { useState, useRef, useEffect, useCallback } from 'react';
import type { ParsedKey, DragState, SnapGuide, Point } from '../types';

export interface ArrowMidpointData {
  pts: Point[];
  startAim?: Point;
  endAim?: Point;
}

interface HistoryState {
  layerPositions: Record<number, Point>;
  arrowMidpoints: Record<string, ArrowMidpointData>;
  hiddenLayers: Record<number, boolean>;
  infoPanePos: Point;
  printBoxPos?: Point;
  printZoom?: number;
  printScale?: number;
}

export function useCanvasInteractions(
  mappedLayers: any[],
  parsedKeys: ParsedKey[],
  unitSize: number,
  keyGap: number,
  printOrientation: string,
  printZoom: number,
  setPrintZoom: React.Dispatch<React.SetStateAction<number>>,
  showInfoPane: boolean,
  combos?: any[],
  tapDances?: any[],
  hiddenLayersProp?: Record<number, boolean>,
  setHiddenLayersProp?: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
) {
  const [layerPositions, setLayerPos] = useState<Record<number, Point>>({});
  const [arrowMidpoints, setArrowMidpoints] = useState<Record<string, ArrowMidpointData>>({});
  const [hiddenLayersLocal, setHiddenLayersLocal] = useState<Record<number, boolean>>({});
  const hiddenLayers = hiddenLayersProp ?? hiddenLayersLocal;
  const setHiddenLayers = setHiddenLayersProp ?? setHiddenLayersLocal;
  const [infoPanePos, setInfoPanePos] = useState<Point>({ x: 0, y: 0 });
  const [printBoxPos, setPrintBoxPos] = useState<Point>({ x: 0, y: 0 });
  const [printScale, setPrintScale] = useState(1);
  const [viewOff, setViewOff] = useState<Point>({ x: -40, y: -40 });
  const [localZoom, setLocalZoom] = useState(printZoom);
  const [svgDrag, setSvgDrag] = useState<DragState | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  const [history, setHistory] = useState({ stack: [] as HistoryState[], index: -1 });
  const historyRef = useRef(history);
  historyRef.current = history;
  const stateRef = useRef<HistoryState & { infoPanePos: Point; printBoxPos: Point; printZoom: number; printScale: number }>({ layerPositions: {}, arrowMidpoints: {}, hiddenLayers: {}, infoPanePos: { x: 0, y: 0 }, printBoxPos: { x: 0, y: 0 }, printZoom: printZoom, printScale: 1 });
  stateRef.current = { layerPositions, arrowMidpoints, hiddenLayers, infoPanePos, printBoxPos, printZoom: localZoom, printScale };

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragCTM = useRef<DOMMatrix | null>(null);

  const commitHistory = useCallback((newState: HistoryState) => {
    setHistory(prev => {
      const newStack = prev.stack.slice(0, prev.index + 1);
      newStack.push(JSON.parse(JSON.stringify(newState)));
      return { stack: newStack, index: newStack.length - 1 };
    });
  }, []);

  // Initialize positions
  useEffect(() => {
    if (!parsedKeys.length || !mappedLayers.length) return;
    const mx = Math.max(...parsedKeys.map(k => k.x + k.w));
    const my = Math.max(...parsedKeys.map(k => k.y + k.h));
    const CPU = unitSize;
    const CPAD = 0.5;
    const CLABEL = Math.max(28, 12 + 12); // fontSize + 12
    const cw = (mx + CPAD * 2) * CPU + 80;
    const ch = (my + CPAD * 2) * CPU + CLABEL + 60;
    const pos: Record<number, Point> = {};
    mappedLayers.forEach((_, i) => {
      pos[i] = { x: (i % 2) * cw + 20, y: Math.floor(i / 2) * ch + 20 };
    });
    setLayerPos(pos);
    setViewOff({ x: -40, y: -40 });

    // Initialize history
    const initialPaneX = cw * 2 + 20;
    const initialPrintBoxPos = { x: 0, y: 0 };
    const initialState = { layerPositions: pos, arrowMidpoints: {}, hiddenLayers: {}, infoPanePos: { x: initialPaneX, y: 20 }, printBoxPos: initialPrintBoxPos, printZoom };
    setInfoPanePos({ x: initialPaneX, y: 20 });
    setHistory({ stack: [initialState], index: 0 });
  }, [mappedLayers, parsedKeys, unitSize]);

  const fitVisibleToPage = useCallback(() => {
    if (!parsedKeys.length || !mappedLayers.length) return;
    const mx = Math.max(...parsedKeys.map(k => k.x + k.w));
    const my = Math.max(...parsedKeys.map(k => k.y + k.h));
    const CPU = unitSize;
    const CPAD = 0.5;
    const CLABEL = Math.max(28, 12 + 12);
    const kbW = (mx + CPAD * 2) * CPU;
    const kbH = (my + CPAD * 2) * CPU;

    // Always read fresh state from stateRef to avoid stale closure
    const { layerPositions: lp, hiddenLayers: hl, infoPanePos: ipp } = stateRef.current;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    let hasVisible = false;

    mappedLayers.forEach((_, i) => {
      if (hl[i]) return;
      const p = lp[i] || { x: 0, y: 0 };
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + kbW);
      maxY = Math.max(maxY, p.y + kbH + CLABEL);
      hasVisible = true;
    });

    if (showInfoPane) {
      const cLen = combos ? combos.length : 0;
      const tdLen = tapDances ? tapDances.length : 0;
      const paneHeight = 38 + 16 + 93 +
        (cLen > 0 ? 16 + 31 + cLen * 32 : 0) +
        (tdLen > 0 ? 16 + 31 + tdLen * 32 : 0) + 16;
      minX = Math.min(minX, ipp.x);
      minY = Math.min(minY, ipp.y);
      maxX = Math.max(maxX, ipp.x + 340);
      maxY = Math.max(maxY, ipp.y + paneHeight);
      hasVisible = true;
    }

    if (!hasVisible) return;
    const margin = 80;
    minX -= margin; minY -= margin;
    maxX += margin; maxY += margin;

    const contentW = maxX - minX;
    const contentH = maxY - minY;

    // Calculate zoom needed to fit content strictly inside the print boundary
    const printVW = printOrientation === 'landscape' ? 1800 : 1200;
    const printVH = printOrientation === 'landscape' ? 1240 : 1735;

    // 1. Scale the print boundary to cover the content
    const requiredPrintScale = Math.max(contentW / printVW, contentH / printVH);
    const finalPrintScale = Math.max(0.1, Math.min(10.0, requiredPrintScale));
    setPrintScale(finalPrintScale);

    // 2. Scale the camera so the print boundary is visible on screen
    const baseVW = 2500;
    const baseVH = 2500;
    const requiredViewZoom = Math.min(
      baseVW / (printVW * finalPrintScale + 200),
      baseVH / (printVH * finalPrintScale + 200)
    );
    const finalViewZoom = Math.max(0.1, Math.min(5.0, requiredViewZoom));
    setLocalZoom(finalViewZoom);
    setPrintZoom(finalViewZoom);

    const VW = baseVW / finalViewZoom;
    const VH = baseVH / finalViewZoom;
    const centerX = minX + contentW / 2;
    const centerY = minY + contentH / 2;

    const newPrintBoxPos = {
      x: centerX - (printVW * finalPrintScale) / 2,
      y: centerY - (printVH * finalPrintScale) / 2
    };

    setPrintBoxPos(newPrintBoxPos);
    setViewOff({ x: centerX - VW / 2, y: centerY - VH / 2 });

    commitHistory({
      ...stateRef.current,
      printZoom: finalViewZoom,
      printScale: finalPrintScale,
      printBoxPos: newPrintBoxPos
    });
  }, [parsedKeys, mappedLayers, printOrientation, setPrintZoom, unitSize, showInfoPane, combos, tapDances, commitHistory]);

  // Adjust camera/view offset when zoom changes from the UI slider (or undo/redo) to zoom relative to the center of the screen
  useEffect(() => {
    if (printZoom === localZoom) return;
    const prevZoom = localZoom;
    const nextZoom = printZoom;
    setLocalZoom(nextZoom);

    if (prevZoom === undefined || prevZoom === nextZoom) return;

    const baseVW = 2500;
    const baseVH = 2500;
    const VW_prev = baseVW / prevZoom;
    const VH_prev = baseVH / prevZoom;
    const VW_next = baseVW / nextZoom;
    const VH_next = baseVH / nextZoom;

    setViewOff(prevOff => ({
      x: prevOff.x + 0.5 * (VW_prev - VW_next),
      y: prevOff.y + 0.5 * (VH_prev - VH_next)
    }));
  }, [printZoom, localZoom]);

  const gridLayoutVisibleLayers = useCallback((columns: number, gapX: number, gapY: number) => {
    if (!parsedKeys.length || !mappedLayers.length) return;
    const mx = Math.max(...parsedKeys.map(k => k.x + k.w));
    const my = Math.max(...parsedKeys.map(k => k.y + k.h));
    const CPU = unitSize;
    const CPAD = 0.5;
    const CLABEL = Math.max(28, 12 + 12);
    const kbW = (mx + CPAD * 2) * CPU;
    const kbH = (my + CPAD * 2) * CPU + CLABEL;

    const { layerPositions: lp, hiddenLayers: hl } = stateRef.current;

    const visibleIdxs = mappedLayers.map((_, i) => i).filter(i => !hl[i]);
    if (visibleIdxs.length === 0) return;

    const newPos = { ...lp };
    visibleIdxs.forEach((idx, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      newPos[idx] = {
        x: 20 + col * (kbW + gapX),
        y: 20 + row * (kbH + gapY)
      };
    });

    setLayerPos(newPos);
    commitHistory({ ...stateRef.current, layerPositions: newPos });
  }, [parsedKeys, mappedLayers, unitSize, commitHistory]);

  useEffect(() => {
    fitVisibleToPage();
  }, [printOrientation, fitVisibleToPage]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;

      if (e.ctrlKey) {
        const rect = svg.getBoundingClientRect();
        const rx = (e.clientX - rect.left) / rect.width;
        const ry = (e.clientY - rect.top) / rect.height;

        const zoomFactor = 1.05;
        const prevZoom = stateRef.current.printZoom;
        const nextZoom = e.deltaY < 0 ? prevZoom * zoomFactor : prevZoom / zoomFactor;
        const clampedNext = Math.max(0.2, Math.min(5.0, nextZoom));

        if (clampedNext !== prevZoom) {
          const baseVW = 2500;
          const baseVH = 2500;
          const VW_prev = baseVW / prevZoom;
          const VH_prev = baseVH / prevZoom;
          const VW_next = baseVW / clampedNext;
          const VH_next = baseVH / clampedNext;

          setViewOff(prevOff => ({
            x: prevOff.x + rx * (VW_prev - VW_next),
            y: prevOff.y + ry * (VH_prev - VH_next)
          }));
          setLocalZoom(clampedNext);
          setPrintZoom(clampedNext);
        }
      } else if (e.shiftKey) {
        setViewOff(prev => ({
          x: prev.x + (e.deltaY !== 0 ? e.deltaY : e.deltaX),
          y: prev.y
        }));
      } else {
        setViewOff(prev => ({
          x: prev.x + e.deltaX,
          y: prev.y + e.deltaY
        }));
      }
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [setPrintZoom, layerPositions, svgRef.current]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          const { stack, index } = historyRef.current;
          if (e.shiftKey) {
            if (index < stack.length - 1) {
              const nextIndex = index + 1;
              const state = stack[nextIndex];
              setLayerPos(state.layerPositions);
              setArrowMidpoints(state.arrowMidpoints);
              setHiddenLayers(state.hiddenLayers);
              if (state.infoPanePos) setInfoPanePos(state.infoPanePos);
              if (state.printBoxPos) setPrintBoxPos(state.printBoxPos);
              if (state.printZoom !== undefined) setPrintZoom(state.printZoom);
              if (state.printScale !== undefined) setPrintScale(state.printScale);
              setHistory(prev => ({ ...prev, index: nextIndex }));
            }
          } else {
            if (index > 0) {
              const nextIndex = index - 1;
              const state = stack[nextIndex];
              setLayerPos(state.layerPositions);
              setArrowMidpoints(state.arrowMidpoints);
              setHiddenLayers(state.hiddenLayers);
              if (state.infoPanePos) setInfoPanePos(state.infoPanePos);
              if (state.printBoxPos) setPrintBoxPos(state.printBoxPos);
              if (state.printZoom !== undefined) setPrintZoom(state.printZoom);
              if (state.printScale !== undefined) setPrintScale(state.printScale);
              setHistory(prev => ({ ...prev, index: nextIndex }));
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toSVG = (e: React.MouseEvent | MouseEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = dragCTM.current || svg.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(ctm);
  };

  const onCanvasDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1) {
      e.preventDefault();
    }
    const svg = svgRef.current;
    if (!svg) return;
    dragCTM.current = svg.getScreenCTM()?.inverse() ?? null;
    const { x, y } = toSVG(e);
    setSvgDrag({ type: 'pan', sx: x, sy: y, ox: viewOff.x, oy: viewOff.y });
  };

  const onLayerDown = (e: React.MouseEvent, layerIdx: number) => {
    if (e.button !== 0) {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        onCanvasDown(e);
      }
      return;
    }
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    dragCTM.current = svg.getScreenCTM()?.inverse() ?? null;
    const { x, y } = toSVG(e);
    const p = layerPositions[layerIdx] || { x: 0, y: 0 };
    setSvgDrag({ type: 'layer', layerIdx, sx: x, sy: y, ox: p.x, oy: p.y });
  };

  const onPaneDown = (e: React.MouseEvent) => {
    if (e.button !== 0) {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        onCanvasDown(e);
      }
      return;
    }
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    dragCTM.current = svg.getScreenCTM()?.inverse() ?? null;
    const { x, y } = toSVG(e);
    setSvgDrag({ type: 'pane', sx: x, sy: y, ox: infoPanePos.x, oy: infoPanePos.y });
  };

  const onArrowHandleDown = (
    e: React.MouseEvent,
    arrowId: string,
    pointIndex: number,
    curX: number,
    curY: number
  ) => {
    if (e.button !== 0) {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        onCanvasDown(e);
      }
      return;
    }
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    dragCTM.current = svg.getScreenCTM()?.inverse() ?? null;
    const { x, y } = toSVG(e);
    setSvgDrag({
      type: 'arrowControl',
      arrowId,
      pointIndex,
      sx: x,
      sy: y,
      ox: curX,
      oy: curY
    });
  };

  const onPrintBoxDown = (e: React.MouseEvent, curX: number, curY: number) => {
    if (e.button !== 0) {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        onCanvasDown(e);
      }
      return;
    }
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    dragCTM.current = svg.getScreenCTM()?.inverse() ?? null;
    const { x, y } = toSVG(e);
    setSvgDrag({ type: 'printBox', sx: x, sy: y, ox: curX, oy: curY });
  };

  const onPrintBoxResizeDown = (e: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br', curX: number, curY: number, curW: number, curH: number) => {
    if (e.button !== 0) {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        onCanvasDown(e);
      }
      return;
    }
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    dragCTM.current = svg.getScreenCTM()?.inverse() ?? null;
    const { x, y } = toSVG(e);
    setSvgDrag({ type: 'printBoxResize', corner, sx: x, sy: y, ox: curX, oy: curY, initialW: curW, initialH: curH });
  };

  const onSVGMove = (e: React.MouseEvent | MouseEvent) => {
    if (!svgDrag) return;
    const { x, y } = toSVG(e);
    const dx = x - svgDrag.sx;
    const dy = y - svgDrag.sy;

    if (svgDrag.type === 'pan') {
      setViewOff({ x: svgDrag.ox - dx, y: svgDrag.oy - dy });
    } else if (svgDrag.type === 'layer') {
      const activeLayerIdx = svgDrag.layerIdx;
      let nx = svgDrag.ox + dx;
      let ny = svgDrag.oy + dy;
      const SNAP_DIST = 15;
      const guides: SnapGuide[] = [];

      Object.entries(layerPositions).forEach(([idxStr, p]) => {
        const i = parseInt(idxStr);
        if (i === activeLayerIdx) return;
        if (Math.abs(nx - p.x) < SNAP_DIST) {
          nx = p.x;
          guides.push({ type: 'v', x: p.x, y1: Math.min(ny, p.y), y2: Math.max(ny, p.y) });
        }
        if (Math.abs(ny - p.y) < SNAP_DIST) {
          ny = p.y;
          guides.push({ type: 'h', y: p.y, x1: Math.min(nx, p.x), x2: Math.max(nx, p.x) });
        }
      });
      setSnapGuides(guides);
      setLayerPos(prev => ({ ...prev, [activeLayerIdx]: { x: nx, y: ny } }));
    } else if (svgDrag.type === 'arrowControl') {
      const nx = svgDrag.ox + dx;
      const ny = svgDrag.oy + dy;

      setArrowMidpoints(prev => {
        const data = prev[svgDrag.arrowId] ? { ...prev[svgDrag.arrowId] } : { pts: [] };
        if (svgDrag.pointIndex === -1) {
          data.startAim = { x: nx, y: ny };
        } else if (svgDrag.pointIndex === -2) {
          data.endAim = { x: nx, y: ny };
        } else {
          const nextPts = [...data.pts];
          nextPts[svgDrag.pointIndex] = { x: nx, y: ny };
          data.pts = nextPts;
        }
        return { ...prev, [svgDrag.arrowId]: data };
      });
    } else if (svgDrag.type === 'pane') {
      setInfoPanePos({ x: svgDrag.ox + dx, y: svgDrag.oy + dy });
    } else if (svgDrag.type === 'printBox') {
      setPrintBoxPos({ x: svgDrag.ox + dx, y: svgDrag.oy + dy });
    } else if (svgDrag.type === 'printBoxResize') {
      const { corner, initialW, initialH } = svgDrag;
      let newW = initialW;
      let newH = initialH;
      let newX = svgDrag.ox;
      let newY = svgDrag.oy;

      const printAspect = printOrientation === 'landscape' ? 1800 / 1240 : 1200 / 1735;

      if (corner === 'br') {
        newW = initialW + dx;
        newH = newW / printAspect;
      } else if (corner === 'tr') {
        newW = initialW + dx;
        newH = newW / printAspect;
        newY = svgDrag.oy + initialH - newH;
      } else if (corner === 'bl') {
        newW = initialW - dx;
        newH = newW / printAspect;
        newX = svgDrag.ox + dx;
      } else if (corner === 'tl') {
        newW = initialW - dx;
        newH = newW / printAspect;
        newX = svgDrag.ox + dx;
        newY = svgDrag.oy + initialH - newH;
      }

      // Enforce a minimum width so it doesn't flip or become zero
      if (newW > 200) {
        setPrintBoxPos({ x: newX, y: newY });
        const printVW = printOrientation === 'landscape' ? 1800 : 1200;
        setPrintScale(newW / printVW);
      }
    }
  };

  const onSVGUp = () => {
    if (svgDrag && (
      svgDrag.type === 'layer' ||
      svgDrag.type === 'arrowControl' ||
      svgDrag.type === 'pane' ||
      svgDrag.type === 'printBox' ||
      svgDrag.type === 'printBoxResize'
    )) {
      commitHistory(stateRef.current);
    }
    setSvgDrag(null);
    setSnapGuides([]);
    dragCTM.current = null;
  };

  const toggleLayerVisibility = useCallback((idx: number) => {
    const nextHidden = { ...stateRef.current.hiddenLayers, [idx]: !stateRef.current.hiddenLayers[idx] };
    setHiddenLayers(nextHidden);
    commitHistory({ ...stateRef.current, hiddenLayers: nextHidden });
  }, [setHiddenLayers, commitHistory]);

  const addArrowPoint = useCallback((arrowId: string, pt: Point, insertIndex: number) => {
    setArrowMidpoints(prev => {
      const data = prev[arrowId] ? { ...prev[arrowId] } : { pts: [] };
      const nextPts = [...data.pts];
      nextPts.splice(insertIndex, 0, pt);
      const next = { ...prev, [arrowId]: { ...data, pts: nextPts } };
      commitHistory({ ...stateRef.current, arrowMidpoints: next });
      return next;
    });
  }, [commitHistory]);

  const deleteArrowPoint = useCallback((arrowId: string, pointIndex: number) => {
    setArrowMidpoints(prev => {
      const data = prev[arrowId] ? { ...prev[arrowId] } : { pts: [] };
      const nextPts = [...data.pts];
      nextPts.splice(pointIndex, 1);
      const next = { ...prev, [arrowId]: { ...data, pts: nextPts } };
      commitHistory({ ...stateRef.current, arrowMidpoints: next });
      return next;
    });
  }, [commitHistory]);

  const resetArrows = useCallback(() => {
    setArrowMidpoints({});
    commitHistory({ ...stateRef.current, arrowMidpoints: {} });
  }, [commitHistory]);

  return {
    layerPositions,
    arrowMidpoints,
    resetArrows,
    hiddenLayers,
    infoPanePos,
    printBoxPos,
    printScale,
    viewOff,
    zoom: localZoom,
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
  };
}
