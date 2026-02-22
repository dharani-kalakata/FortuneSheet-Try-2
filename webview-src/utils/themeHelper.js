/**
 * Injects CSS overrides so FortuneSheet respects VS Code's active theme.
 *
 * FortuneSheet ships with hardcoded white/light colours.  The rules below
 * replace them with VS Code CSS custom properties, which automatically
 * switch between light and dark themes.
 *
 * Priority: readability > aesthetics.  Every overlay, dropdown, filter panel,
 * and input must have clear foreground/background contrast.
 */

const FG  = 'var(--vscode-editor-foreground)';
const BG  = 'var(--vscode-editor-background)';
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
   1. BASE CANVAS
   ══════════════════════════════════════════════════════════════ */
.fortune-sheet-container,
.luckysheet-sheet-area,
.luckysheet,
.luckysheet-cell-main {
  background: ${BG} !important;
  color: ${FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   2. CELLS
   ══════════════════════════════════════════════════════════════ */
.luckysheet-cell-flow .luckysheet-cell,
.luckysheet-cell-flow td,
.luckysheet-cell-flow .luckysheet-cell .luckysheet-cell-text {
  color: ${FG} !important;
}
.luckysheet-cell-flow .luckysheet-cell {
  border-color: ${BORDER} !important;
}

/* ══════════════════════════════════════════════════════════════
   3. ROW & COLUMN HEADERS
   ══════════════════════════════════════════════════════════════ */
.luckysheet-rows-h,
.luckysheet-cols-h-cells,
.luckysheet-rows-h .luckysheet-rows-h-cells,
.luckysheet-cols-h-cells .luckysheet-cols-h-c {
  background: ${HDR_BG} !important;
  color: ${FG} !important;
  border-color: ${BORDER} !important;
}

/* ══════════════════════════════════════════════════════════════
   4. TOOLBAR
   ══════════════════════════════════════════════════════════════ */
.fortune-toolbar,
.luckysheet-wa-editor,
.luckysheet-toolbar-menu,
#luckysheet-icon-morebtn-div {
  background: ${HDR_BG} !important;
  color: ${FG} !important;
  border-color: ${BORDER} !important;
}
.fortune-toolbar button,
.fortune-toolbar .luckysheet-toolbar-button,
.fortune-toolbar select {
  color: ${FG} !important;
  background: transparent !important;
}
.fortune-toolbar button:hover,
.fortune-toolbar .luckysheet-toolbar-button:hover {
  background: ${HOVER} !important;
}
.fortune-toolbar svg,
.fortune-toolbar path {
  fill: ${FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   5. FORMULA BAR
   ══════════════════════════════════════════════════════════════ */
.luckysheet-wa-editor,
.fortune-formula-bar,
.luckysheet-formula-bar-input,
#luckysheet-functionbox-cell,
#luckysheet-rich-text-editor {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  border-color: ${BORDER} !important;
}

/* ══════════════════════════════════════════════════════════════
   6. CELL EDITING INPUT
   ══════════════════════════════════════════════════════════════ */
.luckysheet-input-box,
#luckysheet-input-box,
.luckysheet-input-box textarea,
#luckysheet-input-box textarea,
.luckysheet-cell-input,
#luckysheet-rich-text-editor {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  caret-color: var(--vscode-editorCursor-foreground, ${FG}) !important;
}

/* ══════════════════════════════════════════════════════════════
   7. SCROLLBARS
   ══════════════════════════════════════════════════════════════ */
.luckysheet-scrollbar-x,
.luckysheet-scrollbar-y {
  background: transparent !important;
}
.luckysheet-scrollbar-x div,
.luckysheet-scrollbar-y div {
  background: var(--vscode-scrollbarSlider-background, rgba(128,128,128,0.4)) !important;
}
.luckysheet-scrollbar-x div:hover,
.luckysheet-scrollbar-y div:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground, rgba(128,128,128,0.6)) !important;
}

/* ══════════════════════════════════════════════════════════════
   8. SELECTION
   ══════════════════════════════════════════════════════════════ */
.luckysheet-cell-selected,
.luckysheet-cell-selected-focus {
  border-color: ${FOCUS} !important;
}

/* ══════════════════════════════════════════════════════════════
   9. ALL OVERLAYS / DROPDOWNS / POPUPS / CONTEXT MENUS
   These MUST be clearly readable — this is the most critical
   section.  Everything gets explicit bg + fg + border.
   ══════════════════════════════════════════════════════════════ */

/* Container-level overrides */
.luckysheet-cols-menu,
.luckysheet-rightclick-menu,
.luckysheet-filter-menu,
.luckysheet-filter-byvalue,
.luckysheet-filter-byvalue-select,
.luckysheet-cols-menuitem,
.luckysheet-menuButton,
.fortune-context-menu,
.luckysheet-modal-dialog,
.luckysheet-modal-dialog-content,
.luckysheet-cell-date-picker,
.luckysheet-cell-date-picker *,
.luckysheet-cols-menu ul,
.luckysheet-rightclick-menu ul {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border-color: ${BORDER} !important;
}

