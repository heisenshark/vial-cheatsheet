import React, { useState, useEffect, useRef } from 'react';
import { PRESETS } from './presets';
import { translateKeycode } from './keycodes';
import { parseKLE, mapLayersToLayout } from './kleParser';

// Premium GMK-inspired & Custom Theme configurations
const THEMES = {
  gmk_olivia: {
    id: "gmk_olivia",
    name: "GMK Olivia (Pink & Dark)",
    bg: "#1c1c1c",
    keyAlpha: "#f1e3dc",
    keyAlphaText: "#1c1c1c",
    keyModifier: "#2d2d2d",
    keyModifierText: "#f1e3dc",
    keyAccent: "#eab8b1",
    keyAccentText: "#1c1c1c",
    textColor: "#ffffff",
    boardColor: "#121212"
  },
  gmk_laser: {
    id: "gmk_laser",
    name: "GMK Laser (Synthwave)",
    bg: "#0d0a1b",
    keyAlpha: "#005f73",
    keyAlphaText: "#ff007f",
    keyModifier: "#1b1834",
    keyModifierText: "#00f0ff",
    keyAccent: "#ff007f",
    keyAccentText: "#ffffff",
    textColor: "#ff007f",
    boardColor: "#06040f"
  },
  gmk_carbon: {
    id: "gmk_carbon",
    name: "GMK Carbon (Orange & Charcoal)",
    bg: "#202020",
    keyAlpha: "#eae6df",
    keyAlphaText: "#2d2d2d",
    keyModifier: "#4d4d4d",
    keyModifierText: "#ff6600",
    keyAccent: "#ff6600",
    keyAccentText: "#ffffff",
    textColor: "#eae6df",
    boardColor: "#141414"
  },
  sleek_dark: {
    id: "sleek_dark",
    name: "Cyber Slate (Dark Mode)",
    bg: "#0f172a",
    keyAlpha: "#1e293b",
    keyAlphaText: "#f8fafc",
    keyModifier: "#334155",
    keyModifierText: "#cbd5e1",
    keyAccent: "#3b82f6",
    keyAccentText: "#ffffff",
    textColor: "#f8fafc",
    boardColor: "#020617"
  },
  minimal_light: {
    id: "minimal_light",
    name: "Minimalist Light",
    bg: "#f8fafc",
    keyAlpha: "#ffffff",
    keyAlphaText: "#0f172a",
    keyModifier: "#e2e8f0",
    keyModifierText: "#334155",
    keyAccent: "#0f172a",
    keyAccentText: "#ffffff",
    textColor: "#0f172a",
    boardColor: "#cbd5e1"
  }
};

