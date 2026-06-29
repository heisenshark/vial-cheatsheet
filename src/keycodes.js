const KEY_MAP = {
  "KC_NO": "",
  "KC_TRNS": "▽",
  
  // Alphas
  "KC_A": "A", "KC_B": "B", "KC_C": "C", "KC_D": "D", "KC_E": "E", "KC_F": "F", "KC_G": "G",
  "KC_H": "H", "KC_I": "I", "KC_J": "J", "KC_K": "K", "KC_L": "L", "KC_M": "M", "KC_N": "N",
  "KC_O": "O", "KC_P": "P", "KC_Q": "Q", "KC_R": "R", "KC_S": "S", "KC_T": "T", "KC_U": "U",
  "KC_V": "V", "KC_W": "W", "KC_X": "X", "KC_Y": "Y", "KC_Z": "Z",
  
  // Numbers
  "KC_1": "1", "KC_2": "2", "KC_3": "3", "KC_4": "4", "KC_5": "5", "KC_6": "6", "KC_7": "7",
  "KC_8": "8", "KC_9": "9", "KC_0": "0",
  
  // Function keys
  "KC_F1": "F1", "KC_F2": "F2", "KC_F3": "F3", "KC_F4": "F4", "KC_F5": "F5", "KC_F6": "F6",
  "KC_F7": "F7", "KC_F8": "F8", "KC_F9": "F9", "KC_F10": "F10", "KC_F11": "F11", "KC_F12": "F12",
  
  // Special keys
  "KC_ENT": "Enter", "KC_ENTER": "Enter",
  "KC_ESC": "Esc", "KC_GESC": "Esc",
  "KC_BSPC": "Backspace", "KC_BSPACE": "Backspace",
  "KC_TAB": "Tab",
  "KC_SPC": "Space", "KC_SPACE": "Space",
  
  // Punctuation / Math
  "KC_MINS": "-", "KC_MINUS": "-",
  "KC_EQL": "=", "KC_EQUAL": "=",
  "KC_LBRC": "[", "KC_LBRACKET": "[",
  "KC_RBRC": "]", "KC_RBRACKET": "]",
  "KC_BSLS": "\\", "KC_BSLASH": "\\",
  "KC_SCLN": ";", "KC_SEMICOLON": ";",
  "KC_QUOT": "'", "KC_QUOTE": "'",
  "KC_GRV": "`", "KC_GRAVE": "`",
  "KC_COMM": ",", "KC_COMMA": ",",
  "KC_DOT": ".", "KC_PERIOD": ".",
  "KC_SLSH": "/", "KC_SLASH": "/",
  "KC_UNDS": "_", "KC_UNDER": "_",
  "KC_PLUS": "+",
  "KC_LCBR": "{", "KC_RCBR": "}", "KC_PIPE": "|",
  "KC_COLN": ":", "KC_TILD": "~",
  "KC_EXLM": "!", "KC_AT": "@", "KC_HASH": "#", "KC_DLR": "$", "KC_PERC": "%",
  "KC_CIRC": "^", "KC_AMPR": "&", "KC_ASTR": "*", "KC_LPRN": "(", "KC_RPRN": ")",
  
  // Modifiers
  "KC_LCTL": "Ctrl", "KC_LSFT": "Shift", "KC_LALT": "Alt", "KC_LGUI": "GUI",
  "KC_RCTL": "Ctrl", "KC_RSFT": "Shift", "KC_RALT": "Alt", "KC_RGUI": "GUI",
  "KC_CAPS": "Caps", "KC_CAPSLOCK": "Caps",
  
  // Navigation / System
  "KC_UP": "↑", "KC_DOWN": "↓", "KC_LEFT": "←", "KC_RGHT": "→",
  "KC_RIGHT": "→",
  "KC_HOME": "Home", "KC_END": "End", "KC_PGUP": "PgUp", "KC_PGDN": "PgDn",
  "KC_INS": "Insert", "KC_DEL": "Delete", "KC_DELETE": "Del",
  "KC_PSCR": "PrtSc", "KC_SLCK": "Scroll", "KC_PAUS": "Pause",
  
  // Audio / Media
  "KC_MUTE": "Mute", "KC_VOLU": "Vol+", "KC_VOLD": "Vol-",
  "KC_MNXT": "Next", "KC_MPRV": "Prev", "KC_MPLY": "Play/Pause", "KC_MSTP": "Stop"
};

