# Vial Cheatsheet Maker

A beautiful and modern vector-based cheatsheet maker for custom QMK, VIA, and Vial mechanical keyboards. Generate printable cheatsheets, tweak layout dimensions, customize themes, and interactively manage layer-to-layer connection paths with ease.
This project is basically fully done by AI with human assistance, credits go to Gemini and Claude mostly.
## Showcase

https://github.com/user-attachments/assets/75fe3ebd-062d-43d6-8bf2-1b52aba5f60c

## Features

- **Arbitrary Layout Uploads**: Upload any custom `.vil` keymap file or physical layout definition `.json` file (`vial.json`) to parse and display layouts dynamically.
- **Interactive Spline Path Management**: Click on connection curves to dynamically add control points, drag points to reshape paths, and Ctrl+Click (or Cmd+Click) any point handle to delete it.
- **Auto Grid Layout Generator**: Effortlessly organize multiple layers into rows and columns, complete with mouse-wheel scroll adjustment handlers.
- **Print Optimization**: Automatically maps styles, hides interface controls, and optimizes layouts for high-resolution vector PDF printing.
- **Local History State Stack**: Seamlessly undo (`Ctrl + Z`) and redo (`Ctrl + Shift + Z`) your actions.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Styling**: Vanilla CSS
- **Bundler**: Vite 8