const CheatsheetMaker = () => {
  // Preset Selection
  const [selectedPresetKey, setSelectedPresetKey] = useState("corne");
  
  // Layout & Matrix state (instantiated with selected preset)
  const [parsedKeys, setParsedKeys] = useState([]);
  const [parsedMatrix, setParsedMatrix] = useState({ rows: 4, cols: 12 });
  
  // Keymap layers state (from uploaded .vil or presets)
  const [uploadedLayers, setUploadedLayers] = useState(null);
  const [mappedLayers, setMappedLayers] = useState([]);
  const [activeLayer, setActiveLayer] = useState(0);
  
  // Custom Styling
  const [activeThemeId, setActiveThemeId] = useState("gmk_olivia");
  const [unitSize, setUnitSize] = useState(55);
  const [keySpacing, setKeySpacing] = useState(4);
  const [keyRoundness, setKeyRoundness] = useState(6);
  const [fontSize, setFontSize] = useState(13);
  const [borderWidth, setBorderWidth] = useState(1.5);
  const [fontFamily, setFontFamily] = useState("Inter");
  
  // Rendering details
  const [showMatrixCoords, setShowMatrixCoords] = useState(false);
  const [transparentBg, setTransparentBg] = useState(false);
  
  // Interactive Overrides
  const [selectedKeyIdx, setSelectedKeyIdx] = useState(null);
  const [keyOverrides, setKeyOverrides] = useState({}); // e.g., { keyIndex: { label: '', color: '', textColor: '', type: '' } }
  
  // Notifications/Feedback
  const [notification, setNotification] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const activeTheme = THEMES[activeThemeId] || THEMES.gmk_olivia;
  
  // Load Fonts dynamically
  useEffect(() => {
    const fontLink = document.getElementById('google-fonts-cheatsheet');
    if (!fontLink) {
      const link = document.createElement('link');
      link.id = 'google-fonts-cheatsheet';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Inter:wght@400;600;700&family=Outfit:wght@400;600;700&family=JetBrains+Mono:wght@400;600;700&family=Roboto:wght@400;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Update layout when preset is changed
  useEffect(() => {
    if (selectedPresetKey !== "custom") {
      const preset = PRESETS[selectedPresetKey];
      if (preset) {
        const keys = parseKLE(preset.keymap);
        setParsedKeys(keys);
        setParsedMatrix(preset.matrix);
        setSelectedKeyIdx(null);
        setKeyOverrides({});
        
        const layers = uploadedLayers || preset.defaultLayers;
        const mapped = mapLayersToLayout(keys, layers, preset.matrix);
        setMappedLayers(mapped);
      }
    }
  }, [selectedPresetKey, uploadedLayers]);

  // Re-map layouts whenever keys, layers, or matrix definitions change
  useEffect(() => {
    if (parsedKeys.length > 0) {
      const layers = uploadedLayers || (PRESETS[selectedPresetKey]?.defaultLayers || [[]]);
      const mapped = mapLayersToLayout(parsedKeys, layers, parsedMatrix);
      setMappedLayers(mapped);
    }
  }, [parsedKeys, uploadedLayers, parsedMatrix]);

  // Auto-hide notifications after 4s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle file uploads
  const handleUploadedFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = JSON.parse(text);
        
        // 1. Check if it's a keymap file (.vil or has layers)
        if (data.layers && Array.isArray(data.layers)) {
          setUploadedLayers(data.layers);
          setActiveLayer(0);
          showToast('success', `Loaded keymap file with ${data.layers.length} layers!`);
        } 
        // 2. Check if it's a layout template (vial.json)
        else if (data.layouts || (data.keys && Array.isArray(data.keys)) || Array.isArray(data)) {
          let keysList = [];
          let matrixInfo = { rows: 5, cols: 14 };
          
          if (data.layouts && data.layouts.keymap) {
            keysList = parseKLE(data.layouts.keymap);
            if (data.matrix) {
              matrixInfo = data.matrix;
            } else {
              // Guess matrix size from coordinate labels "row,col"
              const rows = Math.max(...keysList.map(k => {
                const parts = k.label.split(',');
                return parts.length === 2 ? parseInt(parts[0], 10) : 0;
              })) + 1;
              const cols = Math.max(...keysList.map(k => {
                const parts = k.label.split(',');
                return parts.length === 2 ? parseInt(parts[1], 10) : 0;
              })) + 1;
              matrixInfo = { rows, cols };
            }
          } else if (Array.isArray(data)) {
            keysList = parseKLE(data);
          } else if (data.keys) {
            keysList = data.keys;
          }
          
          setSelectedPresetKey("custom");
          setParsedKeys(keysList);
          setParsedMatrix(matrixInfo);
          setSelectedKeyIdx(null);
          setKeyOverrides({});
          showToast('success', `Loaded custom layout definition containing ${keysList.length} keys!`);
        } else {
          showToast('error', 'Unrecognized JSON format. Upload a vial.json layout or .vil keymap file.');
        }
      } catch (err) {
        showToast('error', 'Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const showToast = (type, message) => {
    setNotification({ type, message });
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUploadedFile(file);
  };

  const selectFile = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUploadedFile(file);
  };

  // Dimension Calculations
  const getLayoutDimensions = () => {
    if (parsedKeys.length === 0) return { width: 0, height: 0, maxX: 0, maxY: 0 };
    const maxX = Math.max(...parsedKeys.map(k => k.x + k.w));
    const maxY = Math.max(...parsedKeys.map(k => k.y + k.h));
    const padding = 0.5; // padding on outer edges
    
    return {
      width: (maxX + padding * 2) * unitSize,
      height: (maxY + padding * 2) * unitSize,
      maxX,
      maxY,
      offset: padding
    };
  };

  // Render Styling Helper
  const getKeycapStyles = (key, index) => {
    const override = keyOverrides[index] || {};
    const keyType = override.type || key.role;
    
    let fill = activeTheme.keyAlpha;
    let stroke = activeTheme.boardColor;
    let textColor = activeTheme.keyAlphaText;
    
    // Set colors based on role
    if (keyType === "modifier") {
      fill = activeTheme.keyModifier;
      textColor = activeTheme.keyModifierText;
    } else if (keyType === "accent" || keyType === "layer") {
      fill = activeTheme.keyAccent;
      textColor = activeTheme.keyAccentText;
    } else if (keyType === "special" || keyType === "layertap" || keyType === "modtap") {
      fill = activeTheme.keyModifier;
      textColor = activeTheme.keyModifierText;
    } else if (keyType === "trans") {
      fill = activeTheme.bg;
      textColor = activeTheme.textColor;
      stroke = activeTheme.textColor + "55"; // translucent
    } else if (keyType === "empty") {
      fill = "transparent";
      textColor = "transparent";
      stroke = "transparent";
    }
    
    // Apply key-specific overrides if available
    if (override.color) fill = override.color;
    if (override.textColor) textColor = override.textColor;
    
    return { fill, stroke, textColor };
  };

  // Update specific selected key property override
  const updateKeyOverride = (field, value) => {
    if (selectedKeyIdx === null) return;
    setKeyOverrides(prev => ({
      ...prev,
      [selectedKeyIdx]: {
        ...prev[selectedKeyIdx],
        [field]: value
      }
    }));
  };

  const resetSelectedKeyOverrides = () => {
    if (selectedKeyIdx === null) return;
    setKeyOverrides(prev => {
      const copy = { ...prev };
      delete copy[selectedKeyIdx];
      return copy;
    });
  };

  const resetAllOverrides = () => {
    setKeyOverrides({});
    showToast('info', 'All overrides cleared.');
  };

  // Export functions
  const downloadSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const svgDoc = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    const blob = new Blob([svgDoc], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedPresetKey}_layer${activeLayer}_layout.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'SVG downloaded successfully!');
  };

  const copySVGCode = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    navigator.clipboard.writeText(source).then(() => {
      showToast('success', 'SVG markup copied to clipboard!');
    }).catch(() => {
      showToast('error', 'Failed to copy SVG code.');
    });
  };

  const downloadPNG = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      // Render at double scale for sharpness
      const scale = 2;
      const width = (svgElement.clientWidth || svgElement.viewBox.baseVal.width);
      const height = (svgElement.clientHeight || svgElement.viewBox.baseVal.height);
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      const context = canvas.getContext('2d');
      context.scale(scale, scale);
      
      if (!transparentBg) {
        context.fillStyle = activeTheme.bg;
        context.fillRect(0, 0, width, height);
      }
      
      context.drawImage(image, 0, 0, width, height);
      
      const pngURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngURL;
      link.download = `${selectedPresetKey}_layer${activeLayer}_layout.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobURL);
      showToast('success', 'PNG downloaded successfully!');
    };
    image.src = blobURL;
  };

  // Main Render Logic
  const activeKeys = mappedLayers[activeLayer] || parsedKeys.map(k => ({ ...k, keycode: "" }));
  const { width: svgWidth, height: svgHeight, offset: paddingOffset } = getLayoutDimensions();
  const selectedKeyInfo = selectedKeyIdx !== null ? activeKeys[selectedKeyIdx] : null;
  const selectedKeyOverride = selectedKeyIdx !== null ? (keyOverrides[selectedKeyIdx] || {}) : {};

  return (
    <div className="maker-container">
      {/* Toast Notification */}
      {notification && (
        <div className={`toast toast-${notification.type}`}>
          <div className="toast-content">{notification.message}</div>
        </div>
      )}

      {/* Header Area */}
      <header className="maker-header">
        <div className="header-info">
          <h1>Vial Layout Cheatsheet Maker</h1>
          <p>Design premium, print-ready keyboard layouts using QMK/Vial config files</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>
            <span className="icon">📂</span> Upload File
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json,.vil"
            onChange={selectFile}
          />
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="workspace-grid">
        {/* Left Side: Interactive Keyboard Canvas */}
        <div className="canvas-wrapper">
          <div 
            className={`drag-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="drag-overlay">
                <div className="drag-message">
                  <span className="drag-icon">📥</span>
                  Drop your vial.json or .vil keymap here
                </div>
              </div>
            )}

            {parsedKeys.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">⌨️</span>
                <h3>No Keyboard Layout Loaded</h3>
                <p>Select a built-in preset or drop your keyboard configuration file here.</p>
                <div className="empty-buttons">
                  <button className="btn btn-primary" onClick={() => setSelectedPresetKey("corne")}>
                    Load Corne Preset
                  </button>
                  <button className="btn btn-secondary" onClick={() => setSelectedPresetKey("ansi60")}>
                    Load 60% ANSI Preset
                  </button>
                </div>
              </div>
            ) : (
              <div className="svg-container" style={{ background: transparentBg ? 'transparent' : activeTheme.bg }}>
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{
                    maxHeight: '480px',
                    transition: 'all 0.3s ease',
                    fontFamily: fontFamily
                  }}
                >
                  {/* Keyboard Plate/Bezel Background */}
                  <rect
                    x={paddingOffset * unitSize - 10}
                    y={paddingOffset * unitSize - 10}
                    width={svgWidth - (paddingOffset * 2) * unitSize + 20}
                    height={svgHeight - (paddingOffset * 2) * unitSize + 20}
                    fill={activeTheme.boardColor}
                    rx={keyRoundness + 6}
                    ry={keyRoundness + 6}
                    stroke={activeTheme.boardColor}
                    strokeWidth={4}
                    opacity={0.85}
                  />

                  {/* Render Keys */}
                  {activeKeys.map((key, idx) => {
                    const rxVal = (key.rx + paddingOffset) * unitSize;
                    const ryVal = (key.ry + paddingOffset) * unitSize;
                    const xVal = (key.x + paddingOffset) * unitSize;
                    const yVal = (key.y + paddingOffset) * unitSize;
                    const wVal = key.w * unitSize;
                    const hVal = key.h * unitSize;
                    
                    const isSelected = selectedKeyIdx === idx;
                    const { fill, stroke, textColor } = getKeycapStyles(key, idx);
                    
                    // Determine legend: priority is Override -> Translated keycode -> Matrix coordinate
                    const override = keyOverrides[idx] || {};
                    let rawCode = key.keycode || "";
                    let { label: translatedLabel, type: keyRole } = translateKeycode(rawCode);
                    
                    // Save inferred key role if not set
                    if (!key.role) key.role = keyRole;
                    
                    let legend = override.label !== undefined ? override.label : translatedLabel;
                    if (legend === "" && showMatrixCoords) {
                      legend = key.label; // show coordinates if toggled and key is blank
                    }
                    
                    const lines = legend.split('\n');
                    
                    return (
                      <g
                        key={idx}
                        transform={key.r ? `rotate(${key.r}, ${rxVal}, ${ryVal})` : undefined}
                        onClick={() => setSelectedKeyIdx(idx)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Keycap Body Shadow */}
                        <rect
                          x={xVal + keySpacing / 2}
                          y={yVal + keySpacing / 2 + 2}
                          width={wVal - keySpacing}
                          height={hVal - keySpacing}
                          fill="rgba(0,0,0,0.15)"
                          rx={keyRoundness}
                          ry={keyRoundness}
                        />
                        
                        {/* Keycap Outer Body */}
                        <rect
                          x={xVal + keySpacing / 2}
                          y={yVal + keySpacing / 2}
                          width={wVal - keySpacing}
                          height={hVal - keySpacing}
                          fill={fill}
                          stroke={isSelected ? "#f59e0b" : stroke}
                          strokeWidth={isSelected ? Math.max(borderWidth, 2.5) : borderWidth}
                          rx={keyRoundness}
                          ry={keyRoundness}
                          style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
                        />
                        
                        {/* Premium Inset Edge */}
                        {keyRole !== "empty" && keyRole !== "trans" && (
                          <rect
                            x={xVal + keySpacing / 2 + 2}
                            y={yVal + keySpacing / 2 + 1}
                            width={wVal - keySpacing - 4}
                            height={hVal - keySpacing - 3}
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.12)"
                            strokeWidth={1}
                            rx={Math.max(0, keyRoundness - 2)}
                            ry={Math.max(0, keyRoundness - 2)}
                            pointerEvents="none"
                          />
                        )}

                        {/* Text Legend */}
                        <text
                          x={xVal + wVal / 2}
                          y={yVal + hVal / 2 + (lines.length > 1 ? -fontSize / 2 : fontSize / 3.5)}
                          textAnchor="middle"
                          fontSize={fontSize}
                          fill={textColor}
                          fontWeight="600"
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {lines.map((line, lIdx) => (
                            <tspan x={xVal + wVal / 2} dy={lIdx > 0 ? fontSize + 3 : 0} key={lIdx}>
                              {line}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Quick Info & Help Bar */}
          <div className="canvas-footer">
            <div className="info-badge">
              <span>Selected Preset:</span> <strong>{selectedPresetKey === "custom" ? "Custom File" : PRESETS[selectedPresetKey]?.name}</strong>
            </div>
            <div className="info-badge">
              <span>Matrix Size:</span> <strong>{parsedMatrix.rows} × {parsedMatrix.cols}</strong>
            </div>
            {selectedKeyIdx !== null && (
              <div className="info-badge highlight">
                <span>Selected Key:</span> <strong>Coordinate ({selectedKeyInfo?.label})</strong>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Options & Sidebar Controls */}
        <div className="sidebar-panels">
          
          {/* Panel 1: Presets & Layout Files */}
          <div className="glass-card panel">
            <h3>Layout Template</h3>
            <div className="form-group">
              <label>Select Preset Layout</label>
              <select 
                value={selectedPresetKey} 
                onChange={(e) => setSelectedPresetKey(e.target.value)}
                className="select-input"
              >
                <option value="corne">Corne (40% Split)</option>
                <option value="ansi60">60% ANSI (Standard)</option>
                <option value="custom" disabled={selectedPresetKey !== "custom"}>Uploaded Custom Layout</option>
              </select>
            </div>
            
            {/* Layers tabs */}
            {mappedLayers.length > 0 && (
              <div className="form-group">
                <label>Keymap Layer</label>
                <div className="layer-tabs">
                  {mappedLayers.map((_, idx) => (
                    <button
                      key={idx}
                      className={`layer-tab ${activeLayer === idx ? 'active' : ''}`}
                      onClick={() => {
                        setActiveLayer(idx);
                        setSelectedKeyIdx(null);
                      }}
                    >
                      L{idx}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panel 2: Theme & Styling Panel */}
          <div className="glass-card panel">
            <h3>Visual Style</h3>
            <div className="form-group">
              <label>Color Theme</label>
              <div className="theme-grid">
                {Object.values(THEMES).map((t) => (
                  <button
                    key={t.id}
                    className={`theme-badge ${activeThemeId === t.id ? 'active' : ''}`}
                    style={{ background: t.bg, borderColor: t.keyAccent }}
                    onClick={() => setActiveThemeId(t.id)}
                    title={t.name}
                  >
                    <span style={{ color: t.keyAlpha }}>●</span>
                    <span style={{ color: t.keyModifier }}>●</span>
                    <span style={{ color: t.keyAccent }}>●</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Font Family</label>
              <select 
                value={fontFamily} 
                onChange={(e) => setFontFamily(e.target.value)}
                className="select-input"
              >
                <option value="Inter">Inter (Sans-Serif)</option>
                <option value="Outfit">Outfit (Clean Geometric)</option>
                <option value="Fira Code">Fira Code (Developer)</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="Roboto">Roboto</option>
              </select>
            </div>

            <div className="sliders-grid">
              <div className="slider-item">
                <label>Key Size ({unitSize}px)</label>
                <input 
                  type="range" min="35" max="85" value={unitSize} 
                  onChange={(e) => setUnitSize(parseInt(e.target.value))} 
                />
              </div>
              <div className="slider-item">
                <label>Gap ({keySpacing}px)</label>
                <input 
                  type="range" min="0" max="10" value={keySpacing} 
                  onChange={(e) => setKeySpacing(parseInt(e.target.value))} 
                />
              </div>
              <div className="slider-item">
                <label>Roundness ({keyRoundness}px)</label>
                <input 
                  type="range" min="0" max="20" value={keyRoundness} 
                  onChange={(e) => setKeyRoundness(parseInt(e.target.value))} 
                />
              </div>
              <div className="slider-item">
                <label>Font Size ({fontSize}px)</label>
                <input 
                  type="range" min="8" max="22" value={fontSize} 
                  onChange={(e) => setFontSize(parseInt(e.target.value))} 
                />
              </div>
            </div>

            <div className="checkboxes-row">
              <label className="checkbox-label">
                <input 
                  type="checkbox" checked={showMatrixCoords} 
                  onChange={(e) => setShowMatrixCoords(e.target.checked)} 
                />
                Show coordinates when blank
              </label>
            </div>
          </div>

          {/* Panel 3: Interactive Key Editor */}
          {selectedKeyIdx !== null && selectedKeyInfo && (
            <div className="glass-card panel key-editor">
              <div className="panel-title-row">
                <h3>Edit Key ({selectedKeyInfo.label})</h3>
                <button className="btn-close" onClick={() => setSelectedKeyIdx(null)}>×</button>
              </div>

              <div className="form-group">
                <label>Key Legend (Supports \n for newline)</label>
                <input
                  type="text"
                  value={selectedKeyOverride.label !== undefined ? selectedKeyOverride.label : (translateKeycode(selectedKeyInfo.keycode).label)}
                  onChange={(e) => updateKeyOverride("label", e.target.value)}
                  className="text-input"
                />
              </div>

              <div className="form-group">
                <label>Key Role/Type</label>
                <select
                  value={selectedKeyOverride.type || selectedKeyInfo.role || "alpha"}
                  onChange={(e) => updateKeyOverride("type", e.target.value)}
                  className="select-input"
                >
                  <option value="alpha">Alpha/Standard Key</option>
                  <option value="modifier">Modifier Key</option>
                  <option value="accent">Accent Key</option>
                  <option value="trans">Transparent Key (▽)</option>
                  <option value="empty">Empty/Deleted Key</option>
                </select>
              </div>

              <div className="color-pickers-row">
                <div className="form-group color-input-group">
                  <label>Bg Override</label>
                  <input
                    type="color"
                    value={selectedKeyOverride.color || getKeycapStyles(selectedKeyInfo, selectedKeyIdx).fill}
                    onChange={(e) => updateKeyOverride("color", e.target.value)}
                  />
                </div>
                <div className="form-group color-input-group">
                  <label>Text Override</label>
                  <input
                    type="color"
                    value={selectedKeyOverride.textColor || getKeycapStyles(selectedKeyInfo, selectedKeyIdx).textColor}
                    onChange={(e) => updateKeyOverride("textColor", e.target.value)}
                  />
                </div>
              </div>

              <div className="key-editor-actions">
                <button className="btn btn-secondary btn-sm" onClick={resetSelectedKeyOverrides}>
                  Reset Key
                </button>
                {Object.keys(keyOverrides).length > 0 && (
                  <button className="btn btn-secondary btn-sm btn-danger" onClick={resetAllOverrides}>
                    Clear All Overrides
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Panel 4: Export Panel */}
          {parsedKeys.length > 0 && (
            <div className="glass-card panel export-panel">
              <h3>Export Options</h3>
              <div className="checkboxes-row" style={{ marginBottom: '1rem' }}>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" checked={transparentBg} 
                    onChange={(e) => setTransparentBg(e.target.checked)} 
                  />
                  Transparent background in exports
                </label>
              </div>
              <div className="export-buttons-grid">
                <button className="btn btn-primary" onClick={downloadSVG}>
                  Download SVG
                </button>
                <button className="btn btn-secondary" onClick={downloadPNG}>
                  Download PNG
                </button>
                <button className="btn btn-secondary" onClick={copySVGCode}>
                  Copy SVG Code
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CheatsheetMaker;
