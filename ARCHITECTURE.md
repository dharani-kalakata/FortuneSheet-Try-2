# FortuneSheet JSON Editor — Complete Architecture & Code Reference

This document explains the entire codebase from high-level architecture down to
individual function logic. Written for a developer who has never seen this project.

---

## Table of Contents

- [Level 1 — High-Level File Map](#level-1--high-level-file-map)
- [Level 2 — User Flow](#level-2--user-flow)
- [Level 3 — Code Flow & Reasoning](#level-3--code-flow--reasoning)
- [Level 4 — Function-by-Function Reference](#level-4--function-by-function-reference)
- [FAQ — Common Questions Answered](#faq--common-questions-answered)

---

# Level 1 — High-Level File Map

## What This Project Is

A **VS Code extension** that opens `.json` files as interactive spreadsheets instead
of raw text. It uses **FortuneSheet** (a React-based spreadsheet library) inside a
VS Code **webview panel**. Users can view and edit JSON data in a familiar
Excel-like grid, and changes are validated and saved back to the `.json` file.

## Project Architecture: Two Halves

The codebase is split into two completely separate runtime contexts:

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│     EXTENSION HOST (Node.js)  │     │     WEBVIEW (Browser/React)   │
│                                │     │                                │
│  src/extension.js              │     │  webview-src/main.jsx          │
│  src/jsonEditorProvider.js     │◄──►│  webview-src/components/       │
│  src/jsonConverter.js          │ msg │    SpreadsheetEditor.jsx       │
│  src/jsonValidator.js          │     │  webview-src/hooks/            │
│                                │     │    useVscodeMessaging.js       │
│  Reads/writes .json files      │     │  webview-src/utils/            │
│  Runs validation rules         │     │    themeHelper.js              │
│  Owns the VS Code document     │     │                                │
│                                │     │  Renders the spreadsheet UI    │
│  Runs in Node.js               │     │  Runs in a sandboxed browser   │
└──────────────────────────────┘     └──────────────────────────────┘
         │                                        │
         └────── communicate via postMessage ──────┘
```

These two halves **cannot** share variables, import each other's files, or access
each other's DOM/APIs. They communicate ONLY through `postMessage`.

## File-by-File Summary

### Build & Configuration Files

| File | What It Does |
|------|-------------|
| `package.json` | Extension manifest. Declares `fortunesheet.jsonEditor` custom editor for `*.json` files. Lists FortuneSheet, React, webpack as dependencies. |
| `webpack.config.js` | Bundles all `webview-src/` code into a single `dist/webview/bundle.js`. Uses Babel for JSX → JS transformation. Loads `.css` files via style-loader. |
| `setup.js` | One-time script (`node setup.js`) that creates the directory structure. Run once during initial setup, not used afterward. |
| `.vscodeignore` | Tells VS Code which files to exclude when packaging the extension as a `.vsix`. Excludes `webview-src/` (only the built `dist/` is needed). |
| `.gitignore` | Excludes `node_modules/`, `dist/`, `.vsix`, and `setup.js` from Git. |

### Extension Host Files (src/)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `extension.js` | Entry point. Called by VS Code on activation. Registers the custom editor provider. | `activate()`, `deactivate()` |
| `jsonEditorProvider.js` | Core orchestrator. Creates the webview HTML, handles all message passing, reads/writes the JSON document, triggers validation, implements partial save. | `JsonEditorProvider` class |
| `jsonConverter.js` | Pure data transformation. Converts JSON ↔ FortuneSheet cell data format. No side effects. | `jsonToSheetData()`, `sheetDataToJson()`, helpers |
| `jsonValidator.js` | Pure validation logic. Checks business rules against JSON rows. Returns error list. No side effects. | `validateJson()` |

### Webview Files (webview-src/)

| File | Purpose |
|------|---------|
| `main.jsx` | Webview entry point. Imports themeHelper (side effect — injects CSS), renders `<SpreadsheetEditor>` into the `#root` div. |
| `components/SpreadsheetEditor.jsx` | The main React component. Wraps FortuneSheet's `<Workbook>`, shows error banner, bridges user edits to the extension. |
| `hooks/useVscodeMessaging.js` | Custom React hook. Manages the bidirectional `postMessage` channel between webview and extension host. |
| `utils/themeHelper.js` | Injects a `<style>` element with CSS overrides so FortuneSheet's UI matches VS Code's active theme (dark or light). |

### Output & Data Files

| File | Purpose |
|------|---------|
| `dist/webview/bundle.js` | Webpack output. The compiled webview code loaded by the browser inside VS Code. Not in Git. |
| `variable_config_extended.json` | Sample data file. An "object-of-objects" JSON where each key is a variable name and each value is a config object. This is the type of file this editor is designed for. |

---

# Level 2 — User Flow

## Flow 1: Opening a JSON File

```
User right-clicks a .json file → "Open With..." → "FortuneSheet JSON Editor"
                    │
                    ▼
VS Code calls extension.js → activate() → registers JsonEditorProvider
                    │
                    ▼
VS Code calls resolveCustomTextEditor(document, webviewPanel)
                    │
                    ▼
jsonEditorProvider.js:
  1. Sets up webview security (CSP, local resource roots)
  2. Generates HTML shell with <div id="root"> and <script src="bundle.js">
  3. Sets webview.html → browser loads bundle.js
                    │
                    ▼
bundle.js (in browser):
  1. themeHelper.js runs → injects <style> with 430+ lines of CSS overrides
  2. main.jsx renders <SpreadsheetEditor> into #root
  3. SpreadsheetEditor mounts → useVscodeMessaging sends { type: 'ready' }
                    │
                    ▼
jsonEditorProvider.js receives 'ready' message:
  1. Reads document.getText() → parses JSON
  2. Calls jsonToSheetData(json) → converts to FortuneSheet format
  3. Sends { type: 'loadData', sheetData, headers } to webview
                    │
                    ▼
SpreadsheetEditor receives loadData:
  1. Stores headers, bumps version counter
  2. Sets sheetData state → triggers React re-render
  3. <Workbook key={version} data={sheetData}> mounts FortuneSheet
  4. User sees the spreadsheet with their JSON data
```

## Flow 2: Editing a Cell

```
User clicks a cell, types a new value, presses Enter or clicks away
                    │
                    ▼
FortuneSheet fires onChange(data) callback
                    │
                    ▼
SpreadsheetEditor.handleChange(data):
  1. Checks skipNextChangeRef (skip if this is the mount-time onChange)
  2. Checks loadTimeRef (skip if within 1 second of data load)
  3. Extracts 2-D array of plain values from FortuneSheet's internal data
  4. Sends { type: 'edit', values: [[...], [...], ...] } to extension
                    │
                    ▼
jsonEditorProvider.js receives 'edit' message:
  1. Calls sheetDataToJson(values, ...) → converts back to JSON
  2. Compares JSON.stringify(json) with normalizedOriginal → skip if no change
  3. Calls validateJson(json, structure) → gets error list
  4. Sends { type: 'validationErrors', errors, headers } to webview
  5. PARTIAL SAVE:
     - If errors exist: mergeValidRows() → valid rows from new data,
       invalid rows from lastValidJson
     - If no errors: save all data as-is
  6. Writes the merged/clean JSON back to VS Code's TextDocument
                    │
                    ▼
SpreadsheetEditor receives validationErrors:
  1. Updates validationErrors state
  2. If errors exist → red banner appears at top with row numbers and messages
  3. If no errors → banner disappears
```

## Flow 3: Saving (Ctrl+S)

```
User presses Ctrl+S
        │
        ▼
VS Code fires onWillSaveTextDocument event
        │
        ▼
jsonEditorProvider.js:
  - If currentValidationErrors.length > 0:
    Shows warning: "X row(s) have errors and were NOT saved"
  - The document ALREADY contains the partially-saved data
    (valid rows were written on every edit, invalid rows kept old values)
  - VS Code saves the file to disk normally
```

## Flow 4: External Changes (Undo/Redo/Other Editor)

```
User presses Ctrl+Z (undo) or another editor modifies the same file
        │
        ▼
VS Code fires onDidChangeTextDocument
        │
        ▼
jsonEditorProvider.js:
  - Checks: is this our own edit? (suppressDocChange flag) → skip if yes
  - Otherwise: calls loadDocument() → re-reads, re-converts, re-sends to webview
        │
        ▼
SpreadsheetEditor receives new loadData → remounts Workbook with updated data
```

---

# Level 3 — Code Flow & Reasoning

## 3.1 Why Two Runtime Contexts?

VS Code extensions run in Node.js (no DOM, no browser APIs). But FortuneSheet is
a browser-based React library that needs a real DOM. VS Code solves this with
**webview panels** — an embedded browser (Chromium) that runs inside VS Code.

The extension host (Node.js) owns the file system and VS Code APIs.
The webview (browser) owns the UI rendering.
They can ONLY talk via `postMessage`.

This is why the code is split into `src/` (Node.js) and `webview-src/` (browser).

## 3.2 JSON ↔ Sheet Data Conversion

The core challenge: JSON data must be displayed as a spreadsheet grid.

**Three JSON shapes are supported:**

1. **Array of objects** (`[{a:1, b:2}, {a:3, b:4}]`)
   - Each object = one spreadsheet row
   - Union of all keys = column headers
   - Structure: `'array'`

2. **Object of objects** (`{"key1": {a:1}, "key2": {a:2}}`)
   - This is the `variable_config_extended.json` pattern
   - Each top-level key becomes the `_key` column
   - Inner object fields become the remaining columns
   - Structure: `'object-of-objects'`

3. **Simple flat object** (`{a:1, b:2, c:3}`)
   - Keys = column headers, values = single data row
   - Structure: `'object'`

**Type preservation:** When converting JSON → spreadsheet, all values become display
strings. The original type of each cell is stored in `typeMap` (e.g., `"1_3": "number"`).
When converting back, `castValue()` uses this map to restore the original types.

## 3.3 Validation Rules — Why They Exist

The JSON files being edited are **variable configuration files** for a strategy
execution engine. Each variable has fields like `used_in_strategy`, `field_type`,
`field_direction`, etc. The validation rules enforce business constraints:

- If `used_in_strategy` is "Y", then `field_name` and `data_block_category` must exist
- If `part_of_call_interface` is "Y", then `field_type` must be a valid type
- Contradictory combinations are caught (e.g., `field_direction` = "output" but
  `mandatory_presence_in_input` = "Y")

The validation runs **on every cell edit** (not on save, not on blur). This gives
instant feedback.

## 3.4 Partial Save — Why It Exists

**Problem:** User edits 50 rows. Row 23 has a validation error. Without partial save,
the user loses all 50 edits when they close VS Code.

**Solution:** On every edit, the extension saves VALID rows immediately and keeps
INVALID rows at their previous valid values. The JSON file on disk is always in a
valid state (for all rows that were valid). The user sees errors in the banner and
can fix them — once fixed, those rows get saved too.

## 3.5 ThemeHelper — Why It Exists and Why "luckysheet" Classes Appear

**The problem:** FortuneSheet ships with hardcoded white/light-gray CSS. In VS Code's
dark mode, everything becomes invisible — white text on white backgrounds, invisible
dropdown menus, etc.

**The solution:** themeHelper.js injects CSS that overrides FortuneSheet's hardcoded
colors with VS Code CSS variables (`var(--vscode-editor-background)`, etc.).

**Why "luckysheet" class names?** FortuneSheet is a fork of a project called
**LuckySheet**. When they forked it, they renamed MOST class names from
`luckysheet-*` to `fortune-*`, but NOT ALL of them. The FortuneSheet v1.0.4 bundle
still contains both naming conventions. For example:

| Still uses `luckysheet-` | Now uses `fortune-` |
|--------------------------|---------------------|
| `luckysheet-cell-selected` | `fortune-toolbar` |
| `luckysheet-cols-menu` | `fortune-dialog` |
| `luckysheet-modal-dialog` | `fortune-search-replace` |
| `luckysheet-input-box` | `fortune-fx-editor` |
| `luckysheet-filter-byvalue` | `fortune-sort` |
| `luckysheet-sheet-area` | `fortune-sheettab-container` |

**Every class name in themeHelper.js was verified** to exist in the FortuneSheet
bundle at `node_modules/@fortune-sheet/react/dist/index.js`.

**Critical limitation — canvas-rendered headers:**
The row headers (1, 2, 3…) and column headers (A, B, C…) are NOT HTML elements.
They are drawn directly on a `<canvas>` using `ctx.fillText()` with a hardcoded
dark color (`#5e5e5e`). CSS has **zero effect** on canvas-drawn text. This is why
we deliberately DO NOT set background colors on `.fortune-row-header` or
`.fortune-col-header` — doing so would make headers invisible in dark mode.

## 3.6 The FortuneSheet Mount Problem

FortuneSheet reads the `data` prop ONLY on initial mount. After that, it manages
its own internal state. This means:

- Changing `sheetData` in React state does NOT update the visible spreadsheet
- The only way to "reload" data is to change the `key` prop on `<Workbook>`,
  which forces React to destroy and re-create the component
- This remount causes a visual "flash" and fires a synthetic `onChange`

The `version` state and `skipNextChangeRef` exist to handle this:
- `version` increments on each `loadData` → new `key` → remount
- `skipNextChangeRef` = true after remount → the first `onChange` is ignored

## 3.7 Message Protocol

Messages between extension and webview:

| Direction | Type | Payload | When |
|-----------|------|---------|------|
| Webview → Extension | `ready` | (none) | Webview has mounted |
| Extension → Webview | `loadData` | `{ sheetData, headers }` or `{ error }` | Initial load, undo/redo |
| Webview → Extension | `edit` | `{ values: 2D array }` | User edits any cell |
| Extension → Webview | `validationErrors` | `{ errors: [...], headers }` | After every edit |

---

# Level 4 — Function-by-Function Reference

## 4.1 `src/extension.js`

### `activate(context)`
- **Purpose:** VS Code calls this when the extension activates
- **Logic:** Creates a `JsonEditorProvider` instance and registers it with VS Code
- **Trigger:** First time a `.json` file is opened (lazy activation)

### `deactivate()`
- **Purpose:** Cleanup when extension deactivates
- **Logic:** Empty — no cleanup needed (VS Code handles disposable cleanup)

---

## 4.2 `src/jsonEditorProvider.js`

### Class: `JsonEditorProvider`

#### `static register(context)` → Disposable
- **Purpose:** Factory method that registers this provider with VS Code
- **Logic:** Calls `vscode.window.registerCustomEditorProvider()` with options:
  - `retainContextWhenHidden: true` — keeps webview alive when tab is not visible
  - `supportsMultipleEditorsPerDocument: false` — one editor per file

#### `resolveCustomTextEditor(document, webviewPanel)` → void
- **Purpose:** Called by VS Code when opening a file with this editor
- **Logic:** This is the BIG function. It:
  1. Configures webview security (CSP, allowed local paths)
  2. Initializes per-editor state variables
  3. Defines `loadDocument()` closure
  4. Sets up message handler (ready, edit)
  5. Sets up save-time warning
  6. Sets up external change listener
  7. Sets up cleanup on panel dispose

**Per-editor state variables:**

| Variable | Type | Purpose |
|----------|------|---------|
| `typeMap` | `Object` | Maps `"row_col"` → original JS type (e.g., `"number"`) |
| `jsonStructure` | `string` | `'array'` / `'object-of-objects'` / `'object'` |
| `originalKeys` | `string[]` | Top-level key order for object-of-objects |
| `headers` | `string[]` | Column header names |
| `suppressDocChange` | `boolean` | True while we're writing to the document (prevents re-entry) |
| `normalizedOriginal` | `string` | JSON.stringify of current document (for change detection) |
| `lastValidJson` | `Object` | Last known-good JSON (invalid rows fall back to this) |
| `currentValidationErrors` | `Array` | Current error list (checked at save time) |

#### Inner function: `loadDocument()`
- **Purpose:** Reads the VS Code TextDocument, converts to sheet data, sends to webview
- **Logic:**
  1. `document.getText()` → raw file content
  2. `JSON.parse()` → parsed JSON
  3. Store `normalizedOriginal` and `lastValidJson`
  4. `jsonToSheetData(json)` → get sheetData, typeMap, structure, keys, headers
  5. `webview.postMessage({ type: 'loadData', sheetData, headers })`
- **Error handling:** Empty file → sends error message. Invalid JSON → sends parse error.

#### Message handler: `case 'edit'`
- **Purpose:** Handles every cell edit from the webview
- **Logic:**
  1. `sheetDataToJson(values, typeMap, ...)` → reconstruct JSON from grid values
  2. Skip if `JSON.stringify` matches `normalizedOriginal` (no actual data change)
  3. `validateJson(json, structure)` → get errors
  4. Send errors to webview for banner display
  5. **Partial save logic:**
     - If errors AND we have `lastValidJson`: build hybrid with `mergeValidRows()`
     - If no errors: use the full new JSON
  6. Write the JSON-to-save to the VS Code document via `WorkspaceEdit`
  7. Update `normalizedOriginal` and `lastValidJson`

#### Save warning: `onWillSaveTextDocument`
- **Purpose:** Show a VS Code notification when user saves with validation errors
- **Logic:** If `currentValidationErrors.length > 0`, show warning message
- **Note:** The file still saves — the document already has valid data (partial save
  happened on every edit). The warning just reminds the user that some rows weren't saved.

#### External change handler: `onDidChangeTextDocument`
- **Purpose:** Re-sync the spreadsheet when the file changes outside our control
- **Triggers:** Undo (Ctrl+Z), redo, another editor modifying the same file
- **Logic:** If `suppressDocChange` is false (not our own edit), call `loadDocument()`

#### `_getHtml(webview)` → string
- **Purpose:** Generates the HTML shell for the webview
- **Logic:** Returns an HTML string with:
  - CSP meta tag (restricts what the webview can load)
  - Base styles using VS Code CSS variables
  - `<div id="root">` — React mount point
  - `<script src="bundle.js">` — the compiled webview code
  - A random nonce for CSP script allowlisting

### Standalone function: `_getNonce()` → string
- **Purpose:** Generates a random 32-character nonce
- **Logic:** Picks random chars from `[A-Za-z0-9]`
- **Used for:** Content Security Policy — only scripts with matching nonce can execute

### Standalone function: `mergeValidRows(newJson, lastValidJson, structure, errorRows)` → Object
- **Purpose:** Creates a hybrid JSON where valid rows come from the new edit and
  invalid rows are preserved from the last known-good state
- **Logic by structure:**
  - `'array'`: Maps over rows — if row index is in `errorRows`, use `lastValidJson[idx]`
  - `'object-of-objects'`: Same but keyed by object key instead of numeric index
  - `'object'`: Single row — if row 0 is in error, return entire `lastValidJson`
- **Why it exists:** Ensures the document on disk always has valid data for valid rows,
  even when some rows have validation errors

---

## 4.3 `src/jsonConverter.js`

### `getValueType(value)` → string
- **Purpose:** Returns a type tag for any JS value
- **Returns:** `'null'` | `'array'` | `'object'` | `'string'` | `'number'` | `'boolean'`
- **Why:** FortuneSheet displays everything as strings. We need to remember original
  types so we can restore them when converting back.

### `valueToDisplay(value)` → string
- **Purpose:** Converts any JS value to a display string for the spreadsheet
- **Logic:**
  - `null`/`undefined` → `''`
  - Arrays/objects → `JSON.stringify(value)`
  - Everything else → `String(value)`

### `jsonToSheetData(json)` → `{ sheetData, typeMap, structure, keys, headers }`
- **Purpose:** THE core conversion. Takes parsed JSON and produces FortuneSheet data.
- **Logic:**
  1. **Detect structure:** Array? Object-of-objects? Simple object?
  2. **Extract headers:** Union of all keys across all rows
  3. **Build typeMap:** For each cell, store `"rowIdx+1_colIdx"` → original JS type
  4. **Build celldata:** Sparse array of cell objects. Row 0 = bold headers. Row 1+ = data.
  5. **Calculate column widths:** Based on header text length (min 80px, max 220px)
  6. **Assemble sheet:** Returns a single-sheet array with name, celldata, config
- **Cell object format:**
  ```js
  { r: 0, c: 0, v: { v: 'hello', m: 'hello', ct: { fa: '@', t: 's' }, bl: 1 } }
  //  row  col      raw value  display   cell type (string)            bold
  ```
- **Type map key format:** `"1_0"` = row 1, column 0 (data rows start at index 1
  because row 0 is headers in the sheet)

### `emptySheet(structure)` → object
- **Purpose:** Returns a minimal empty sheet for empty JSON input
- **Logic:** Single sheet with no celldata, 1 row, 1 column

### `castValue(displayValue, originalType)` → any
- **Purpose:** Converts a spreadsheet display value back to its original JS type
- **Logic by type:**
  - `'string'` → `String(value)` (empty → `''`)
  - `'number'` → `Number(value)` (invalid → `null`)
  - `'boolean'` → true/false (accepts y/n, true/false, 1/0, yes/no)
  - `'null'` → null (or Number if numeric, or string)
  - `'array'`/`'object'` → `JSON.parse(value)` (fallback to string)
- **Why `null` for empty non-strings:** A cell that originally held `42` (number) and
  is now cleared should become `null`, not `0` or `''`.

### `sheetDataToJson(values, typeMap, structure, headers, originalKeys)` → Object
- **Purpose:** Converts the 2-D value grid back into the original JSON shape
- **Parameters:**
  - `values` — 2-D array from FortuneSheet. Row 0 = headers, row 1+ = data
  - `typeMap` — original types per cell
  - `structure` — which JSON shape to reconstruct
  - `headers` — column names
  - `originalKeys` — preserved key order for object-of-objects
- **Logic:**
  1. Loop through rows 1+ (skip header row 0)
  2. Skip fully empty rows
  3. For each cell: `castValue(displayValue, typeMap[row_col])` → restore type
  4. Reconstruct into the original JSON shape:
     - `'array'` → return array of row objects
     - `'object-of-objects'` → use `_key` column (or originalKeys) as object keys
     - `'object'` → return first row as a flat object

---

## 4.4 `src/jsonValidator.js`

### `validateJson(json, structure)` → Array
- **Purpose:** Validates business rules for variable configuration data
- **Returns:** Array of error objects: `{ row, key, field, message }`
- **Logic flow:**

```
For each row in the data:
  │
  ├─ Skip if row doesn't have 'used_in_strategy' field
  │
  ├─ CHECK 1: used_in_strategy must be Y or N
  │    └─ Error if null, empty, or any other value
  │
  ├─ If used_in_strategy = N → row is valid, skip remaining checks
  │
  ├─ If schema doesn't have part_of_call_interface → skip detailed checks
  │    (This is the hasFullSchema gate — prevents false errors on simple data)
  │
  ├─ CHECK 2: field_name must not be empty
  │
  ├─ CHECK 3: data_block_category must not be empty
  │
  ├─ CHECK 4: part_of_call_interface must be Y or N
  │
  ├─ If part_of_call_interface = Y:
  │    ├─ CHECK 5: field_type must be one of 8 valid types
  │    ├─ CHECK 6: field_direction must be inout/input/output
  │    ├─ CHECK 7: mandatory_presence_in_input must be Y or N
  │    └─ CHECK 8: Cannot have direction=output AND mandatory=Y
  │
  └─ If part_of_call_interface = N:
       └─ CHECK 9: mandatory_presence_in_input cannot be Y
```

**Helper functions inside validateJson:**
- `norm(v)` — normalizes any value to lowercase trimmed string (null-safe)
- `toYN(v)` — converts true/false/y/n to canonical 'y' or 'n'

**The `hasFullSchema` gate:** The sample data file `variable_config_extended.json`
does NOT have a `part_of_call_interface` field. If no row has this field, detailed
checks 4–9 are skipped. This prevents the validator from throwing errors on data
that simply doesn't use those fields.

**Field name aliases:** The validator supports both naming conventions:
- `field_data_block_category` OR `data_block_category`
- `field_type` OR `datatype`
- `mandatory_presence_in_input` OR `mandatory_in_input`
- `field_name` OR `_key` (the synthetic key column)

---

## 4.5 `webview-src/main.jsx`

### Module-level execution
- **Line 6:** `import './utils/themeHelper'` — this is a **side-effect import**.
  Simply importing the file causes it to execute, which injects the CSS `<style>`
  element into the page `<head>`.
- **Lines 8-9:** Creates a React root on `#root` and renders `<SpreadsheetEditor>`.
- **Why it's minimal:** The entry point should only do two things: inject styles
  and mount the app. All logic lives in components and hooks.

---

## 4.6 `webview-src/components/SpreadsheetEditor.jsx`

### Constants

#### `TOOLBAR_ITEMS` (array of strings)
- **Purpose:** Controls which toolbar buttons FortuneSheet shows
- **Logic:** A curated list of FortuneSheet toolbar item keys. Items separated by
  `'|'` are visual dividers. Includes formatting, alignment, formulas, search, etc.
- **Note:** `'currency-format'` was removed and `'search'` was added in its place.

### Component: `SpreadsheetEditor`

#### State variables

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| `sheetData` | Array/null | `null` | FortuneSheet data (null = loading) |
| `error` | string/null | `null` | Error message (null = no error) |
| `validationErrors` | Array | `[]` | List of validation errors for the banner |
| `version` | number | `0` | Used as React `key` to force Workbook remount |

#### Refs

| Ref | Purpose |
|-----|---------|
| `versionRef` | Mutable version counter (synced to `version` state) |
| `headersRef` | Stores column headers from the last loadData |
| `skipNextChangeRef` | When true, ignore the next onChange (it's from a mount) |
| `loadTimeRef` | Timestamp of last data load (ignore onChange within 1 second) |

#### `useVscodeMessaging({ onLoadData, onValidationErrors })` hook usage

**`onLoadData` handler:**
1. If error → show error, clear sheet data
2. Store headers in ref
3. Set `skipNextChangeRef = true` (next onChange is from mount)
4. Record `loadTimeRef = Date.now()`
5. Bump version (forces Workbook remount)
6. Set sheetData → triggers render
7. Clear errors (fresh data = no errors yet)

**`onValidationErrors` handler:**
1. Simply updates the `validationErrors` state from the message

#### `handleChange(data)` callback
- **Called by:** FortuneSheet's `onChange` prop
- **Guard 1:** Skip if `skipNextChangeRef.current` is true (mount-time onChange)
- **Guard 2:** Skip if within 1 second of last load (FortuneSheet fires multiple)
- **Guard 3:** Skip if data is empty/null
- **Core logic:**
  1. Get the first sheet's `.data` (2-D array of cell objects)
  2. Extract plain values: for each cell, take `.v` (or `.m` fallback, or null)
  3. Send `{ type: 'edit', values }` to extension
- **Why extract values:** FortuneSheet's internal cell objects contain styling,
  formatting, and metadata. The extension only needs the raw values.

#### Render logic (JSX)

Three states:
1. **Error:** Red error message
2. **Loading:** "Loading spreadsheet…" text
3. **Normal:** Error banner (if errors) + FortuneSheet Workbook

**Error banner:**
- Only shown when `validationErrors.length > 0`
- Uses VS Code CSS variables for colors (theme-aware)
- Shows each error: **Row N** (key) → `field_name`: message
- Row number = `err.row + 2` (err.row is 0-based, +1 for 1-based, +1 for header row)
- Max height 120px with overflow scroll (doesn't push sheet off screen)

**Workbook props:**
| Prop | Value | Why |
|------|-------|-----|
| `key={version}` | Forces remount when data changes externally |
| `data={sheetData}` | The FortuneSheet cell data |
| `onChange={handleChange}` | Cell edit callback |
| `showToolbar={true}` | Show the formatting toolbar |
| `showFormulaBar={true}` | Show the formula/cell reference bar |
| `showSheetTabs={false}` | Hide sheet tabs (we only use one sheet) |
| `allowEdit={true}` | Cells are editable |
| `toolbarItems={TOOLBAR_ITEMS}` | Customized toolbar layout |

---

## 4.7 `webview-src/hooks/useVscodeMessaging.js`

### Module-level: `const vscode = acquireVsCodeApi()`
- **Purpose:** Gets the VS Code API handle for the webview
- **Constraint:** `acquireVsCodeApi()` can only be called ONCE per webview lifecycle.
  Calling it twice throws an error. That's why it's at module level, not inside a hook.

### `useVscodeMessaging({ onLoadData, onValidationErrors })` → `{ postMessage }`

**Parameters:** Object with two callback functions.

**Logic:**
1. Stores handlers in a `useRef` (prevents useEffect from re-subscribing on re-render)
2. `useEffect` (runs once on mount):
   - Adds `window.addEventListener('message', handler)`
   - Handler inspects `msg.type` and dispatches to the appropriate callback
   - Sends `{ type: 'ready' }` to tell the extension we're ready for data
   - Returns cleanup function that removes the event listener
3. Returns `{ postMessage }` — a stable callback that wraps `vscode.postMessage`

**Why a custom hook:** Separates messaging concerns from UI rendering. The
SpreadsheetEditor component doesn't need to know about `window.addEventListener`
or `acquireVsCodeApi()`.

---

## 4.8 `webview-src/utils/themeHelper.js`

### Module-level execution (side-effect module)
- **Purpose:** When imported, immediately injects a `<style>` element into the page
- **No exports** — importing this file IS the action

### CSS variable aliases (top of file)

| Constant | VS Code Variable | Fallback | Used For |
|----------|-----------------|----------|----------|
| `FG` | `--vscode-editor-foreground` | (none) | General text |
| `BG` | `--vscode-editor-background` | (none) | Main backgrounds |
| `INP_BG` | `--vscode-input-background` | editor bg | Input fields |
| `INP_FG` | `--vscode-input-foreground` | editor fg | Input text |
| `DD_BG` | `--vscode-dropdown-background` | editor bg | Dropdown menus |
| `DD_FG` | `--vscode-dropdown-foreground` | editor fg | Dropdown text |
| `BORDER` | `--vscode-editorWidget-border` | `#555` | Borders |
| `HOVER` | `--vscode-list-hoverBackground` | rgba gray | Hover state |
| `FOCUS` | `--vscode-focusBorder` | `#007fd4` | Focus outlines |
| `BTN_BG` | `--vscode-button-background` | `#0e639c` | Button backgrounds |
| `BTN_FG` | `--vscode-button-foreground` | `#fff` | Button text |
| `HDR_BG` | `--vscode-editorGroupHeader-tabsBackground` | sidebar bg / editor bg | Toolbar/tab backgrounds |

### CSS sections (19 total)

| # | Section | What It Styles | Key Classes |
|---|---------|---------------|-------------|
| 1 | Base Container | Main sheet wrapper | `.fortune-sheet-container` |
| 2 | Headers | **INTENTIONALLY EMPTY** — canvas text | (none — see explanation) |
| 3 | Toolbar | Top formatting bar, buttons, icons | `.fortune-toolbar`, `.fortune-toolbar-button`, `.fortune-toolbar-combo` |
| 3b | Toolbar Dropdowns | Font size, format lists | `.fortune-toolbar-select`, `.fortune-toolbar-combo-popup` |
| 3c | Color Picker | Font/background color picker | `.fortune-toolbar-color-picker` |
| 4 | Formula Bar | Cell reference box and formula input | `.fortune-fx-editor`, `.fortune-name-box` |
| 5 | Cell Input | Active cell editing area | `.luckysheet-input-box`, `.luckysheet-cell-input` |
| 6 | Selection | Cell selection border | `.luckysheet-cell-selected` |
| 7 | Scrollbars | Scroll track and thumb | `.luckysheet-scrollbar`, `.luckysheet-scrollbars` |
| 8 | Context Menu | Right-click and column menus | `.luckysheet-cols-menu`, `.luckysheet-cols-menuitem` |
| 9 | Filter Panel | Data filter UI | `.luckysheet-filter-byvalue`, `.fortune-sort` |
| 10 | Dialogs | Modal dialog boxes | `.luckysheet-modal-dialog`, `.fortune-dialog` |
| 11 | Search/Replace | Find and replace dialog | `.fortune-search-replace` |
| 12 | Sort Modal | Sort configuration | `.fortune-sort-modal` |
| 13 | Zoom Menu | Zoom percentage selector | `.fortune-zoom-ratio-menu` |
| 14 | Data Panels | Verification, links, split column | `.fortune-data-verification`, `.fortune-link-modify-modal` |
| 15 | Sheet Tabs | Bottom tab bar and stats | `.luckysheet-sheet-area`, `.fortune-sheettab-container` |
| 16 | Border Picker | Border style selector | `.fortune-boder-style-picker` |
| 17 | Formula Help | Formula autocomplete panels | `[class*="luckysheet-formula-help"]` |
| 18 | Backdrop | Popover backdrop overlay | `.fortune-popover-backdrop` |
| 19 | Global Fallback | Native `<select>` elements | `select`, `select option` |

**Pattern used throughout:**
```css
.some-container {
  background: ${DD_BG} !important;     /* Override hardcoded white */
  color: ${DD_FG} !important;           /* Override hardcoded black */
  border: 1px solid ${BORDER} !important;
}
.some-container * {                     /* Deep override for ALL children */
  color: ${DD_FG} !important;
}
```

The `* { color }` pattern is needed because FortuneSheet sometimes applies inline
styles or deeply nested class-specific colors that wouldn't be caught by just
styling the container.

---

## 4.9 `webpack.config.js`

**Purpose:** Tells webpack how to bundle `webview-src/` into `dist/webview/bundle.js`.

**Key configuration:**
- **Entry:** `./webview-src/main.jsx`
- **Output:** `dist/webview/bundle.js`
- **JSX handling:** babel-loader with `@babel/preset-env` + `@babel/preset-react`
- **CSS handling:** style-loader (injects into DOM) + css-loader (resolves imports)
- **Performance:** Warnings disabled, asset size limit raised to 5MB (FortuneSheet
  is a large library)

---

## 4.10 `setup.js`

**Purpose:** One-time project scaffolding script.
**Logic:** Creates the directory structure (`src/`, `webview-src/`, `dist/webview/`).
**When to run:** Only once, during initial project setup. Not used afterward.
**Note:** Listed in `.gitignore` — not committed to source control.

---

## 4.11 `variable_config_extended.json`

**Purpose:** Sample data file for testing the editor.
**Structure:** Object-of-objects. Each key is a variable name (e.g.,
`sgh_pil_tg003_out_3_mock_var_01`). Each value has fields like:
`data_block_name`, `data_block_category`, `datatype`, `used_in_strategy`, etc.

**Important:** This file does NOT have `part_of_call_interface` or `field_direction`
fields. Therefore, the `hasFullSchema` gate in the validator skips checks 4–9.
Only check 1 (`used_in_strategy` must be Y/N) applies to this data.

---

# FAQ — Common Questions Answered

### Q: Why is it called "LuckySheet" in some class names?

**FortuneSheet is a fork of LuckySheet.** LuckySheet was an open-source spreadsheet
project. FortuneSheet forked it and rewrote parts in TypeScript/React. During the
fork, most CSS class names were renamed from `luckysheet-*` to `fortune-*`, but
**not all of them**. The FortuneSheet v1.0.4 npm package still ships with both
naming conventions in its CSS and JavaScript.

Every `luckysheet-*` class name in `themeHelper.js` was verified to exist in the
FortuneSheet bundle at `node_modules/@fortune-sheet/react/dist/index.js`. They are
NOT dead code.

### Q: Why can't we change individual cell colors (red for errors)?

FortuneSheet renders ALL cell content on an HTML `<canvas>` element. Canvas is a
pixel-based drawing surface — CSS cannot affect what's drawn on it. The only way
to change cell appearance is:
1. Set `fc` (font color) or `bg` (background) in the cell data object
2. Force a Workbook remount (change the `key` prop)

But remounting destroys the user's editing state (cursor position, active cell,
unsaved typing). This was attempted twice and reverted both times.

See `CELL_COLOR_EXPERIMENTS.md` for approaches to experiment with in the future.

### Q: Why does row number show +2 instead of +1?

In the error banner, we show `err.row + 2`. Here's why:
- `err.row` is a 0-based index into the data array
- In the spreadsheet, row 0 is the header row (column names)
- So data index 0 → spreadsheet row 1 (0-based) → row 2 (1-based)
- The user sees 1-based row numbers in the spreadsheet gutter

### Q: What happens when I Ctrl+S with errors?

The file saves successfully, but ONLY valid rows are in the file. Invalid rows were
silently kept at their last-known-good values (from `lastValidJson`). A VS Code
warning notification reminds you that some rows weren't saved.

### Q: Why does FortuneSheet fire onChange on mount?

This is a known FortuneSheet behavior. When the `<Workbook>` component mounts and
processes the initial `data` prop, it fires an `onChange` event as if the user
edited something. This is handled by `skipNextChangeRef` (skip the first onChange)
and `loadTimeRef` (skip any onChange within 1 second of loading).

### Q: Can headers (A,B,C and 1,2,3) be styled for dark mode?

Not via CSS. Headers are drawn with `ctx.fillText()` on a `<canvas>` element using
hardcoded colors in FortuneSheet's source code. The only way to change them would
be to modify FortuneSheet's source code itself (in `node_modules`), which would be
lost on every `npm install`.

### Q: Why are there two separate build systems?

- **Extension host code** (`src/`): Runs directly in Node.js. No build step needed.
  VS Code loads `src/extension.js` as-is (it's CommonJS with `require()`).
- **Webview code** (`webview-src/`): Uses React JSX, which browsers don't understand.
  Webpack + Babel compiles JSX → plain JS and bundles everything into one file.

Only the webview code needs `npx webpack --mode production`. Extension code changes
take effect immediately on reload.
