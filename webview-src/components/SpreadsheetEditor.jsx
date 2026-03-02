import React, { useState, useCallback, useRef } from 'react';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import useVscodeMessaging from '../hooks/useVscodeMessaging';

// Toolbar items — FortuneSheet accepts an array of item keys.
// We removed "currency-format" and placed "search" in its spot.
const TOOLBAR_ITEMS = [
  'undo', 'redo', 'search', '|', 'format-painter', 'clear-format', '|',
  'percentage-format', 'number-decrease', 'number-increase', 'format', '|',
  'font', '|',
  'font-size', '|',
  'bold', 'italic', 'strike-through', 'underline', '|',
  'font-color', 'background', 'border', 'merge-cell', '|',
  'horizontal-align', 'vertical-align', 'text-wrap', 'text-rotation', '|',
  'freeze', 'conditionFormat', 'filter', 'link', 'image', 'comment',
  'quick-formula', 'dataVerification', 'splitColumn', 'locationCondition',
  'screenshot',
];

/**
 * Main spreadsheet component.
 * Renders FortuneSheet and bridges it with the VS Code extension via postMessage.
 */
export default function SpreadsheetEditor() {
  const [sheetData, setSheetData] = useState(null);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Tracks the data version so we can use it as a React key
  // to force Workbook re-mount on external data changes (undo/redo).
  const versionRef = useRef(0);
  const [version, setVersion] = useState(0);

  const headersRef = useRef([]);

  // True right after we set new data from the extension.
  const skipNextChangeRef = useRef(true);

  // Timestamp of last data load — ignore onChange for a brief window after load
  const loadTimeRef = useRef(0);

  // ── Messaging with the extension ──
  const { postMessage } = useVscodeMessaging({
    onLoadData: (msg) => {
      if (msg.error) {
        setError(msg.error);
        setSheetData(null);
        return;
      }
      headersRef.current = msg.headers || [];
      skipNextChangeRef.current = true;
      loadTimeRef.current = Date.now();
      versionRef.current += 1;
      setVersion(versionRef.current);
      setSheetData(msg.sheetData);
      setError(null);
      setValidationErrors([]);
    },
    onValidationErrors: (msg) => {
      setValidationErrors(msg.errors || []);
    },
  });

  /**
   * Called by FortuneSheet whenever the sheet data changes.
   * Extracts a 2-D value grid and sends it to the extension.
   */
  const handleChange = useCallback(
    (data) => {
      // Skip the synthetic onChange fired on initial mount.
      // Also ignore any onChange within 1 second of a data load — FortuneSheet
      // may fire multiple onChange events during initialization.
      if (skipNextChangeRef.current) {
        skipNextChangeRef.current = false;
        return;
      }
      if (Date.now() - loadTimeRef.current < 1000) {
        return;
      }

      if (!data || data.length === 0) return;

      const sheet = data[0];
      const rawData = sheet.data; // 2-D array of cell objects

      if (!rawData) return;

      // Extract plain values from the 2-D cell array
      const values = [];
      for (let r = 0; r < rawData.length; r++) {
        const row = [];
        const srcRow = rawData[r] || [];
        for (let c = 0; c < srcRow.length; c++) {
          const cell = srcRow[c];
          if (cell == null) {
            row.push(null);
          } else if (typeof cell === 'object') {
            // Prefer .m (display string); fall back to .v (value)
            row.push(cell.v !== undefined && cell.v !== null ? cell.v : (cell.m ?? null));
          } else {
            row.push(cell);
          }
        }
        values.push(row);
      }

      postMessage({ type: 'edit', values });
    },
    [postMessage]
  );

  // ── Render ──

  if (error) {
    return (
      <div style={{
        padding: 24,
        color: 'var(--vscode-errorForeground, #f44)',
        fontFamily: 'var(--vscode-font-family)',
        fontSize: 14,
      }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!sheetData) {
    return (
      <div style={{
        padding: 24,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        fontSize: 14,
      }}>
        Loading spreadsheet…
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Validation error banner — uses VS Code theme variables */}
      {validationErrors.length > 0 && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--vscode-inputValidation-errorBackground, #5a1d1d)',
          color: 'var(--vscode-errorForeground, #f48771)',
          borderBottom: '2px solid var(--vscode-inputValidation-errorBorder, #be1100)',
          fontSize: 13,
          flexShrink: 0,
          maxHeight: 120,
          overflowY: 'auto',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            ⚠️ {validationErrors.length} validation error(s) — invalid rows were NOT saved:
          </div>
          {validationErrors.map((err, i) => (
            <div key={i} style={{
              padding: '2px 0',
              borderLeft: '3px solid var(--vscode-inputValidation-errorBorder, #ff4444)',
              paddingLeft: 8,
              marginBottom: 2,
            }}>
              <strong>Row {err.row + 2}</strong> ({err.key})
              {err.field && <> → <code style={{ color: 'var(--vscode-editorWarning-foreground, #ffcc00)' }}>{err.field}</code></>}
              : {err.message}
            </div>
          ))}
        </div>
      )}

      {/* FortuneSheet spreadsheet */}
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
    </div>
  );
}
