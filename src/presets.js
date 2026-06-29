// Keyboard presets with layout dimensions, KLE keymaps, and default layers mapped to matrix coordinates
export const PRESETS = {
  split58: {
    name: "Split 58 (Lily58/Sofle/Iris)",
    matrix: { rows: 10, cols: 6 },
    keymap: [
      // Row 0
      [
        { x: 0 }, "0,0", "0,1", "0,2", "0,3", "0,4", "0,5",
        { x: 1.5 }, "5,5", "5,4", "5,3", "5,2", "5,1", "5,0"
      ],
      // Row 1
      [
        { x: 0 }, "1,0", "1,1", "1,2", "1,3", "1,4", "1,5",
        { x: 1.5 }, "6,5", "6,4", "6,3", "6,2", "6,1", "6,0"
      ],
      // Row 2
      [
        { x: 0 }, "2,0", "2,1", "2,2", "2,3", "2,4", "2,5",
        { x: 1.5 }, "7,5", "7,4", "7,3", "7,2", "7,1", "7,0"
      ],
      // Row 3
      [
        { x: 0 }, "3,0", "3,1", "3,2", "3,3", "3,4", "3,5",
        { x: 1.5 }, "8,5", "8,4", "8,3", "8,2", "8,1", "8,0"
      ],
      // Row 4 (Thumbs)
      [
        { x: 1.5, y: 0.15 }, "4,3", "4,4", "4,5",
        { x: 4.5 }, "9,5", "9,4", "9,3"
      ]
    ],
    defaultLayers: []
  },
  corne: {
    name: "Corne (40% Split)",
    matrix: { rows: 4, cols: 12 },
    keymap: [
      // Row 0
      [
        { x: 0 }, "0,0", "0,1", "0,2", "0,3", "0,4", "0,5",
        { x: 1.5 }, "0,6", "0,7", "0,8", "0,9", "0,10", "0,11"
      ],
      // Row 1
      [
        { x: 0 }, "1,0", "1,1", "1,2", "1,3", "1,4", "1,5",
        { x: 1.5 }, "1,6", "1,7", "1,8", "1,9", "1,10", "1,11"
      ],
      // Row 2
      [
        { x: 0 }, "2,0", "2,1", "2,2", "2,3", "2,4", "2,5",
        { x: 1.5 }, "2,6", "2,7", "2,8", "2,9", "2,10", "2,11"
      ],
      // Row 3 (Thumbs)
      [
        { x: 2, y: 0.1 }, "3,3", "3,4", "3,5",
        { x: 1.5 }, "3,6", "3,7", "3,8"
      ]
    ],
    defaultLayers: [
      "KC_TAB", "KC_Q", "KC_W", "KC_E", "KC_R", "KC_T",  "KC_Y", "KC_U", "KC_I", "KC_O", "KC_P", "KC_BSPC",
      "KC_LCTL", "KC_A", "KC_S", "KC_D", "KC_F", "KC_G",  "KC_H", "KC_J", "KC_K", "KC_L", "KC_SCLN", "KC_QUOT",
      "KC_LSFT", "KC_Z", "KC_X", "KC_C", "KC_V", "KC_B",  "KC_N", "KC_M", "KC_COMM", "KC_DOT", "KC_SLSH", "KC_ENT",
      "KC_NO", "KC_NO", "KC_NO", "KC_LGUI", "MO(1)", "KC_SPC",  "KC_ENT", "MO(2)", "KC_RALT", "KC_NO", "KC_NO", "KC_NO"
    ]
  },
  ansi60: {
    name: "60% ANSI (Standard)",
    matrix: { rows: 5, cols: 14 },
    keymap: [
      [
        "0,0", "0,1", "0,2", "0,3", "0,4", "0,5", "0,6", "0,7", "0,8", "0,9", "0,10", "0,11", "0,12", { w: 2 }, "0,13"
      ],
      [
        { w: 1.5 }, "1,0", "1,1", "1,2", "1,3", "1,4", "1,5", "1,6", "1,7", "1,8", "1,9", "1,10", "1,11", "1,12", { w: 1.5 }, "1,13"
      ],
      [
        { w: 1.75 }, "2,0", "2,1", "2,2", "2,3", "2,4", "2,5", "2,6", "2,7", "2,8", "2,9", "2,10", "2,11", { w: 2.25 }, "2,12"
      ],
      [
        { w: 2.25 }, "3,0", "3,1", "3,2", "3,3", "3,4", "3,5", "3,6", "3,7", "3,8", "3,9", "3,10", { w: 2.75 }, "3,11"
      ],
      [
        { w: 1.25 }, "4,0", { w: 1.25 }, "4,1", { w: 1.25 }, "4,2", { w: 6.25 }, "4,3", { w: 1.25 }, "4,4", { w: 1.25 }, "4,5", { w: 1.25 }, "4,6", { w: 1.25 }, "4,7"
      ]
    ],
    defaultLayers: [
      "KC_GESC", "KC_1", "KC_2", "KC_3", "KC_4", "KC_5", "KC_6", "KC_7", "KC_8", "KC_9", "KC_0", "KC_MINS", "KC_EQL", "KC_BSPC",
      "KC_TAB", "KC_Q", "KC_W", "KC_E", "KC_R", "KC_T", "KC_Y", "KC_U", "KC_I", "KC_O", "KC_P", "KC_LBRC", "KC_RBRC", "KC_BSLS",
      "KC_CAPS", "KC_A", "KC_S", "KC_D", "KC_F", "KC_G", "KC_H", "KC_J", "KC_K", "KC_L", "KC_SCLN", "KC_QUOT", "KC_ENT", "KC_NO",
      "KC_LSFT", "KC_Z", "KC_X", "KC_C", "KC_V", "KC_B", "KC_N", "KC_M", "KC_COMM", "KC_DOT", "KC_SLSH", "KC_RSFT", "KC_NO", "KC_NO",
      "KC_LCTL", "KC_LGUI", "KC_LALT", "KC_SPC", "KC_RALT", "KC_RGUI", "MO(1)", "KC_RCTL", "KC_NO", "KC_NO", "KC_NO", "KC_NO", "KC_NO", "KC_NO"
    ]
  }
};
