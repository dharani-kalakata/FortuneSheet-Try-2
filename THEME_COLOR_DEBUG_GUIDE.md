# FortuneSheet Theme Color Debug Guide

This document lists **every element** in FortuneSheet that has a hardcoded color in the library CSS (`@fortune-sheet/react/dist/index.css`), what the current `themeHelper.js` overrides (or doesn't), and how to inspect/fix each one.

It also includes a **Validation Testing Guide** at the end — how to trigger every validation error in the spreadsheet.

---

## Quick Start: How to Debug

### Step 1 — Open Webview DevTools
1. Open your JSON file in the FortuneSheet editor
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run: **Developer: Open Webview Developer Tools**
4. This opens Chrome DevTools for the webview

### Step 2 — Find the Offending Element
1. Click the **Select Element** tool (top-left of DevTools, or `Ctrl+Shift+C`)
2. Hover over the element that has the wrong color
3. In the **Elements** panel, note the CSS class name (e.g., `.fortune-container`)
4. In the **Styles** panel on the right, see which CSS rules are applied and where the color comes from

### Step 3 — Check if themeHelper.js Overrides It
- Search in `webview-src/utils/themeHelper.js` for that class name
- If it's not there, that's why the color is wrong — add an override

### Step 4 — Add the Override
In `themeHelper.js`, inside the `const css = \`...\`` template literal, add:
```css
.the-class-name {
  background: ${BG} !important;
  color: ${FG} !important;
}
```
Then rebuild: `npm run build:webview`

### Step 5 — Reload
Close and reopen the JSON file (or run **Developer: Reload Webview**)

---

## VS Code Theme Variables Used

These are defined at the top of `themeHelper.js`:

| Variable | VS Code Token | Purpose |
|----------|---------------|---------|
| `FG` | `--vscode-editor-foreground` | Default text color |
| `BG` | `--vscode-editor-background` | Default background |
| `INP_BG` | `--vscode-input-background` | Input field background |
| `INP_FG` | `--vscode-input-foreground` | Input field text |
| `DD_BG` | `--vscode-dropdown-background` | Dropdown/popup background |
| `DD_FG` | `--vscode-dropdown-foreground` | Dropdown/popup text |
| `BORDER` | `--vscode-editorWidget-border` | Border color |
| `HOVER` | `--vscode-list-hoverBackground` | Hover highlight |
| `FOCUS` | `--vscode-focusBorder` | Focus ring / selection border |
| `BTN_BG` | `--vscode-button-background` | Button background |
| `BTN_FG` | `--vscode-button-foreground` | Button text |
| `HDR_BG` | `--vscode-editorGroupHeader-tabsBackground` | Header/tab bar background |

**Tip:** In DevTools Console, run this to see all current theme colors:
```js
const styles = getComputedStyle(document.documentElement);
[
  '--vscode-editor-background',
  '--vscode-editor-foreground',
  '--vscode-input-background',
  '--vscode-input-foreground',
  '--vscode-dropdown-background',
  '--vscode-dropdown-foreground',
  '--vscode-editorWidget-border',
  '--vscode-list-hoverBackground',
  '--vscode-focusBorder',
  '--vscode-button-background',
  '--vscode-button-foreground',
  '--vscode-scrollbarSlider-background',
  '--vscode-scrollbarSlider-hoverBackground',
].forEach(v => console.log(v, '=', styles.getPropertyValue(v)));
```

---

## DOM Hierarchy

```
html, body, #root              ← background set in webview HTML
└─ .fortune-container          ← ⚠️ LIBRARY DEFAULT: background-color: white (NOT overridden!)
   ├─ .fortune-workarea
   │  ├─ .fortune-toolbar      ← ✅ Overridden
   │  └─ FxEditor (formula bar)
   │     ├─ .fortune-fx-editor ← ✅ Overridden
   │     ├─ .fortune-name-box  ← ✅ Overridden
   │     └─ .fortune-fx-input  ← ✅ Overridden
   ├─ .fortune-sheet-container ← ✅ Overridden
   │  ├─ canvas.fortune-sheet-canvas  ← Draws cells (canvas; CSS can't change drawn colors)
   │  ├─ .fortune-sheet-canvas-placeholder
   │  └─ .fortune-sheet-overlay (absolute positioned)
   │     ├─ .fortune-col-header-wrap
   │     │  ├─ .fortune-left-top    ← ⚠️ LIBRARY DEFAULT: background-color: white
   │     │  └─ .fortune-col-header  ← canvas-drawn text (#5e5e5e) — don't style bg
   │     ├─ .fortune-row-body
   │     │  ├─ .fortune-row-header  ← canvas-drawn text (#5e5e5e) — don't style bg
   │     │  ├─ .fortune-cell-area   ← ⚠️ No background set (transparent → parent bleed)
   │     │  ├─ ScrollBar X (.luckysheet-scrollbars.luckysheet-scrollbar-ltr.luckysheet-scrollbar-x)
   │     │  └─ ScrollBar Y (.luckysheet-scrollbars.luckysheet-scrollbar-ltr.luckysheet-scrollbar-y)
   │     └─ SearchReplace panel (if open)
   ├─ SheetTab (.luckysheet-sheet-area)  ← ✅ Overridden (hidden in current config)
   ├─ ContextMenu (.fortune-context-menu / .luckysheet-cols-menu)
   ├─ FilterMenu
   └─ Various modals/dialogs
```

---

## Complete Element Reference

### CURRENTLY NOT OVERRIDDEN (potential color issues)

These elements have hardcoded colors in the library CSS but **no override** in `themeHelper.js`:

| # | CSS Selector | Library Default | What It Is | Suggested Override |
|---|---|---|---|---|
| 1 | `.fortune-container` | `background-color: white` | **Root wrapper of entire sheet** | `background: ${BG}; color: ${FG}` |
| 2 | `.fortune-left-top` | `background-color: white` | Corner cell (top-left where row/col headers meet) | `background-color: ${HDR_BG}` |
| 3 | `.fortune-cell-area` | *(no background — transparent)* | Cell area container behind canvas | `background: ${BG}` |
| 4 | `.fortune-modal-container` | `background: rgba(255,255,255,0.5)` | Modal overlay backdrop | `background: rgba(0,0,0,0.4)` |
| 5 | `.fortune-add-row-button` | `color: rgb(38,42,51); background: rgb(255,255,255)` | "Add row" button at bottom | `background: ${BTN_BG}; color: ${BTN_FG}` |
| 6 | `.luckysheet-input-box-inner` | `background-color: rgb(255,255,255)` | Inner cell editing box | `background: ${INP_BG}; color: ${INP_FG}` |
| 7 | `.luckysheet-formula-text-color` | `color: black` | Formula text in cell editor | `color: ${FG}` |
| 8 | `.luckysheet-cell-sheettable` | `color: #000000` | Sheet table text color | `color: ${FG}` |
| 9 | `.fortune-cols-change-size` | `background: #0188fb` | Column resize handle | OK (accent color) |
| 10 | `.fortune-rows-change-size` | `background: #0188fb` | Row resize handle | OK (accent color) |
| 11 | `.fortune-cols-freeze-handle` | `background-color: #ddd` | Freeze column drag handle | `background-color: ${BORDER}` |
| 12 | `.fortune-rows-freeze-handle` | `background-color: #ddd` | Freeze row drag handle | `background-color: ${BORDER}` |
| 13 | `.luckysheet-modal-dialog-resize-item` | `background: #ffffff` | Dialog resize handle | `background: ${DD_BG}` |
| 14 | `.fortune-tooltip` | `background-color: #666; color: #fff` | Toolbar tooltip | Acceptable as-is, or `background: ${DD_BG}; color: ${DD_FG}` |
| 15 | `.fortune-toolbar-divider` | `background-color: #e0e0e0` | Toolbar divider line | `background-color: ${BORDER}` |
| 16 | `.fortune-toolbar-menu-divider` | `background-color: #e0e0e0` | Toolbar menu divider | `background-color: ${BORDER}` |
| 17 | `.fortune-toolbar-subtext` | `color: #000` | Toolbar sub-label text | `color: ${FG}` |
| 18 | `.fortune-toolbar-more-container` | `background: white` | ✅ Already overridden | — |
| 19 | `.fortune-toolbar-color-picker` | `background: white` | ✅ Already overridden | — |
| 20 | `.fortune-context-menu` | `background: #fff` | Right-click context menu | `background: ${DD_BG}; color: ${DD_FG}` |
| 21 | `.fortune-context-menu-divider` | `background-color: #e0e0e0` | Context menu divider | `background-color: ${BORDER}` |
| 22 | `.fortune-message-box-button.button-default` | `color: rgb(38,42,51); background: rgb(255,255,255)` | Dialog default button | `background: ${DD_BG}; color: ${DD_FG}` |
| 23 | `.fortune-message-box-button.button-primary` | `color: white; background: #0188fb` | Dialog primary button | `background: ${BTN_BG}; color: ${BTN_FG}` |
| 24 | `.fortune-modal-dialog-icon-close` | `color: #d4d4d4` | Dialog close X icon | `color: ${FG}` |
| 25 | `#fortune-search-replace .tabBox span.on` | `background: #8c89fe; color: #fff` | Search tab active | `background: ${BTN_BG}; color: ${BTN_FG}` |
| 26 | `#fortune-search-replace #searchAllbox .boxTitle` | `background-color: #fff` | Search results header | `background: ${DD_BG}` |
| 27 | `#fortune-search-replace #searchAllbox .boxMain .boxItem.on` | `background: #8c89fe; color: #fff` | Search result active item | `background: ${HOVER}; color: ${DD_FG}` |
| 28 | `.fortune-link-modify-title` | `color: #333333` | Link modal title | `color: ${DD_FG}` |
| 29 | `.fortune-link-modify-modal .modal-title` | `color: rgba(0,0,0,0.88)` | Modal title | `color: ${DD_FG}` |
| 30 | `.fortune-link-modify-modal .validation-input-tip` | `color: #ef4e2f` | Validation error text | OK (red warning color) |
| 31 | `.fortune-link-modify-modal .divider` | `background-color: #e0e0e0` | Link modal divider | `background-color: ${BORDER}` |
| 32 | `.fortune-link-modify-modal .button-default` | `color: rgb(38,42,51); background: rgb(255,255,255)` | Link modal button | `background: ${DD_BG}; color: ${DD_FG}` |
| 33 | `.fortune-link-modify-modal .button-primary` | `color: white; background: #0188fb` | Link modal primary button | `background: ${BTN_BG}; color: ${BTN_FG}` |
| 34 | `#fortune-data-verification .button-primary` | `background: #0188fb; color: #fff` | Data verification button | `background: ${BTN_BG}; color: ${BTN_FG}` |
| 35 | `#fortune-data-verification .button-close` | `color: #333; background: #fff` | Data verification close | `background: ${DD_BG}; color: ${DD_FG}` |
| 36 | `#range-dialog` | `background: #fff; color: #000` | Range selection dialog | `background: ${DD_BG}; color: ${DD_FG}` |
| 37 | `#range-dialog .dialog-title` | `background: #fff; color: #000` | Range dialog title | `background: ${DD_BG}; color: ${DD_FG}` |
| 38 | `#range-dialog .button-primary` | `background: #0188fb; color: #fff` | Range dialog button | `background: ${BTN_BG}; color: ${BTN_FG}` |
| 39 | `#range-dialog .button-close` | `color: #333; background: #fff` | Range dialog close | `background: ${DD_BG}; color: ${DD_FG}` |
| 40 | `#luckysheet-dataVerification-showHintBox` | `background-color: #ffffff` | Verification hint tooltip | `background: ${DD_BG}` |
| 41 | `#luckysheet-dataVerification-dropdown-btn` | `background-color: #ffffff` | Verification dropdown button | `background: ${DD_BG}` |
| 42 | `#luckysheet-dataVerification-dropdown-List` | `background-color: #fff` | Verification dropdown list | `background: ${DD_BG}; color: ${DD_FG}` |
| 43 | `.condition-format-sub-menu` | `background: #fff` | Conditional format sub-menu | `background: ${DD_BG}` |
| 44 | `.condition-format-item:hover` | `background: #efefef` | Conditional format hover | `background: ${HOVER}` |
| 45 | `.condition-format-item span` | `color: #afafaf` | Conditional format label | `color: ${FG}` |
| 46 | `.condition-rules .button-primary` | `background: #0188fb; color: #fff` | Condition rules button | `background: ${BTN_BG}; color: ${BTN_FG}` |
| 47 | `.condition-rules .button-close` | `color: #333; background: #fff` | Condition rules close | `background: ${DD_BG}; color: ${DD_FG}` |
| 48 | `.condition-rules-title` | `color: #000` | Condition rules title | `color: ${DD_FG}` |
| 49 | `.condition-rules-select-color` | `background: #f5f5f5` | Condition rules color selector | `background: ${DD_BG}` |
| 50 | `.fortune-filter-menu .button-default` | `color: rgb(38,42,51); background: rgb(255,255,255)` | Filter default button | `background: ${DD_BG}; color: ${DD_FG}` |
| 51 | `.fortune-filter-menu .button-primary` | `color: white; background: #0188fb` | Filter primary button | `background: ${BTN_BG}; color: ${BTN_FG}` |
| 52 | `.fortune-filter-menu .button-danger` | `color: white; background: #d9534f` | Filter danger button | OK (danger red) |
| 53 | `.filter-caret.right` | `border-left-color: #000000` | Filter caret arrow | `border-left-color: ${FG}` |
| 54 | `.filter-caret.down` | `border-top-color: #000000` | Filter caret arrow | `border-top-color: ${FG}` |
| 55 | `.luckysheet-filter-bycolor-submenu` | `background-color: #ffffff` | Filter by color menu | `background: ${DD_BG}` |
| 56 | `.luckysheet-filter-bycolor-submenu .title` | `color: #333; background: #f4f4f4` | Filter color title | `background: ${DD_BG}; color: ${DD_FG}` |
| 57 | `.luckysheet-filter-bycolor-submenu .item` | `background-color: #ffffff` | Filter color item | `background: ${DD_BG}` |
| 58 | `.fortune-sort-title` | `background-color: #fff; color: #000` | Sort dialog title | `background: ${DD_BG}; color: ${DD_FG}` |
| 59 | `#fortune-change-color` | `background: rgb(240,240,240)` | Color picker panel | `background: ${DD_BG}` |
| 60 | `#fortune-change-color .color-reset` | `color: #333; background: white` | Color reset button | `background: ${DD_BG}; color: ${DD_FG}` |
| 61 | `#fortune-change-color .custom-color` | `background: white` | Custom color area | `background: ${DD_BG}` |
| 62 | `.button-primary` (global) | `background: #0188fb; color: #fff` | Global primary button | `background: ${BTN_BG}; color: ${BTN_FG}` |
| 63 | `.fortune-sheet-list :hover` | `background-color: #efefef` | Sheet list hover | `background-color: ${HOVER}` |
| 64 | `.fortune-zoom-ratio` | `color: #1e1e1f` | Zoom ratio text | `color: ${FG}` |
| 65 | `.fortune-zoom-ratio-menu` | `background: white` | ✅ Already overridden | — |
| 66 | `.fortune-zoom-button:hover` | `background: #efefef` | Zoom button hover | `background: ${HOVER}` |
| 67 | `.luckysheet-sheet-area div.luckysheet-sheets-item` | `color: #676464` | Sheet tab text | `color: ${FG}` |
| 68 | `.luckysheet-sheet-area div.luckysheet-sheets-item:hover` | `background: #efefef; color: #490500` | Sheet tab hover | `background: ${HOVER}; color: ${FG}` |
| 69 | `.luckysheet-sheet-area div.luckysheet-sheets-item-active` | `background: #efefef; color: #222` | Active sheet tab | `background: ${DD_BG}; color: ${FG}` |
| 70 | `.fortune-sheettab-button:hover` | `background-color: #efefef` | Sheet tab button hover | `background: ${HOVER}` |
| 71 | `.fortune-sheettab-scroll:hover` | `background-color: #e0e0e0` | Sheet tab scroll hover | `background: ${HOVER}` |

### SCROLLBAR ELEMENTS (potential "black tint" issue)

| # | CSS Selector | Library Default | What It Is | Current Override | Issue |
|---|---|---|---|---|---|
| S1 | `.luckysheet-scrollbar-ltr` | `overflow: hidden; z-index: 1003` (no bg) | Base scrollbar container | ❌ Not overridden | Transparent → parent bg bleeds through |
| S2 | `.luckysheet-scrollbar-x` | `bottom: 0; overflow-x: scroll` (no bg) | Horizontal scrollbar | ❌ Not overridden | Transparent → parent bg bleeds |
| S3 | `.luckysheet-scrollbar-y` | `right: 0; overflow-y: scroll` (no bg) | Vertical scrollbar | ❌ Not overridden | Transparent → parent bg bleeds |
| S4 | `.luckysheet-scrollbar-ltr::-webkit-scrollbar` | `background-color: transparent` | Scrollbar track bg | ❌ Not overridden | Transparent area = dark strip |
| S5 | `.luckysheet-scrollbar-ltr::-webkit-scrollbar-track` | `background-color: transparent` | Scrollbar track | ❌ Not overridden | Same |
| S6 | `.luckysheet-scrollbar-ltr::-webkit-scrollbar-thumb` | `background-color: #babac0` | Scrollbar thumb | ❌ Not overridden | Light thumb on dark bg |

> **Note:** `themeHelper.js` currently overrides `.luckysheet-scrollbar` and `.luckysheet-scrollbars`, but the actual FortuneSheet scrollbar elements use classes `.luckysheet-scrollbar-ltr`, `.luckysheet-scrollbar-x`, `.luckysheet-scrollbar-y` — so the current overrides do NOT match the real elements.

### CANVAS-DRAWN ELEMENTS (cannot be fixed with CSS)

| Element | Hardcoded Color | Notes |
|---|---|---|
| Row header text (1, 2, 3...) | `fillStyle: #5e5e5e` | Drawn on canvas — CSS won't help |
| Column header text (A, B, C...) | `fillStyle: #5e5e5e` | Drawn on canvas — CSS won't help |
| Cell text | Drawn on canvas | Uses cell style data |
| Grid lines | Drawn on canvas | Hardcoded in source |
| Cell backgrounds | Drawn on canvas | Uses cell style data |

To fix canvas-drawn colors, you would need to fork `@fortune-sheet/core` and modify the rendering functions.

---

## ALREADY OVERRIDDEN (in themeHelper.js)

These are working correctly:

| Section | CSS Selector | Override |
|---|---|---|
| 1. Base | `.fortune-sheet-container` | bg + fg |
| 3. Toolbar | `.fortune-toolbar`, `.fortune-toolbar-button`, `.fortune-toolbar-combo`, etc. | bg + fg + hover |
| 3. Toolbar dropdowns | `.fortune-toolbar-select`, `.fortune-toolbar-combo-popup` | bg + fg + border |
| 3. Color picker | `.fortune-toolbar-color-picker`, `.fortune-change-color`, `.fortune-custom-color` | bg + border |
| 4. Formula bar | `.fortune-fx-editor`, `.fortune-fx-input`, `.fortune-name-box` | bg + fg + border |
| 5. Cell input | `.luckysheet-input-box`, `.luckysheet-cell-input` | bg + fg + caret |
| 6. Selection | `.luckysheet-cell-selected`, `-focus` | border color |
| 7. Scrollbars | `.luckysheet-scrollbar`, `.luckysheet-scrollbars` | bg (but wrong class — see note above) |
| 8. Context menu | `.luckysheet-cols-menu`, `.luckysheet-cols-menuitem` | bg + fg + hover |
| 9. Filter | `.luckysheet-filter-byvalue`, `.fortune-sort`, `.fortune-byvalue-btn` | bg + fg + buttons |
| 10. Dialogs | `.luckysheet-modal-dialog`, `.fortune-dialog` | bg + fg + inputs + buttons |
| 11. Search | `.fortune-search-replace` | bg + fg + inputs + buttons |
| 12. Sort modal | `.fortune-sort-modal` | bg + fg |
| 13. Zoom | `.fortune-zoom-ratio-menu`, `.fortune-zoom-container` | bg + fg |
| 14. Data panels | `.fortune-data-verification`, `.fortune-link-modify-modal`, etc. | bg + fg |
| 15. Sheet tabs | `.luckysheet-sheet-area`, `.fortune-sheettab-container`, `.fortune-stat-area` | bg + fg |
| 16. Border picker | `.fortune-boder-style-picker`, `.fortune-border-select-menu` | bg + fg |
| 17. Formula help | `[class*="luckysheet-formula-help"]`, `[class*="luckysheet-formula-search"]` | bg + fg |
| 18. Backdrop | `.fortune-popover-backdrop` | transparent |
| 19. Select fallback | `select`, `select option` | bg + fg |

---

## HIGH-PRIORITY FIXES (most visible issues)

If you're seeing color issues, these are the most impactful fixes to add to `themeHelper.js`:

### Fix 1 — Root container (eliminates white bleed in dark theme)
```css
.fortune-container {
  background: ${BG} !important;
  color: ${FG} !important;
}
```

### Fix 2 — Top-left corner cell
```css
.fortune-left-top {
  background-color: ${HDR_BG} !important;
}
```

### Fix 3 — Cell area behind canvas
```css
.fortune-cell-area {
  background: ${BG} !important;
}
```

### Fix 4 — Scrollbar containers (fix dark strip / black tint)
The current override targets `.luckysheet-scrollbar` but the actual classes are:
```css
.luckysheet-scrollbar-ltr,
.luckysheet-scrollbar-x,
.luckysheet-scrollbar-y {
  background: ${BG} !important;
}
.luckysheet-scrollbar-ltr::-webkit-scrollbar {
  background-color: ${BG} !important;
}
.luckysheet-scrollbar-ltr::-webkit-scrollbar-track {
  background-color: ${BG} !important;
}
.luckysheet-scrollbar-ltr::-webkit-scrollbar-thumb {
  background-color: var(--vscode-scrollbarSlider-background, rgba(128,128,128,0.4)) !important;
}
.luckysheet-scrollbar-ltr::-webkit-scrollbar-thumb:hover {
  background-color: var(--vscode-scrollbarSlider-hoverBackground, rgba(128,128,128,0.6)) !important;
}
```

### Fix 5 — Context menu (right-click)
```css
.fortune-context-menu {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border: 1px solid ${BORDER} !important;
}
.fortune-context-menu-divider {
  background-color: ${BORDER} !important;
}
```

### Fix 6 — Toolbar dividers
```css
.fortune-toolbar-divider {
  background-color: ${BORDER} !important;
}
.fortune-toolbar-subtext {
  color: ${FG} !important;
}
```

### Fix 7 — All buttons globally
```css
.button-primary {
  background: ${BTN_BG} !important;
  color: ${BTN_FG} !important;
}
.button-default,
.button-close {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border: 1px solid ${BORDER} !important;
}
```

### Fix 8 — Modal overlay backdrop
```css
.fortune-modal-container {
  background: rgba(0, 0, 0, 0.4) !important;
}
```

### Fix 9 — Cell editing inner box
```css
.luckysheet-input-box-inner {
  background-color: ${INP_BG} !important;
  color: ${INP_FG} !important;
}
```

### Fix 10 — Data verification dropdowns
```css
#luckysheet-dataVerification-showHintBox {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
#luckysheet-dataVerification-dropdown-btn {
  background-color: ${DD_BG} !important;
}
#luckysheet-dataVerification-dropdown-List {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
#luckysheet-dataVerification-dropdown-List .dropdown-List-item:hover {
  background-color: ${HOVER} !important;
}
```

### Fix 11 — Conditional format menus
```css
.condition-format-sub-menu {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
.condition-format-item:hover {
  background: ${HOVER} !important;
}
.condition-format-item span {
  color: ${FG} !important;
}
.condition-rules-title {
  color: ${DD_FG} !important;
}
.condition-rules-select-color {
  background: ${DD_BG} !important;
}
```

### Fix 12 — Filter by color submenu
```css
.luckysheet-filter-bycolor-submenu {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
.luckysheet-filter-bycolor-submenu .title {
  color: ${DD_FG} !important;
  background-color: ${DD_BG} !important;
}
.luckysheet-filter-bycolor-submenu .item {
  background-color: ${DD_BG} !important;
}
.luckysheet-filter-bycolor-submenu .item:hover {
  background-color: ${HOVER} !important;
}
```

### Fix 13 — Range dialog
```css
#range-dialog {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
#range-dialog .dialog-title {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
```

### Fix 14 — Color picker panel
```css
#fortune-change-color {
  background: ${DD_BG} !important;
}
#fortune-change-color .color-reset {
  color: ${DD_FG} !important;
  background: ${DD_BG} !important;
}
#fortune-change-color .custom-color {
  background: ${DD_BG} !important;
}
```

### Fix 15 — Zoom controls
```css
.fortune-zoom-ratio {
  color: ${FG} !important;
}
.fortune-zoom-button:hover {
  background: ${HOVER} !important;
}
```

---

## How to Test Each Theme

Switch between these built-in themes to check coverage:

| Theme | Type | Command Palette |
|---|---|---|
| Default Dark Modern | Dark | `Preferences: Color Theme` → "Default Dark Modern" |
| Default Light Modern | Light | Same → "Default Light Modern" |
| High Contrast | Dark HC | Same → "High Contrast" |
| High Contrast Light | Light HC | Same → "High Contrast Light" |

After switching, close and reopen the JSON file to reload the webview.

---

## Useful DevTools Commands

Paste these in the webview DevTools Console:

**List all elements with white/light background:**
```js
document.querySelectorAll('*').forEach(el => {
  const bg = getComputedStyle(el).backgroundColor;
  if (bg && (bg.includes('255, 255, 255') || bg === 'white' || bg === '#fff' || bg === '#ffffff')) {
    console.log(el.className || el.tagName, '→', bg);
  }
});
```

**List all elements with black/dark text that might be invisible:**
```js
document.querySelectorAll('*').forEach(el => {
  const c = getComputedStyle(el).color;
  if (c && (c === 'rgb(0, 0, 0)' || c.includes('0, 0, 0'))) {
    console.log(el.className || el.tagName, '→ color:', c);
  }
});
```

**Highlight all elements with hardcoded white backgrounds (visual debug):**
```js
document.querySelectorAll('*').forEach(el => {
  const bg = getComputedStyle(el).backgroundColor;
  if (bg === 'rgb(255, 255, 255)') {
    el.style.outline = '2px solid red';
  }
});
```

**Remove all red outlines after testing:**
```js
document.querySelectorAll('*').forEach(el => { el.style.outline = ''; });
```

---

## Validation Testing Guide

The validator (`src/jsonValidator.js`) checks rows when a JSON file contains the field `used_in_strategy`. Validation errors appear as a banner at the top of the spreadsheet.

### Which Files Support Validation?

Validation only runs on JSON files whose records contain **`used_in_strategy`**. The depth of validation depends on whether the file also has `part_of_call_interface`:

| File | Has `used_in_strategy`? | Has `part_of_call_interface`? | Validations available |
|---|---|---|---|
| `variable_config_extended.json` | Yes | No | Only checks 1–2 (basic) |
| `10000_records.json` | No | No | **No validation** — file has no `used_in_strategy` field |
| A file with full schema | Yes | Yes | All checks 1–8 |

### Column Layout for `variable_config_extended.json`

| Column | Field Name |
|--------|-----------|
| A | `_key` |
| B | `data_block_name` |
| C | `data_block_category` |
| D | `datatype` |
| E | `length` |
| F | `scale` |
| G | `array_size` |
| H | `mandatory_in_input` |
| I | `exclude_from_output` |
| J | `used_in_strategy` |
| K | `external_name` |
| L | `default_value` |

### Triggering Validation Errors on `variable_config_extended.json`

| # | What to change | Column | Change from → to | Error message |
|---|---|---|---|---|
| 1 | `used_in_strategy` must be Y or N | **Column J** | Change `true` → `maybe` or `abc` | *"used_in_strategy must be Y or N (or true/false). Got: maybe"* |
| 2 | `data_block_category` required when used_in_strategy=Y | **Column C** | Clear/empty the cell while Column J is `true` | *"data_block_category is required when used_in_strategy is Y"* |

**That's it for this file** — because it lacks `part_of_call_interface`, the validator's `hasFullSchema` check is `false`, so deeper validations (field_type, field_direction, mandatory_presence_in_input) are **skipped**.

**Quickest test:** Open `variable_config_extended.json`, go to **Column J** (`used_in_strategy`), change any `true` to `maybe`, and the validation error banner should appear at the top.

### Triggering ALL Validations (requires full-schema JSON)

To trigger checks 3–8, you need a JSON file whose records also contain: `part_of_call_interface`, `field_type`, `field_direction`, and `mandatory_presence_in_input`.

| # | Column to change | Change to | Preconditions | Error message |
|---|---|---|---|---|
| 3 | `part_of_call_interface` | `maybe` (not Y/N) | `used_in_strategy` = Y | *"part_of_call_interface must be Y or N when used_in_strategy is Y"* |
| 4 | `field_type` | `xyz` (invalid type) | `used_in_strategy` = Y, `part_of_call_interface` = Y | *"field_type must be one of: boolean, string, list_string, integer, list_integer, decimal, list_decimal, float, list_float"* |
| 5 | `field_direction` | `sideways` (not inout/input/output) | `used_in_strategy` = Y, `part_of_call_interface` = Y | *"field_direction must be inout, input, or output"* |
| 6 | `mandatory_presence_in_input` | `maybe` (not Y/N) | `used_in_strategy` = Y, `part_of_call_interface` = Y | *"mandatory_presence_in_input must be Y or N"* |
| 7 | `field_direction` = `output` AND `mandatory_presence_in_input` = `Y` | — | `used_in_strategy` = Y, `part_of_call_interface` = Y | *"mandatory_presence_in_input cannot be Y when field_direction is output/none"* |
| 8 | `part_of_call_interface` = `N` AND `mandatory_presence_in_input` = `Y` | — | `used_in_strategy` = Y | *"mandatory_presence_in_input cannot be Y when part_of_call_interface is N"* |

### Validation Logic Flow

```
For each row:
  1. Does row have used_in_strategy? → No → skip row
  2. Is used_in_strategy Y or N?    → No → ERROR #1
  3. Is used_in_strategy N?          → Yes → row passes (no more checks)
  4. (used_in_strategy = Y from here)
  5. Does schema have part_of_call_interface? → No → stop (basic schema only)
  6. Is field_name empty?            → Yes → ERROR (field_name required)
  7. Is data_block_category empty?   → Yes → ERROR #2
  8. Is part_of_call_interface Y/N?  → No → ERROR #3
  9. (If part_of_call_interface = Y):
     a. Is field_type valid?         → No → ERROR #4
     b. Is field_direction valid?    → No → ERROR #5
     c. Is mandatory_presence_in_input Y/N? → No → ERROR #6
     d. field_direction=output + mandatory=Y? → ERROR #7
  10. (If part_of_call_interface = N):
     a. mandatory_presence_in_input=Y? → ERROR #8
  11. Otherwise → row passes ✅
```

### Valid Values Reference

| Field | Valid Values |
|---|---|
| `used_in_strategy` | `Y`, `N`, `true`, `false` (case-insensitive) |
| `part_of_call_interface` | `Y`, `N`, `true`, `false` (case-insensitive) |
| `field_type` | `boolean`, `string`, `list_string`, `integer`, `list_integer`, `decimal`, `list_decimal`, `float`, `list_float` |
| `field_direction` | `inout`, `input`, `output` |
| `mandatory_presence_in_input` | `Y`, `N`, `true`, `false` (case-insensitive) |
