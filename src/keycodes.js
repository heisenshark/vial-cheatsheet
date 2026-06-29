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
  "KC_ESC": "Esc", "KC_ESCAPE": "Esc", "KC_GESC": "Esc",
  "KC_BSPC": "Backspace", "KC_BSPACE": "Backspace",
  "KC_TAB": "Tab",
  "KC_SPC": "Space", "KC_SPACE": "Space",

  // Punctuation / Math
  "KC_MINS": "-", "KC_MINUS": "-",
  "KC_EQL": "=", "KC_EQUAL": "=",
  "KC_LBRC": "[", "KC_LBRACKET": "[",
  "KC_RBRC": "]", "KC_RBRACKET": "]",
  "KC_BSLS": "\\", "KC_BSLASH": "\\",
  "KC_SCLN": ";", "KC_SEMICOLON": ";", "KC_SCOLON": ";",
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

  // Modifiers (full names + deprecated aliases)
  "KC_LCTL": "Ctrl",  "KC_LCTRL": "Ctrl",  "KC_LCONTROL": "Ctrl",
  "KC_RCTL": "Ctrl",  "KC_RCTRL": "Ctrl",  "KC_RCONTROL": "Ctrl",
  "KC_LSFT": "Shift", "KC_LSHIFT": "Shift",
  "KC_RSFT": "Shift", "KC_RSHIFT": "Shift",
  "KC_LALT": "Alt",   "KC_RALT": "Alt",
  "KC_LGUI": "GUI",   "KC_RGUI": "GUI",
  "KC_CAPS": "Caps",  "KC_CAPSLOCK": "Caps",

  // Navigation / System
  "KC_UP": "↑", "KC_DOWN": "↓", "KC_LEFT": "←", "KC_RGHT": "→", "KC_RIGHT": "→",
  "KC_HOME": "Home", "KC_END": "End", "KC_PGUP": "PgUp", "KC_PGDN": "PgDn",
  "KC_INS": "Ins",  "KC_INSERT": "Ins",
  "KC_DEL": "Del",  "KC_DELETE": "Del",
  "KC_PSCR": "PrtSc", "KC_PSCREEN": "PrtSc",
  "KC_SLCK": "ScrLk", "KC_PAUS": "Pause",

  // Audio / Media
  "KC_MUTE": "Mute",
  "KC_VOLU": "Vol+",  "KC_VOLD": "Vol-",
  "KC_MNXT": "Next",  "KC_MPRV": "Prev",
  "KC_MPLY": "Play",  "KC_MSTP": "Stop",

  // Edit / Clipboard
  "KC_UNDO": "Undo", "KC_AGIN": "Redo",
  "KC_CUT":  "Cut",  "KC_COPY": "Copy", "KC_PSTE": "Paste", "KC_PASTE": "Paste",

  // Mouse buttons
  "KC_BTN1": "LClick", "KC_MS_BTN1": "LClick",
  "KC_BTN2": "RClick", "KC_MS_BTN2": "RClick",
  "KC_BTN3": "MClick", "KC_MS_BTN3": "MClick",
  "KC_BTN4": "Btn4",   "KC_BTN5": "Btn5",

  // Mouse movement
  "KC_MS_U": "Cur↑", "KC_MS_UP":    "Cur↑",
  "KC_MS_D": "Cur↓", "KC_MS_DOWN":  "Cur↓",
  "KC_MS_L": "Cur←", "KC_MS_LEFT":  "Cur←",
  "KC_MS_R": "Cur→", "KC_MS_RIGHT": "Cur→",

  // Mouse wheel
  "KC_WH_U": "Whl↑", "KC_WH_UP":    "Whl↑",
  "KC_WH_D": "Whl↓", "KC_WH_DOWN":  "Whl↓",
  "KC_WH_L": "Whl←", "KC_WH_LEFT":  "Whl←",
  "KC_WH_R": "Whl→", "KC_WH_RIGHT": "Whl→",

  // Keypad
  "KC_KP_0": "Kp0", "KC_KP_1": "Kp1", "KC_KP_2": "Kp2", "KC_KP_3": "Kp3",
  "KC_KP_4": "Kp4", "KC_KP_5": "Kp5", "KC_KP_6": "Kp6", "KC_KP_7": "Kp7",
  "KC_KP_8": "Kp8", "KC_KP_9": "Kp9",
  "KC_KP_DOT": "Kp.", "KC_KP_COMMA": "Kp,",
  "KC_KP_ENTER": "KpEnt", "KC_KP_PLUS": "Kp+",
  "KC_KP_MINUS": "Kp-",   "KC_KP_ASTERISK": "Kp*", "KC_KP_SLASH": "Kp/"
};

// Map of shifted characters for LSFT(...) wrapper keys
const SHIFT_MAP = {
  "KC_1": "!", "KC_2": "@", "KC_3": "#", "KC_4": "$", "KC_5": "%",
  "KC_6": "^", "KC_7": "&", "KC_8": "*", "KC_9": "(", "KC_0": ")",
  "KC_MINUS": "_", "KC_MINS": "_", "KC_EQUAL": "+", "KC_EQL": "+",
  "KC_LBRACKET": "{", "KC_LBRC": "{", "KC_RBRACKET": "}", "KC_RBRC": "}",
  "KC_SEMICOLON": ":", "KC_SCLN": ":", "KC_QUOTE": "\"", "KC_QUOT": "\"",
  "KC_GRAVE": "~", "KC_GRV": "~", "KC_SLASH": "?", "KC_SLSH": "?",
  "KC_COMMA": "<", "KC_COMM": "<", "KC_PERIOD": ">", "KC_DOT": ">",
  "KC_BSLASH": "|", "KC_BSLS": "|"
};

// Returns a beautiful label and key type category for styling
export function translateKeycode(code) {
  if (!code) return { label: "", type: "empty" };
  if (code === -1) return { label: "", type: "empty" };
  
  const cleanCode = code.toString().trim();
  
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

  // 1. Shifted keys wrapper: LSFT(KC_1) -> !
  const shiftRegex = /^LSFT\(([^)]+)\)$/;
  const shiftMatch = cleanCode.match(shiftRegex);
  if (shiftMatch) {
    const subCode = shiftMatch[1];
    if (SHIFT_MAP[subCode] !== undefined) {
      return { label: SHIFT_MAP[subCode], type: "alpha" };
    }
    return { label: `S(${translateKeycode(subCode).label})`, type: "alpha" };
  }
  
  // 2. Layer Actions e.g., MO(1), TO(2), TG(3), TT(1), DF(2), OSL(1)
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
  
  // 3. Layer Tap e.g., LT(1, KC_SPC) or LT(2,KC_A)
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

  // 4. Vial style Layer Tap e.g. LT1(KC_ESCAPE) or LT3(KC_DELETE)
  const vialLayerTapRegex = /^LT(\d+)\(([^)]+)\)$/;
  const vialLayerTapMatch = cleanCode.match(vialLayerTapRegex);
  if (vialLayerTapMatch) {
    const layerNum = vialLayerTapMatch[1];
    const baseCode = vialLayerTapMatch[2];
    const baseTranslated = translateKeycode(baseCode).label;
    return {
      label: `${baseTranslated}\n(L${layerNum})`,
      type: "layertap"
    };
  }
  
  // 5. Modifier Tap e.g., LCTL_T(KC_ESC), LSFT_T(KC_SPC)
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
  
  // 6. Generic Modifier Key Tap e.g., MT(MOD_LCTL, KC_ESC)
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
