# JSON Editor Provider Performance Findings

## 1. Short answer

Your suspicion is **partly true**.

- **Yes:** expensive work is tied to edits, and it can become slow for large JSON files.
- **No:** the current code does **not** fully reload the workbook from VS Code on every normal spreadsheet edit.
- **No:** the main problem is **not** React `useEffect`.

The real issue is:

1. FortuneSheet fires `onChange`
2. `SpreadsheetEditor` walks the **entire sheet**
3. `jsonEditorProvider` rebuilds the **entire JSON**
4. the validator scans the **entire JSON**
5. the provider rewrites the **entire text document**

So the system is doing **full-data recomputation on edit**, even though it is **not doing a full workbook reload on each internal spreadsheet edit**.

---

## 2. What this project is trying to do

This extension opens a `.json` file as a spreadsheet inside a VS Code webview.

There are two runtime halves:

```text
VS Code extension host (Node.js)
    |
    |  owns the real JSON TextDocument
    v
jsonEditorProvider.js
    |
    |  postMessage
    v
Webview (React + FortuneSheet)
    |
    |  renders spreadsheet UI
    v
SpreadsheetEditor.jsx
```

Main responsibilities:

- `src\jsonEditorProvider.js`
  - loads JSON from the VS Code document
  - converts JSON -> sheet data
  - receives edits from the webview
  - validates data
  - writes updates back to the JSON document
- `src\jsonConverter.js`
  - converts between JSON and spreadsheet shape
- `src\jsonValidator.js`
  - runs business-rule validation
- `webview-src\components\SpreadsheetEditor.jsx`
  - renders FortuneSheet
  - sends edit messages back to the extension
- `webview-src\hooks\useVscodeMessaging.js`
  - sends `ready`
  - receives `loadData` and `validationErrors`

---

## 3. Is `useEffect` the problem?

### Beginner answer

No, not really.

The `useEffect` in `webview-src\hooks\useVscodeMessaging.js` runs once when the component mounts. It:

- adds a `message` listener
- sends `{ type: 'ready' }` once

That is **not** the thing causing repeated heavy work.

### What actually causes the repeated heavy work

The heavy path is this:

```text
Workbook onChange
    -> SpreadsheetEditor.handleChange()
    -> build full 2-D values array
    -> postMessage({ type: 'edit', values })
    -> jsonEditorProvider case 'edit'
    -> sheetDataToJson(values, ...)
    -> validateJson(json, ...)
    -> JSON.stringify(...)
    -> applyEdit(full document replace)
```

Relevant files:

- `webview-src\components\SpreadsheetEditor.jsx`
  - `handleChange`
- `src\jsonEditorProvider.js`
  - `case 'edit'`
- `src\jsonConverter.js`
  - `sheetDataToJson`
- `src\jsonValidator.js`
  - `validateJson`

---

## 4. When do we actually load, validate, or rerender?

## Case A: opening the file

### What happens

When the webview says `ready`, `jsonEditorProvider.js` calls `loadDocument()`.

That does:

1. `document.getText()`
2. `JSON.parse(text)`
3. `jsonToSheetData(json)`
4. `webview.postMessage({ type: 'loadData', ... })`

Then the webview does:

1. `setSheetData(...)`
2. `versionRef.current += 1`
3. `<Workbook key={version} ... />`

That `key={version}` forces a **full Workbook remount**.

### Cost

This is expensive, but it is expected on first load.

### Important note

The validator is **not** run in `loadDocument()`.

---

## Case B: editing a spreadsheet cell inside the custom editor

### What happens

This is the most important path.

When a user edits a cell:

1. FortuneSheet calls `onChange`
2. `SpreadsheetEditor.handleChange()` loops over `sheet.data`
3. it builds a new `values` 2-D array for the **whole sheet**
4. it sends `{ type: 'edit', values }`
5. `jsonEditorProvider` converts the **whole sheet** back to JSON
6. `validateJson` validates the **whole JSON**
7. the provider stringifies JSON
8. the provider applies a **full document replace**
9. the provider sends `validationErrors` back to the webview

### What does **not** happen here

On a normal spreadsheet edit, your code does **not** call `loadDocument()`, and it does **not** remount the Workbook.

That means:

- **not a full workbook reload**
- **yes a full data recomputation**

### So are you right?

Yes, in the performance sense.

No, in the exact "full sheet reload every keypress" sense.

More accurate wording:

> We are not reloading the sheet from scratch on each internal cell edit, but we are rebuilding and revalidating the whole dataset on each edit event.

---

## Case C: external document change, undo/redo, or another editor changes the file

### What happens

`src\jsonEditorProvider.js` listens to `onDidChangeTextDocument`.

If the change was **not** caused by its own `applyEdit`, it calls `loadDocument()` again.

That means:

1. parse the full document again
2. convert the full JSON again
3. send `loadData` again
4. bump `version`
5. remount the entire Workbook again

### This is a true full reload

