// Parses Keyboard Layout Editor (KLE) JSON format and maps layers to physical keys
export function parseKLE(layoutData) {
  if (!Array.isArray(layoutData)) return [];
  
  const keys = [];
  
  // Current state of the parser
  let currentW = 1;
  let currentH = 1;
  
  // Rotation state
  let r = 0;
  let rx = 0;
  let ry = 0;
  
  // Cursor position
  let cx = 0;
  let cy = 0;
  
  for (let rIndex = 0; rIndex < layoutData.length; rIndex++) {
    const row = layoutData[rIndex];
    if (!Array.isArray(row)) continue;
    
    // Start of row: reset x cursor to rx
    cx = rx;
    
    for (let iIndex = 0; iIndex < row.length; iIndex++) {
      const item = row[iIndex];
      
      if (typeof item === 'object' && item !== null) {
        let rxChanged = false;
        
        if (item.rx !== undefined) {
          rx = item.rx;
          rxChanged = true;
        }
        if (item.ry !== undefined) {
          ry = item.ry;
          rxChanged = true;
        }
        if (item.r !== undefined) {
          r = item.r;
          rxChanged = true;
        }
        
        // If rotation center or angle changes, reset cursor positions
        if (rxChanged) {
          cx = rx;
          cy = ry;
        }
        
        // Relative spacing offsets
        if (item.x !== undefined) cx += item.x;
        if (item.y !== undefined) cy += item.y;
        
        // Keycap sizes
        if (item.w !== undefined) currentW = item.w;
        if (item.h !== undefined) currentH = item.h;
        
      } else if (typeof item === 'string') {
        const label = item;
        
        keys.push({
          x: cx,
          y: cy,
          w: currentW,
          h: currentH,
          label: label,
          r: r,
          rx: rx,
          ry: ry
        });
        
        // Advance cursor by key width
        cx += currentW;
        
        // Reset keycap dimensions to default 1x1
        currentW = 1;
        currentH = 1;
      }
    }
    
    // End of row: increment Y cursor by 1
    cy += 1;
  }
  
  return keys;
}

// Maps flat layers list of keycodes to keys with row,col matrix labels or sequential index
export function mapLayersToLayout(keys, layers, matrix) {
  const cols = matrix?.cols ?? 14;
  
  if (!layers || layers.length === 0) {
    return [keys.map(k => ({ ...k, keycode: "" }))];
  }
  
  return layers.map((layerKeycodes) => {
    return keys.map((key, keyIndex) => {
      let keycode = "";
      
      // Attempt matrix mapping if label is "row,col"
      const labelParts = key.label.split(',');
      if (labelParts.length === 2 && !isNaN(labelParts[0]) && !isNaN(labelParts[1])) {
        const row = parseInt(labelParts[0], 10);
        const col = parseInt(labelParts[1], 10);
        
        const index = row * cols + col;
        if (index >= 0 && index < layerKeycodes.length) {
          keycode = layerKeycodes[index];
        }
      } else {
        // Fallback to sequential mapping
        if (keyIndex < layerKeycodes.length) {
          keycode = layerKeycodes[keyIndex];
        }
      }
      
      return {
        ...key,
        keycode: keycode
      };
    });
  });
}
