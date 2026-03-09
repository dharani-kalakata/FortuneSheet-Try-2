# Theme, Validation, and Messaging Notes

## 1. If you want `themeHelper.js` to stay in the codebase but stop applying

You do not need to delete `webview-src/utils/themeHelper.js`.

The file is applied only because it is imported for its side effects in:

- `webview-src/main.jsx:6`

Current import:

```jsx
import './utils/themeHelper';
```

If you want FortuneSheet to use its default styling again, remove or comment out only that import line.

Example:

```jsx
// import './utils/themeHelper';
```

Important:

- `themeHelper.js` is a side-effect file. It does not export anything. It immediately injects a `<style>` tag into the page when imported.
- After removing that import, you must rebuild the webview bundle. The currently generated bundle already contains the theme helper code.

Relevant files:

- `webview-src/main.jsx:6`
- `webview-src/utils/themeHelper.js`
- `dist/webview/bundle.js`

Typical rebuild command:

```bash
npm run build:webview
```

If you want to keep the option to turn it on and off later, a cleaner approach is:

```jsx
if (false) {
	require('./utils/themeHelper');
}
```

But the simplest change is still removing the import from `webview-src/main.jsx:6`.

## 2. Where the validation banner is currently shown

The banner is rendered in:

- `webview-src/components/SpreadsheetEditor.jsx:143`
- `webview-src/components/SpreadsheetEditor.jsx:144`

The page container is:

- `webview-src/components/SpreadsheetEditor.jsx:142`

Current structure:

```jsx
<div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
	{validationErrors.length > 0 && (...banner...)}

	<div style={{ flex: 1, minHeight: 0 }}>
		<Workbook ... />
	</div>
</div>
```

Because the banner is rendered before the spreadsheet area, it appears at the top.

## 3. How to move the validation banner to the bottom

The easiest fix is to render the workbook first and the banner second.

Change the return block in `webview-src/components/SpreadsheetEditor.jsx` from:

```jsx
<div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
	{validationErrors.length > 0 && (...banner...)}

	<div style={{ flex: 1, minHeight: 0 }}>
		<Workbook ... />
	</div>
</div>
```

to:

```jsx
<div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
	<div style={{ flex: 1, minHeight: 0 }}>
		<Workbook
			key={version}
			data={sheetData}
			onChange={handleChange}
			showToolbar={true}
			showFormulaBar={true}
			showSheetTabs={false}
			allowEdit={true}
			toolbarItems={TOOLBAR_ITEMS}
		/>
	</div>

	{validationErrors.length > 0 && (
		<div style={{
			padding: '8px 16px',
			background: 'var(--vscode-inputValidation-errorBackground, #5a1d1d)',
			color: 'var(--vscode-errorForeground, #f48771)',
			borderTop: '2px solid var(--vscode-inputValidation-errorBorder, #be1100)',
			fontSize: 13,
			flexShrink: 0,
			maxHeight: 120,
			overflowY: 'auto',
		}}>
			<div style={{ fontWeight: 'bold', marginBottom: 4 }}>
				{validationErrors.length} validation error(s) - invalid rows were NOT saved:
			</div>

			{validationErrors.map((err, i) => (
				<div
					key={i}
					style={{
						padding: '2px 0',
						borderLeft: '3px solid var(--vscode-inputValidation-errorBorder, #ff4444)',
						paddingLeft: 8,
						marginBottom: 2,
					}}
				>
					<strong>Row {err.row + 2}</strong> ({err.key})
					{err.field && <><code>{err.field}</code></>}: {err.message}
				</div>
			))}
		</div>
	)}
</div>
```

Notes:

- Use `borderTop` instead of `borderBottom` for a bottom docked banner.
- Keep `flexShrink: 0` so the banner does not collapse.
- Keep the workbook wrapper as `flex: 1, minHeight: 0` so the sheet uses the remaining space.

If you want the banner to always stay visible while the sheet scrolls behind it, you can also make it sticky:

```jsx
position: 'sticky',
bottom: 0,
zIndex: 20,
```

That is optional. In your current layout, simply moving it after the workbook is enough for a bottom panel effect.

## 4. Where validation errors come from

Validation happens in the extension, not in the React component.

Flow:

1. The webview collects edited cell values and sends them to the extension.
2. The extension rebuilds JSON.
3. The extension validates the JSON.
4. The extension sends `validationErrors` back to the webview.
5. The webview stores those errors in React state and renders the banner.

Relevant files:

- `webview-src/components/SpreadsheetEditor.jsx:108`
- `src/jsonEditorProvider.js:96`
- `src/jsonEditorProvider.js:121`
- `src/jsonValidator.js`

Important lines:

- `webview-src/components/SpreadsheetEditor.jsx:108` sends edits:

```jsx
postMessage({ type: 'edit', values });
```

- `src/jsonEditorProvider.js:96` receives the message from the webview.
- `src/jsonEditorProvider.js:121` posts `validationErrors` back to the webview.
- `webview-src/components/SpreadsheetEditor.jsx:61` stores those errors in state.

## 5. How to mark the invalid cell with red tint or border

Right now your code only shows a banner. It does not decorate cells.

To decorate invalid cells, you need to take the current `sheetData` and apply visual styles to the exact cell that failed validation.

You already have most of what you need:

- `validationErrors` tells you the row and field.
- `headersRef.current` tells you which column index belongs to that field.
- FortuneSheet cells support background color with `bg`.
- FortuneSheet sheet config supports borders through `config.borderInfo`.

Relevant references:

