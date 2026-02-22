const vscode = require('vscode');
const path = require('path');
const { jsonToSheetData, sheetDataToJson } = require('./jsonConverter');
const { validateJson } = require('./jsonValidator');

class JsonEditorProvider {
  static viewType = 'fortunesheet.jsonEditor';

  constructor(context) {
    this.context = context;
  }

  /**
   * Registers this provider with VS Code and returns the disposable.
   */
  static register(context) {
    const provider = new JsonEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      JsonEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  /**
   * Called by VS Code when a .json file is opened with this editor.
   * Sets up the webview, message handling, and document synchronization.
   */
  async resolveCustomTextEditor(document, webviewPanel) {
    const webview = webviewPanel.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'dist')),
        vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules')),
      ],
    };

    // ── Per-editor state ──
    let typeMap = {};
    let jsonStructure = null; // 'array' | 'object-of-objects' | 'object'
    let originalKeys = [];    // preserve key order for object-of-objects
    let headers = [];
    let suppressDocChange = false; // prevents loops when we edit the document

    // Normalized JSON text (JSON.stringify'd with 4-space indent).
    // Used to detect whether an onChange from FortuneSheet actually changed data
    // vs. the spurious onChange fired during initial mount.
    let normalizedOriginal = '';

    /**
     * Reads the TextDocument, converts JSON → sheet data, and
     * posts it to the webview.  Does NOT modify the document.
     */
    const loadDocument = () => {
      const text = document.getText();
      if (!text.trim()) {
        webview.postMessage({ type: 'loadData', error: 'File is empty' });
        return;
      }
      try {
        const json = JSON.parse(text);
        // Store a normalized version so we can compare later
        normalizedOriginal = JSON.stringify(json, null, 4);

        const result = jsonToSheetData(json);
        typeMap = result.typeMap;
        jsonStructure = result.structure;
        originalKeys = result.keys;
        headers = result.headers;
        webview.postMessage({
          type: 'loadData',
          sheetData: result.sheetData,
          headers: result.headers,
        });
      } catch (e) {
        webview.postMessage({ type: 'loadData', error: `Invalid JSON: ${e.message}` });
      }
    };

    // Track current validation errors for the save-time check
    let currentValidationErrors = [];

    // ── Render webview HTML ──
    webview.html = this._getHtml(webview);

    // ── Handle messages from the webview ──
    const msgDisposable = webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        // Webview is ready → send the initial data
        case 'ready':
          loadDocument();
          break;

        // User edited cells → update the TextDocument
        case 'edit': {
          const values = msg.values; // 2-D array [row][col]
          try {
            const json = sheetDataToJson(
              values, typeMap, jsonStructure, headers, originalKeys
            );

            const newText = JSON.stringify(json, null, 4);

            // Compare with normalized original — skip if no real data change.
            // This prevents the spurious onChange that FortuneSheet fires on
            // mount from dirtying the document.
            if (newText === normalizedOriginal) {
              return;
            }

            // Real change — validate
            const errors = validateJson(json, jsonStructure);
            currentValidationErrors = errors || [];
            webview.postMessage({
              type: 'validationErrors',
              errors: currentValidationErrors,
              headers, // send headers so the webview can map field→column
            });

            // Apply the edit to the TextDocument
            const fullRange = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length)
            );
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, fullRange, newText);

            suppressDocChange = true;
            await vscode.workspace.applyEdit(edit);
            suppressDocChange = false;

            // Update baseline so subsequent no-change edits are also caught
            normalizedOriginal = newText;
          } catch (e) {
            vscode.window.showErrorMessage(`Save error: ${e.message}`);
          }
          break;
        }
      }
    });

    // ── Warn on save if there are validation errors ──
    const willSaveDisposable = vscode.workspace.onWillSaveTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (currentValidationErrors.length > 0) {
        vscode.window.showWarningMessage(
          `⚠️ This file has ${currentValidationErrors.length} validation error(s). ` +
          'Please review the highlighted rows in the editor.'
        );
      }
    });

    // ── Sync external document changes (undo / redo / other editors) ──
    const docChangeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (suppressDocChange) return;
      if (e.contentChanges.length === 0) return;
      // External change → re-load
      loadDocument();
    });

    // ── Cleanup ──
    webviewPanel.onDidDispose(() => {
      msgDisposable.dispose();
      docChangeDisposable.dispose();
      willSaveDisposable.dispose();
    });
  }

  // ─── Webview HTML ──────────────────────────────────────────────

  _getHtml(webview) {
    const bundleUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, 'dist', 'webview', 'bundle.js')
      )
    );

    const nonce = _getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource} 'unsafe-inline';
                 script-src 'nonce-${nonce}' 'unsafe-eval';
                 font-src ${webview.cspSource};
                 img-src ${webview.cspSource} data:;
                 worker-src blob:;">
  <title>FortuneSheet JSON Editor</title>
  <style>
    html, body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${bundleUri}"></script>
</body>
</html>`;
  }
}

/** Generates a random 32-char nonce for CSP. */
function _getNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

module.exports = { JsonEditorProvider };
