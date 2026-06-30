import { useState, useRef, useEffect, useCallback } from 'react';
import type { ParsedKey, DragState, SnapGuide, Point } from '../types';

interface HistoryState {
  layerPositions: Record<number, Point>;
  arrowMidpoints: Record<string, Point[]>;
  hiddenLayers: Record<number, boolean>;
  infoPanePos: Point;
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
  const [arrowMidpoints, setArrowMidpoints] = useState<Record<string, Point[]>>({});
  const [hiddenLayersLocal, setHiddenLayersLocal] = useState<Record<number, boolean>>({});
  const hiddenLayers = hiddenLayersProp ?? hiddenLayersLocal;
  const setHiddenLayers = setHiddenLayersProp ?? setHiddenLayersLocal;
  const [infoPanePos, setInfoPanePos] = useState<Point>({ x: 0, y: 0 });
  const [viewOff, setViewOff] = useState<Point>({ x: -40, y: -40 });
  const [svgDrag, setSvgDrag] = useState<DragState | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  
  const [history, setHistory] = useState({ stack: [] as HistoryState[], index: -1 });
  const stateRef = useRef<HistoryState & { infoPanePos: Point }>({ layerPositions: {}, arrowMidpoints: {}, hiddenLayers: {}, infoPanePos: { x: 0, y: 0 } });
  stateRef.current = { layerPositions, arrowMidpoints, hiddenLayers, infoPanePos };
  
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
    const initialState = { layerPositions: pos, arrowMidpoints: {}, hiddenLayers: {}, infoPanePos: { x: initialPaneX, y: 20 } };
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
    
    const requiredZoom = Math.max(contentW / printVW, contentH / printVH);
    const finalZoom = Math.max(0.2, Math.min(5.0, requiredZoom));
    setPrintZoom(finalZoom);
    
    const baseVW = 2500;
    const baseVH = 2500;
    const VW = baseVW * finalZoom;
    const VH = baseVH * finalZoom;
    const centerX = minX + contentW / 2;
    const centerY = minY + contentH / 2;
    setViewOff({ x: centerX - VW / 2, y: centerY - VH / 2 });
  }, [parsedKeys, mappedLayers, printOrientation, setPrintZoom, unitSize, showInfoPane, combos, tapDances]);

  useEffect(() => {
    fitVisibleToPage();
  }, [printOrientation, fitVisibleToPage]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
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
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [setPrintZoom, layerPositions, svgRef.current]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            setHistory(prev => {
              if (prev.index < prev.stack.length - 1) {
                const nextIndex = prev.index + 1;
                const state = prev.stack[nextIndex];
                setLayerPos(state.layerPositions);
                setArrowMidpoints(state.arrowMidpoints);
                setHiddenLayers(state.hiddenLayers);
                if (state.infoPanePos) setInfoPanePos(state.infoPanePos);
                return { ...prev, index: nextIndex };
              }
              return prev;
            });
          } else {
            setHistory(prev => {
              if (prev.index > 0) {
                const nextIndex = prev.index - 1;
                const state = prev.stack[nextIndex];
                setLayerPos(state.layerPositions);
                setArrowMidpoints(state.arrowMidpoints);
                setHiddenLayers(state.hiddenLayers);
                if (state.infoPanePos) setInfoPanePos(state.infoPanePos);
                return { ...prev, index: nextIndex };
              }
              return prev;
            });
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
    const svg = svgRef.current;
    if (!svg) return;
    dragCTM.current = svg.getScreenCTM()?.inverse() ?? null;
    const { x, y } = toSVG(e);
    setSvgDrag({ type: 'pan', sx: x, sy: y, ox: viewOff.x, oy: viewOff.y });
  };

  const onLayerDown = (e: React.MouseEvent, layerIdx: number) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    dragCTM.current = svg.getScreenCTM()?.inverse() ?? null;
    const { x, y } = toSVG(e);
    const p = layerPositions[layerIdx] || { x: 0, y: 0 };
    setSvgDrag({ type: 'layer', layerIdx, sx: x, sy: y, ox: p.x, oy: p.y });
  };

  const onPaneDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    dragCTM.current = svg.getScreenCTM()?.inverse() ?? null;
    const { x, y } = toSVG(e);
    setSvgDrag({ type: 'pane', sx: x, sy: y, ox: infoPanePos.x, oy: infoPanePos.y });
  };

  const onArrowHandleDown = (e: React.MouseEvent, arrowId: string, pointIndex: number, curX: number, curY: number) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    dragCTM.current = svg.getScreenCTM()?.inverse() ?? null;
    const { x, y } = toSVG(e);
    setSvgDrag({ type: 'arrowControl', arrowId, pointIndex, sx: x, sy: y, ox: curX, oy: curY });
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
        const arr = prev[svgDrag.arrowId] ? [...prev[svgDrag.arrowId]] : [];
        arr[svgDrag.pointIndex] = { x: nx, y: ny };
        return { ...prev, [svgDrag.arrowId]: arr };
      });
    } else if (svgDrag.type === 'pane') {
      setInfoPanePos({ x: svgDrag.ox + dx, y: svgDrag.oy + dy });
    }
  };

  const onSVGUp = () => {
    if (svgDrag && (svgDrag.type === 'layer' || svgDrag.type === 'arrowControl' || svgDrag.type === 'pane')) {
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
  };
}