So for:

- undo / redo
- raw text editor edits
- outside changes

the editor **does** reload the whole sheet.

---

## Case D: validation error updates

### What happens

After edit processing, the extension sends:

```js
{ type: 'validationErrors', errors, headers }
```

The webview only does:

```js
setValidationErrors(msg.errors || [])
```

This causes a React rerender of the banner area, but compared to full JSON conversion/stringify, that is a small cost.

---

## Case E: theme change

This is cheap.

`themeHelper.js` is just CSS overrides. Theme changes are not the main performance problem here.

---

## 5. The expensive parts in the current code

## A. Full-sheet extraction in the webview

File: `webview-src\components\SpreadsheetEditor.jsx`

`handleChange()` loops through `sheet.data` and creates a full `values` matrix.

Why this is costly:

- for large sheets, this touches many rows and columns
- it happens before the data even leaves the webview
- if `onChange` fires often, this alone becomes expensive

---

## B. Full JSON reconstruction on every edit

File: `src\jsonConverter.js`

`sheetDataToJson(values, ...)` rebuilds the entire JSON structure from the full 2-D array.

Why this is costly:

- loops through all rows
- loops through all headers
- casts every cell using `castValue`
- may try `JSON.parse` for object/array typed cells

This is one of the biggest costs.

---

## C. Full validation on every edit

File: `src\jsonValidator.js`

`validateJson(json, structure)` scans all rows every time it is called.

Why this matters:

- for large files, even a single-cell change triggers a full validation pass
- the validation is mostly row-based, so this is more work than necessary

Important observation:

The validator logic is mostly **row-local**. That means future incremental validation is realistic.

---

## D. Full JSON stringify and full document replace

File: `src\jsonEditorProvider.js`

Current edit flow does:

- `const newText = JSON.stringify(json, null, 4)`
- later `const saveText = JSON.stringify(jsonToSave, null, 4)`
- then full-document replace via `WorkspaceEdit`

Why this matters:

- large JSON files mean large string allocations
- the code may stringify twice
- `applyEdit` replaces the entire file text, not only the changed row

Even when the workbook is not remounted, this can still feel slow.

---

## E. Full remount on real reloads

File: `webview-src\components\SpreadsheetEditor.jsx`

This line matters:

```jsx
<Workbook key={version} ... />
```

And this line triggers it:

```jsx
versionRef.current += 1;
setVersion(versionRef.current);
```

This is appropriate when the full underlying dataset changed externally, but it is expensive for very large sheets.

---

## 6. Visual summary

## Current flow on normal spreadsheet edit

```text
User edits one cell
    |
    v
FortuneSheet onChange
    |
    v
Extract full sheet into values[][]
    |
    v
Send full values[][] to extension
    |
    v
Rebuild full JSON
    |
    v
Validate full JSON
    |
    v
Stringify full JSON
    |
    v
Replace full document text
    |
    v
Send validation banner update back
```

## Current flow on external file change

```text
Text document changed externally
    |
    v
loadDocument()
    |
    v
Parse full JSON
    |
    v
Convert full JSON -> sheetData
    |
    v
Send loadData
    |
    v
Increment version
    |
    v
Remount Workbook
```

---

## 7. Best way to think about the bug

The core issue is **not**:

> "React is rerendering too much."

The core issue is:

> "The extension treats a small edit like a whole-document synchronization job."

That is why the slowdown risk grows sharply with 10,000+ rows.

---

## 8. Safest optimization strategy

This should be fixed in phases, from safest to most advanced.

## Phase 0 - add measurements first

Before changing behavior, measure where time is going.

Add timing around:

- webview value extraction
- `sheetDataToJson`
- `validateJson`
- `JSON.stringify`
- `applyEdit`
- `loadDocument`
- workbook mount / reload count

Suggested instrumentation:

```js
const start = performance.now();
// work
console.log('sheetDataToJson ms', performance.now() - start);
```

Do this both in the webview and in the extension host.

Why this matters:

- it confirms the biggest bottleneck
- it prevents optimizing the wrong step
- it gives you before/after proof

---

## Phase 1 - debounce before doing expensive full-sheet work

### Recommendation

The first safe fix should be **debouncing the edit pipeline**.

### Best place to debounce

Prefer debouncing in `SpreadsheetEditor.handleChange()` **before** walking the whole sheet.

Why this is better than only debouncing in the provider:

- it avoids repeated full `values` extraction
- it avoids repeated large `postMessage` payloads
- it reduces extension-side work too

### Example idea

```text
onChange fires many times
    -> keep only the latest pending edit
    -> after 250ms to 400ms of idle time
    -> extract values once
    -> send one edit message
```

### Benefit

This is the lowest-risk performance win.

### Risk

Low, if:

- delay is small
- pending edits are flushed when needed

### Important caution

If you debounce, think about these cases:

- editor loses focus
- file saves
- panel closes

A pending edit should be flushed first so data is not lost.

---