- `webview-src/components/SpreadsheetEditor.jsx:61`
- `src/jsonConverter.js:96`
- `node_modules/@fortune-sheet/core/dist/types.d.ts:25`
- `node_modules/@fortune-sheet/core/dist/types.d.ts:41`
- `node_modules/@fortune-sheet/core/dist/types.d.ts:111`

### 5.1 Red tint approach

This is the easiest option.

FortuneSheet cell objects support:

```ts
bg?: string;
fc?: string;
```

So you can clone `sheetData`, locate the matching cell, and set:

```js
cell.v.bg = '#ffe5e5';
cell.v.fc = '#8b0000';
```

Suggested approach inside `SpreadsheetEditor.jsx`:

```jsx
import React, { useState, useCallback, useRef, useMemo } from 'react';

const decoratedSheetData = useMemo(() => {
	if (!sheetData) return sheetData;

	const next = JSON.parse(JSON.stringify(sheetData));
	const sheet = next[0];
	const headers = headersRef.current || [];
	const errorMap = new Map();

	for (const err of validationErrors) {
		if (!err.field) continue;
		const colIndex = headers.indexOf(err.field);
		if (colIndex === -1) continue;

		// +1 because row 0 is the header row in FortuneSheet data.
		const rowIndex = err.row + 1;
		errorMap.set(`${rowIndex}_${colIndex}`, true);
	}

	for (const cell of sheet.celldata || []) {
		if (!cell?.v) continue;

		if (errorMap.has(`${cell.r}_${cell.c}`)) {
			cell.v.bg = '#ffe5e5';
			cell.v.fc = '#8b0000';
		}
	}

	return next;
}, [sheetData, validationErrors]);
```

Then pass this to the workbook instead of `sheetData`:

```jsx
<Workbook data={decoratedSheetData} ... />
```

### 5.2 Border approach

If you want a red border instead of a fill tint, use `sheet.config.borderInfo`.

FortuneSheet uses border entries shaped like this:

```js
{
	rangeType: 'cell',
	value: {
		row_index: 4,
		col_index: 2,
		l: { style: '1', color: '#ff4d4f' },
		r: { style: '1', color: '#ff4d4f' },
		t: { style: '1', color: '#ff4d4f' },
		b: { style: '1', color: '#ff4d4f' },
	},
}
```

So inside the same `useMemo`, you can add:

```jsx
sheet.config = sheet.config || {};
sheet.config.borderInfo = [];

for (const err of validationErrors) {
	if (!err.field) continue;

	const colIndex = headers.indexOf(err.field);
	if (colIndex === -1) continue;

	const rowIndex = err.row + 1;

	sheet.config.borderInfo.push({
		rangeType: 'cell',
		value: {
			row_index: rowIndex,
			col_index: colIndex,
			l: { style: '1', color: '#ff4d4f' },
			r: { style: '1', color: '#ff4d4f' },
			t: { style: '1', color: '#ff4d4f' },
			b: { style: '1', color: '#ff4d4f' },
		},
	});
}
```

### 5.3 Best recommendation

Use both together:

- light red tint for quick scanning
- red border for precise focus

That usually feels clearer than using only one.

### 5.4 Important row/column mapping note

In your validation errors:

- `err.row` is zero-based for the JSON rows

In FortuneSheet:

- row `0` is the header row
- actual data starts at row `1`

So the visual sheet row is:

```js
const rowIndex = err.row + 1;
```

Your banner displays `err.row + 2` because it is showing a human-readable row number including the header offset.

## 6. What `useVscodeMessaging.js` does

File:

- `webview-src/hooks/useVscodeMessaging.js`

This file is the bridge between the React webview and the VS Code extension host.

It does four jobs:

1. It gets the VS Code webview API once with `acquireVsCodeApi()`.
2. It listens for messages coming from the extension with `window.addEventListener('message', ...)`.
3. It sends a `ready` message when the webview loads so the extension knows it can send initial data.
4. It returns a `postMessage` function so React components can send messages like `edit` back to the extension.

Relevant lines:

- `webview-src/hooks/useVscodeMessaging.js:4`
- `webview-src/hooks/useVscodeMessaging.js:14`
- `webview-src/hooks/useVscodeMessaging.js:32`
- `webview-src/hooks/useVscodeMessaging.js:35`
- `webview-src/hooks/useVscodeMessaging.js:41`

## 7. Why `useVscodeMessaging.js` is necessary

Your webview and your extension do not share the same runtime.

- The React UI runs inside the webview.
- The custom editor logic runs in the extension host.

The only safe way for them to communicate is by posting messages back and forth.

Without `useVscodeMessaging.js`:

- the webview would not know when the extension has loaded JSON
- the extension would not receive spreadsheet edits
- validation errors would never come back to the React UI
- the editor would not synchronize correctly

You can see the other side of that bridge in:

- `src/jsonEditorProvider.js:96`

That is where the extension listens for webview messages.

And here:

- `src/jsonEditorProvider.js:79`
- `src/jsonEditorProvider.js:121`

That is where the extension sends messages back to the webview.

## 8. Short answer summary

If your goal is:

- Keep `themeHelper.js`, but stop applying it:
	Remove `import './utils/themeHelper';` from `webview-src/main.jsx:6`, then rebuild.

- Move validation banner to the bottom:
	Render the workbook first and the banner after it in `webview-src/components/SpreadsheetEditor.jsx`.

- Mark invalid cells visually:
	Decorate `sheetData` before passing it to `Workbook`, using `bg` for tint and `config.borderInfo` for borders.

- Understand `useVscodeMessaging.js`:
	It is the message bridge between the webview and the extension, and it is required for loading data, sending edits, and receiving validation errors.