// Returns a beautiful label and key type category for styling
export function translateKeycode(code) {
  if (!code) return { label: "", type: "empty" };
  
  const cleanCode = code.trim();
  
  // Check if code is in the direct translation map
  if (KEY_MAP[cleanCode] !== undefined) {
    const label = KEY_MAP[cleanCode];
    let type = "alpha";
    if (["Ctrl", "Shift", "Alt", "GUI", "Caps"].includes(label)) {
      type = "modifier";
    } else if (["Enter", "Backspace", "Tab", "Space", "Esc"].includes(label)) {
      type = "special";
    } else if (label === "") {
      type = "empty";
    } else if (label === "▽") {
      type = "trans";
    }
    return { label, type };
  }
  
  // 1. Layer Actions e.g., MO(1), TO(2), TG(3), TT(1), DF(2), OSL(1)
  const layerRegex = /^(MO|TO|TG|TT|DF|OSL)\((\d+)\)$/;
  const layerMatch = cleanCode.match(layerRegex);
  if (layerMatch) {
    const action = layerMatch[1];
    const layerNum = layerMatch[2];
    return {
      label: `${action}(${layerNum})`,
      type: "layer"
    };
  }
  
  // 2. Layer Tap e.g., LT(1, KC_SPC) or LT(2,KC_A)
  const layerTapRegex = /^LT\((\d+)\s*,\s*([^)]+)\)$/;
  const layerTapMatch = cleanCode.match(layerTapRegex);
  if (layerTapMatch) {
    const layerNum = layerTapMatch[1];
    const baseCode = layerTapMatch[2];
    const baseTranslated = translateKeycode(baseCode).label;
    return {
      label: `${baseTranslated}\n(L${layerNum})`,
      type: "layertap"
    };
  }
  
  // 3. Modifier Tap e.g., LCTL_T(KC_ESC), LSFT_T(KC_SPC)
  const modTapRegex = /^([A-Z_]+)_T\(([^)]+)\)$/;
  const modTapMatch = cleanCode.match(modTapRegex);
  if (modTapMatch) {
    const mod = modTapMatch[1].replace("MOD_", "");
    const baseCode = modTapMatch[2];
    const baseTranslated = translateKeycode(baseCode).label;
    let shortMod = mod;
    if (mod === "LCTL" || mod === "RCTL") shortMod = "Ctrl";
    if (mod === "LSFT" || mod === "RSFT") shortMod = "Shift";
    if (mod === "LALT" || mod === "RALT") shortMod = "Alt";
    if (mod === "LGUI" || mod === "RGUI") shortMod = "GUI";
    return {
      label: `${baseTranslated}\n(${shortMod})`,
      type: "modtap"
    };
  }
  
  // 4. Generic Modifier Key Tap e.g., MT(MOD_LCTL, KC_ESC)
  const mtRegex = /^MT\(([^,]+)\s*,\s*([^)]+)\)$/;
  const mtMatch = cleanCode.match(mtRegex);
  if (mtMatch) {
    const mod = mtMatch[1].replace("MOD_", "");
    const baseCode = mtMatch[2];
    const baseTranslated = translateKeycode(baseCode).label;
    let shortMod = mod;
    if (mod.includes("CTL")) shortMod = "Ctrl";
    if (mod.includes("SFT")) shortMod = "Shift";
    if (mod.includes("ALT")) shortMod = "Alt";
    if (mod.includes("GUI")) shortMod = "GUI";
    return {
      label: `${baseTranslated}\n(${shortMod})`,
      type: "modtap"
    };
  }
  
  // Fallback: strip KC_ prefix if present
  if (cleanCode.startsWith("KC_")) {
    return {
      label: cleanCode.substring(3),
      type: "alpha"
    };
  }
  
  // Return raw code
  return {
    label: cleanCode,
    type: "alpha"
  };
}