/* ── Filter panel (the main popup when you click the column arrow) ── */
.luckysheet-filter-menu {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border: 1px solid ${BORDER} !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
}
.luckysheet-filter-menu * {
  color: ${DD_FG} !important;
}

/* Sort labels inside filter */
.luckysheet-filter-menu .luckysheet-filter-sort,
.luckysheet-filter-menu .luckysheet-filter-sort span,
.luckysheet-filter-menu .luckysheet-filter-sort div,
.luckysheet-filter-menu label,
.luckysheet-filter-menu span {
  color: ${DD_FG} !important;
}

/* ── Filter "by value" list (checkboxes) ── */
.luckysheet-filter-byvalue-list,
.luckysheet-filter-byvalue-list ul,
.luckysheet-filter-byvalue-list li {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
}
.luckysheet-filter-byvalue-list label,
.luckysheet-filter-byvalue-list span,
.luckysheet-filter-byvalue-list input[type="checkbox"] + span {
  color: ${DD_FG} !important;
}

/* ── Filter search input ── */
.luckysheet-filter-byvalue-input input,
.luckysheet-filter-menu input,
.luckysheet-filter-byvalue input[type="text"],
.luckysheet-filter-menu input[type="text"] {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  border: 1px solid ${BORDER} !important;
  outline: none !important;
}
.luckysheet-filter-byvalue-input input:focus,
.luckysheet-filter-menu input:focus {
  border-color: ${FOCUS} !important;
}

/* ── Filter / context-menu buttons ── */
.luckysheet-filter-menu button,
.luckysheet-filter-menu .button,
.luckysheet-filter-menu .luckysheet-filter-initial,
.luckysheet-filter-menu [class*="btn"] {
  background: ${BTN_BG} !important;
  color: ${BTN_FG} !important;
  border: none !important;
  cursor: pointer !important;
}
.luckysheet-filter-menu button:hover,
.luckysheet-filter-menu .button:hover {
  opacity: 0.85 !important;
}

/* ── Menu items hover ── */
.luckysheet-cols-menuitem:hover,
.luckysheet-rightclick-menu .luckysheet-cols-menuitem:hover,
.fortune-context-menu-item:hover,
.luckysheet-filter-menu li:hover,
.luckysheet-filter-byvalue-list li:hover {
  background-color: ${HOVER} !important;
}

/* ── Menu item text (catch-all for nested spans/divs) ── */
.luckysheet-cols-menuitem *,
.luckysheet-rightclick-menu *,
.fortune-context-menu * {
  color: ${DD_FG} !important;
}
.luckysheet-cols-menuitem svg,
.luckysheet-rightclick-menu svg,
.fortune-context-menu svg {
  fill: ${DD_FG} !important;
}

/* ══════════════════════════════════════════════════════════════
   10. MODAL DIALOGS (general)
   ══════════════════════════════════════════════════════════════ */
.luckysheet-modal-dialog {
  background-color: ${DD_BG} !important;
  color: ${DD_FG} !important;
  border: 1px solid ${BORDER} !important;
}
.luckysheet-modal-dialog * {
  color: ${DD_FG} !important;
}
.luckysheet-modal-dialog input,
.luckysheet-modal-dialog textarea,
.luckysheet-modal-dialog select {
  background: ${INP_BG} !important;
  color: ${INP_FG} !important;
  border: 1px solid ${BORDER} !important;
}
.luckysheet-modal-dialog-button,
.luckysheet-modal-dialog .btn,
.luckysheet-modal-dialog button {
  background: ${BTN_BG} !important;
  color: ${BTN_FG} !important;
  border: none !important;
}
.luckysheet-modal-dialog-button:hover,
.luckysheet-modal-dialog .btn:hover,
.luckysheet-modal-dialog button:hover {
  opacity: 0.85 !important;
}

/* ══════════════════════════════════════════════════════════════
   11. SHEET TAB BAR (hidden but safe override)
   ══════════════════════════════════════════════════════════════ */
.luckysheet-sheet-area,
.luckysheet-sheet-list {
  background: ${HDR_BG} !important;
}

/* ══════════════════════════════════════════════════════════════
   12. MISC – icons inside filter, dropdown arrows, etc.
   ══════════════════════════════════════════════════════════════ */
.luckysheet-filter-menu svg,
.luckysheet-filter-menu path,
.luckysheet-modal-dialog svg,
.luckysheet-modal-dialog path {
  fill: ${DD_FG} !important;
}

/* Ensure the filter dropdown arrow on column headers is visible */
.luckysheet-filter-options,
.luckysheet-filter-options span {
  color: ${FG} !important;
}
`;

const styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);
