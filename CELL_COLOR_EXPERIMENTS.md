# Cell Color Experimentation Guide

This document explains how FortuneSheet cell colors work and provides
code snippets you can test to achieve cell-level highlighting.

---

## Why CSS Cannot Style Individual Cells

FortuneSheet renders all cell content on a **`<canvas>`** element.
CSS only applies to DOM (HTML) elements, not canvas pixels.
Therefore `color`, `background-color`, etc. have **no effect** on cell text
or cell backgrounds.

The surrounding UI (toolbar, headers, dialogs) IS HTML and CAN be CSS-styled.

---

## How FortuneSheet Cell Styling Works

Each cell is stored in `celldata` as an object with a `v` property:

```js
{
  r: 5,    // row index (0 = header row)
  c: 2,    // column index
  v: {
    v: 'hello',         // raw value
    m: 'hello',         // display string
    ct: { fa: '@', t: 's' },  // cell type
    fc: '#CC0000',      // font color (text color)
    bg: '#FFCCCC',      // background color
    bl: 1,              // bold (1 = yes)
    it: 1,              // italic
    fs: 12,             // font size
    ff: 'Arial',        // font family
    cl: 1,              // strikethrough
    un: 1,              // underline
  }
}
```

### Key properties for color:
| Property | Meaning | Example |
|----------|---------|---------|
| `fc` | Font color (text) | `'#CC0000'` (red) |
| `bg` | Background color | `'#FFCCCC'` (light red) |

---

## The Challenge: Remount Required

FortuneSheet only reads the `data` prop on **initial mount**. To change
cell colors after the sheet is already displayed, you must:

1. Modify the `celldata` array (set `fc` / `bg` on target cells)
2. Update the React state (`setSheetData`)
3. Change the `key` prop on `<Workbook>` to force a remount

This remount causes:
- A brief visual "flash" as the sheet re-renders
- Loss of cursor position and active editing state
- The `onChange` event fires again on mount (handled by `skipNextChangeRef`)

---

## Experiment 1: Color a Specific Cell on Load

In `jsonEditorProvider.js`, after `jsonToSheetData()` returns, modify
a specific cell before sending to the webview:

```js
// Inside loadDocument(), after: const result = jsonToSheetData(json);

// Color cell at data row 0, column 2 (sheet row 1, col 2)
const targetRow = 1; // 0 = header, 1+ = data rows
const targetCol = 2;
const cell = result.sheetData[0].celldata.find(
  c => c.r === targetRow && c.c === targetCol
);
if (cell && cell.v) {
  cell.v.fc = '#CC0000';  // red text
  cell.v.bg = '#FFCCCC';  // light red background
}
```

This will show the cell with red text on initial load. No remount issue
since it's the first render.

---

## Experiment 2: Color Error Cells After Validation

In `jsonEditorProvider.js`, in the `case 'edit'` handler, after validation:

```js
// After: const errors = validateJson(json, jsonStructure);
// Build a set of error cell positions
const errorCells = new Set();
errors.forEach(err => {
  if (err.field) {
    const colIdx = headers.indexOf(err.field);
    if (colIdx >= 0) errorCells.add(`${err.row + 1}_${colIdx}`);
    // err.row + 1 because sheet row 0 = headers
  }
});

// Rebuild sheetData from current JSON (includes user's invalid edits)
const { sheetData: styledData } = jsonToSheetData(json);

// Apply red to error cells
styledData[0].celldata.forEach(cell => {
  const key = `${cell.r}_${cell.c}`;
  if (cell.v && errorCells.has(key)) {
    cell.v.fc = '#CC0000';
    cell.v.bg = '#FFCCCC';
  }
});

// Send back to webview — this triggers a Workbook remount
webview.postMessage({
  type: 'loadData',
  sheetData: styledData,
  headers,
});
```

**Important:** This causes a Workbook remount. The `loadData` message
triggers `onLoadData` in `SpreadsheetEditor.jsx` which bumps the version
key. The sheet will "blink" but will show the user's data with red cells.

---

## Experiment 3: Using Conditional Formatting (Advanced)

FortuneSheet supports `luckysheet_conditionformat_save` in the sheet config.
This is an array of conditional format rules applied during canvas painting.

```js
// In the sheet data object:
{
  name: 'Sheet1',
  celldata: [...],
  config: {},
  luckysheet_conditionformat_save: [
    {
      type: 'default',
      cellrange: [{ row: [5, 5], column: [2, 2] }],  // row 5, col 2
      format: {
        textColor: '#CC0000',
        cellColor: '#FFCCCC',
      },
      conditionName: 'greaterThan',
      conditionValue: ['-999999'],  // always true
    }
  ]
}
```

This is more complex but may allow styling without the same
remount issues, since it's part of the sheet configuration.

---

## Summary

| Approach | Pros | Cons |
|----------|------|------|
| `fc`/`bg` on load | Simple, no flicker | Only works on initial render |
| `fc`/`bg` + remount | Works for dynamic changes | Causes sheet "blink", resets cursor |
| Conditional formatting | Native to FortuneSheet | Complex config, needs testing |

The fundamental limitation is that FortuneSheet manages its own internal
state after mount. There is no public API to update individual cell styles
without a full remount.
