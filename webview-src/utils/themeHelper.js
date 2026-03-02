/**
 * Injects CSS overrides so FortuneSheet respects VS Code's active theme.
 *
 * FortuneSheet (v1.0.4) is a fork of LuckySheet. It uses a MIX of class names:
 *   - "fortune-*" — new classes introduced by FortuneSheet
 *   - "luckysheet-*" — legacy classes kept from LuckySheet
 *
 * IMPORTANT: Row/column headers render text on <canvas> with hardcoded
 * fillStyle (#5e5e5e). CSS cannot change canvas text color, so we must
 * NOT set a dark background on header containers.
 *
 * HOW TO TEST: Open DevTools in the webview (Ctrl+Shift+I or via VS Code
 * command palette "Developer: Open Webview Developer Tools"), inspect any
 * element, and confirm the class names match what's written here.
 */

const FG     = 'var(--vscode-editor-foreground)';
const BG     = 'var(--vscode-editor-background)';
const INP_BG = 'var(--vscode-input-background, var(--vscode-editor-background))';
const INP_FG = 'var(--vscode-input-foreground, var(--vscode-editor-foreground))';
const DD_BG  = 'var(--vscode-dropdown-background, var(--vscode-editor-background))';
const DD_FG  = 'var(--vscode-dropdown-foreground, var(--vscode-editor-foreground))';
const BORDER = 'var(--vscode-editorWidget-border, #555)';
const HOVER  = 'var(--vscode-list-hoverBackground, rgba(128,128,128,0.25))';
const FOCUS  = 'var(--vscode-focusBorder, #007fd4)';
const BTN_BG = 'var(--vscode-button-background, #0e639c)';
const BTN_FG = 'var(--vscode-button-foreground, #fff)';
const HDR_BG = 'var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-sideBar-background, var(--vscode-editor-background)))';