## Phase 1.5 - remove easy waste in the current provider code

There are a few low-risk cleanups:

### A. Avoid double stringify when there are no validation errors

Today the code builds `newText`, then later builds `saveText`.

When there are no errors:

```text
saveText === newText
```

So one stringify can be reused.

### B. Cache schema-level checks

The validator computes whether the schema has `part_of_call_interface`.

That is essentially schema metadata and can be derived once from headers / structure instead of rediscovering it every edit.

### C. Replace the 1-second time gate with a more deterministic guard

Current code ignores all `onChange` events for 1 second after load.

That is a crude protection against FortuneSheet init noise, but it can also suppress legitimate fast edits right after load.

This is more of a correctness/UX improvement than a raw performance improvement.

---

## Phase 2 - switch from full-sheet sync to row-level or cell-level sync

This is where the big long-term win is.

### Key finding

The installed FortuneSheet React package exposes more than `onChange`.

From:

- `node_modules\@fortune-sheet\react\dist\components\Workbook\index.d.ts`

the component supports:

- `onChange?: (data: SheetType[]) => void`
- `onOp?: (op: Op[]) => void`

It also exposes imperative APIs such as:

- `applyOp`
- `updateSheet`
- `getCellValue`
- `setCellValue`

### Why this matters

`onOp` strongly suggests the library can report **operation deltas**, not only the full sheet snapshot.

That opens a better architecture:

```text
cell changes
    -> webview sends small delta
    -> extension updates only affected row in memory
    -> extension validates only affected row
    -> extension reserializes only when needed
```

### Why this is likely safe enough to pursue

Your validator is mostly row-local:

- each row is checked against fields on the same row
- there is no obvious whole-dataset cross-reference validation

So incremental row validation is realistic.

### What to verify before implementing

You still need to inspect actual `onOp` payloads at runtime because the type file alone does not tell you the exact edit path shape for every action.

---

## Phase 3 - keep an in-memory JSON model instead of rebuilding from scratch

After delta events are understood, the provider can maintain:

- current JSON object
- row index -> row key mapping
- validation errors by row
- last saved text

Then a single-cell edit can become:

```text
receive changed cell
    -> map cell to row + field
    -> cast only that value
    -> update one row in current JSON
    -> validate one row
    -> rebuild text once
    -> save
```

This is much more scalable than rebuilding the whole dataset every time.

### Risk

Medium.

The main complexity is handling:

- inserted rows
- deleted rows
- `_key` edits in object-of-objects mode
- pasted ranges
- undo/redo

Because of that, a sensible implementation usually keeps a fallback:

- if operation is simple -> incremental path
- if operation is complex or ambiguous -> full rebuild path

That gives safety without giving up performance for the common case.

---

## 9. Should we stop remounting Workbook?

### Short answer

Not as the first fix.

### Why

The biggest everyday pain is the edit pipeline, not the initial open.

Normal spreadsheet edits currently do **not** remount the Workbook anyway.

The remount issue matters mainly for:

- external text edits
- undo/redo
- other document-originated reloads

### Recommendation

Treat Workbook remount optimization as a later phase.

Possible future direction:

- remount only when the structure really changed
- otherwise use FortuneSheet's imperative APIs (`updateSheet`, possibly `applyOp`)

But that is more coupled to FortuneSheet internals, so it is not the first thing to change.

---

## 10. Recommended implementation order

If the goal is: **better performance without breaking existing behavior**, this is the order I recommend.

### Step 1

Add instrumentation and measure:

- edit event frequency
- extraction time
- conversion time
- validation time
- stringify time
- applyEdit time

### Step 2

Debounce edit handling in the webview before full extraction.

### Step 3

Add a second small safety debounce or coalescing layer in the provider if needed.

### Step 4

Remove low-risk waste:

- reuse stringified text when possible
- cache schema flags
- improve the post-load synthetic-change guard

### Step 5

Prototype delta-based sync using `onOp`.

### Step 6

Once delta sync is stable, move validation and save logic to row-level updates.

### Step 7

Only after that, investigate reducing Workbook remounts on external reloads.

---

## 11. Final recommendation

If I had to choose the safest proper fix path, I would do this:

```text
1. Measure
2. Debounce in the webview
3. Remove easy waste in provider
4. Explore onOp-based delta sync
5. Implement row-level validation + save
6. Keep full rebuild as fallback for complex edits
```

That gives:

- immediate performance improvement
- low breakage risk
- a clear path to handling 10,000+ row files much better

---

## 12. Plain-English conclusion

You were correct to worry about performance.

The code is **not** doing a full workbook reload on every normal spreadsheet edit, and `useEffect` is **not** the main problem.

But the current edit pipeline still behaves like this:

> one small cell change -> full-sheet extraction -> full JSON rebuild -> full validation -> full document rewrite

That is the real scalability problem, and it should be fixed by moving from **whole-sheet sync** toward **debounced and eventually incremental sync**.