const css = `
/* ══════════════════════════════════════════════════════════════
   1. BASE CONTAINER
   ══════════════════════════════════════════════════════════════ */
.fortune-sheet-container {
  background: ${BG} !important;
  color: ${FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   2. ROW & COLUMN HEADERS — DO NOT STYLE
   Header text (1,2,3… and A,B,C…) is drawn on <canvas> with
   hardcoded dark fillStyle (#5e5e5e). Setting a dark background
   would make the text invisible. Leave defaults intact.
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   3. TOOLBAR
   Verified: fortune-toolbar, fortune-toolbar-button,
             fortune-toolbar-combo, fortune-toolbar-combo-text,
             fortune-toolbar-more-container
   ══════════════════════════════════════════════════════════════ */
.fortune-toolbar {
  background: ${HDR_BG} !important;
  color: ${FG} !important;
  border-color: ${BORDER} !important;
}
.fortune-toolbar-button,
.fortune-toolbar-combo {
  color: ${FG} !important;
}
.fortune-toolbar-button:hover,
.fortune-toolbar-combo:hover {
  background-color: ${HOVER} !important;
}
.fortune-toolbar-combo-text {
  color: ${FG} !important;
}
.fortune-toolbar-more-container {
  background: ${HDR_BG} !important;
  color: ${FG} !important;
}
.fortune-toolbar svg,
.fortune-toolbar path {
  fill: ${FG} !important;
}

/* ── Toolbar dropdown popups (font-size list, format list, etc.) ──
   Verified: fortune-toolbar-select, fortune-toolbar-select-option,
             fortune-toolbar-combo-popup                             */
.fortune-toolbar-select,
.fortune-toolbar-combo-popup {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border: 1px solid ${BORDER} !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35) !important;
}
.fortune-toolbar-select *,
.fortune-toolbar-combo-popup * {
  color: ${DD_FG} !important;
}
.fortune-toolbar-select-option:hover {
  background: ${HOVER} !important;
}

/* ── Toolbar color picker ──
   Verified: fortune-toolbar-color-picker */
.fortune-toolbar-color-picker {
  background: ${DD_BG} !important;
  border: 1px solid ${BORDER} !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35) !important;
}
.fortune-toolbar-color-picker * {
  color: ${DD_FG} !important;
}
.fortune-change-color,
.fortune-custom-color {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   4. FORMULA BAR & NAME BOX
   Verified: fortune-fx-editor, fortune-fx-input,
             fortune-name-box, #luckysheet-functionbox-cell,
             #luckysheet-rich-text-editor
   ══════════════════════════════════════════════════════════════ */
.fortune-fx-editor {
  background: ${BG} !important;
  border-color: ${BORDER} !important;
}
.fortune-fx-input,
.fortune-fx-input-container,
#luckysheet-functionbox-cell,
#luckysheet-rich-text-editor {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
}
.fortune-fx-icon {
  color: ${FG} !important;
}
.fortune-fx-icon svg,
.fortune-fx-icon path {
  fill: ${FG} !important;
}
.fortune-name-box,
.fortune-name-box-container {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  border-color: ${BORDER} !important;
}

/* ══════════════════════════════════════════════════════════════
   5. CELL EDITING INPUT
   Verified: luckysheet-input-box, luckysheet-cell-input
   ══════════════════════════════════════════════════════════════ */
.luckysheet-input-box,
.luckysheet-input-box textarea,
.luckysheet-cell-input,
#luckysheet-rich-text-editor {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  caret-color: var(--vscode-editorCursor-foreground, ${FG}) !important;
}

/* ══════════════════════════════════════════════════════════════
   6. SELECTION BORDER
   Verified: luckysheet-cell-selected
   ══════════════════════════════════════════════════════════════ */
.luckysheet-cell-selected,
.luckysheet-cell-selected-focus {
  border-color: ${FOCUS} !important;
}

/* ══════════════════════════════════════════════════════════════
   7. SCROLLBARS
   Verified: luckysheet-scrollbar, luckysheet-scrollbars
   ══════════════════════════════════════════════════════════════ */
.luckysheet-scrollbar,
.luckysheet-scrollbars {
  background: transparent !important;
}
.luckysheet-scrollbar div,
.luckysheet-scrollbars div {
  background: var(--vscode-scrollbarSlider-background, rgba(128,128,128,0.4)) !important;
}
.luckysheet-scrollbar div:hover,
.luckysheet-scrollbars div:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground, rgba(128,128,128,0.6)) !important;
}

/* ══════════════════════════════════════════════════════════════
   8. CONTEXT MENU & COLUMN MENU
   Verified: luckysheet-cols-menu, luckysheet-cols-menuitem
   ══════════════════════════════════════════════════════════════ */
.luckysheet-cols-menu {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border: 1px solid ${BORDER} !important;
}
.luckysheet-cols-menuitem {
  color: ${DD_FG} !important;
}
.luckysheet-cols-menuitem:hover {
  background-color: ${HOVER} !important;
}
.luckysheet-cols-menuitem * {
  color: ${DD_FG} !important;
}
.luckysheet-cols-menuitem svg {
  fill: ${DD_FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   9. FILTER PANEL
   Verified: luckysheet-filter-byvalue, fortune-sort
   ══════════════════════════════════════════════════════════════ */
.luckysheet-filter-byvalue,
.luckysheet-filter-byvalue-select {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
.luckysheet-filter-byvalue *,
.luckysheet-filter-byvalue-select * {
  color: ${DD_FG} !important;
}
.luckysheet-filter-byvalue input,
.luckysheet-filter-byvalue-select input {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  border: 1px solid ${BORDER} !important;
}
.fortune-byvalue-btn {
  background: ${BTN_BG} !important;
  color: ${BTN_FG} !important;
  border: none !important;
}
.fortune-sort {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
.fortune-sort * {
  color: ${DD_FG} !important;
}
.fortune-sort-button {
  background: ${BTN_BG} !important;
  color: ${BTN_FG} !important;
}
[class*="luckysheet-filter-options"] {
  color: ${FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   10. MODAL DIALOGS
   Verified: luckysheet-modal-dialog, fortune-dialog
   ══════════════════════════════════════════════════════════════ */
.luckysheet-modal-dialog,
.luckysheet-modal-dialog-content,
.fortune-dialog,
.fortune-dialog-box-content {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border: 1px solid ${BORDER} !important;
}
.fortune-dialog *,
.luckysheet-modal-dialog * {
  color: ${DD_FG} !important;
}
.fortune-dialog input,
.fortune-dialog textarea,
.fortune-dialog select,
.luckysheet-modal-dialog input,
.luckysheet-modal-dialog textarea,
.luckysheet-modal-dialog select {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  border: 1px solid ${BORDER} !important;
}
.fortune-dialog button,
.fortune-dialog-box-button-container button,
.luckysheet-modal-dialog button {
  background: ${BTN_BG} !important;
  color: ${BTN_FG} !important;
  border: none !important;
}
.fortune-dialog svg,
.fortune-dialog path,
.luckysheet-modal-dialog svg,
.luckysheet-modal-dialog path {
  fill: ${DD_FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   11. SEARCH / REPLACE DIALOG
   Verified: fortune-search-replace
   ══════════════════════════════════════════════════════════════ */
.fortune-search-replace {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border: 1px solid ${BORDER} !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
}
.fortune-search-replace * {
  color: ${DD_FG} !important;
}
.fortune-search-replace input {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  border: 1px solid ${BORDER} !important;
}
.fortune-search-replace input:focus {
  border-color: ${FOCUS} !important;
}
.fortune-search-replace button {
  background: ${BTN_BG} !important;
  color: ${BTN_FG} !important;
  border: none !important;
}

/* ══════════════════════════════════════════════════════════════
   12. SORT MODAL
   Verified: fortune-sort-modal
   ══════════════════════════════════════════════════════════════ */
.fortune-sort-modal {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
.fortune-sort-modal * {
  color: ${DD_FG} !important;
}
.fortune-sort-modal select {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  border: 1px solid ${BORDER} !important;
}

/* ══════════════════════════════════════════════════════════════
   13. ZOOM MENU
   Verified: fortune-zoom-ratio-menu, fortune-zoom-container
   ══════════════════════════════════════════════════════════════ */
.fortune-zoom-ratio-menu {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border: 1px solid ${BORDER} !important;
}
.fortune-zoom-ratio-menu * {
  color: ${DD_FG} !important;
}
.fortune-zoom-ratio-item:hover {
  background: ${HOVER} !important;
}
.fortune-zoom-container {
  color: ${FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   14. DATA VERIFICATION / LINK / SPLIT COLUMN PANELS
   Verified: fortune-data-verification, fortune-link-modify-modal
   ══════════════════════════════════════════════════════════════ */
.fortune-data-verification,
.fortune-link-modify-modal,
.fortune-split-column,
.fortune-location-condition {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
.fortune-data-verification *,
.fortune-link-modify-modal *,
.fortune-split-column *,
.fortune-location-condition * {
  color: ${DD_FG} !important;
}
.fortune-link-modify-input {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  border: 1px solid ${BORDER} !important;
}

/* ══════════════════════════════════════════════════════════════
   15. SHEET TAB BAR & STAT AREA
   Verified: luckysheet-sheet-area, fortune-sheettab-container,
             fortune-stat-area
   ══════════════════════════════════════════════════════════════ */
.luckysheet-sheet-area,
.fortune-sheettab-container {
  background: ${HDR_BG} !important;
}
.fortune-sheet-list-item {
  color: ${FG} !important;
}
.fortune-stat-area {
  background: ${HDR_BG} !important;
  color: ${FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   16. BORDER PICKER
   Verified: fortune-boder-style-picker, fortune-border-select-menu
   ══════════════════════════════════════════════════════════════ */
.fortune-boder-style-picker,
.fortune-border-select-menu,
.fortune-border-style-picker-menu {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border: 1px solid ${BORDER} !important;
}
.fortune-boder-style-picker *,
.fortune-border-select-menu *,
.fortune-border-style-picker-menu * {
  color: ${DD_FG} !important;
}
.fortune-border-select-option:hover {
  background: ${HOVER} !important;
}

/* ══════════════════════════════════════════════════════════════
   17. FORMULA HELP / SEARCH PANELS
   Verified: luckysheet-formula-help-c, luckysheet-formula-search-c
   ══════════════════════════════════════════════════════════════ */
[class*="luckysheet-formula-help"],
[class*="luckysheet-formula-search"] {
  background: ${DD_BG} !important;
  color: ${DD_FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   18. POPOVER BACKDROP
   Verified: fortune-popover-backdrop
   ══════════════════════════════════════════════════════════════ */
.fortune-popover-backdrop {
  background: transparent !important;
}

/* ══════════════════════════════════════════════════════════════
   19. GLOBAL SELECT/OPTION FALLBACK
   ══════════════════════════════════════════════════════════════ */
select {
  color: ${DD_FG} !important;
  background: ${DD_BG} !important;
}
select option {
  color: ${DD_FG} !important;
  background: ${DD_BG} !important;
}
`;

const styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);
