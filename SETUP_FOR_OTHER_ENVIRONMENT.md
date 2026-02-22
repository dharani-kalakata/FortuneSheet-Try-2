# Setup & Shipping Guide — FortuneSheet JSON Editor

Purpose: instructions to reproduce a working extension environment and package it for another machine or CI.

**Prerequisites**
- Node.js (LTS) and npm installed. Recommended: Node 18+.
- VS Code for extension development (if testing with F5).
- Optional: `vsce` if you plan to create a .vsix for distribution.

**Files of interest**
- `src/` — extension code (runs in VS Code Extension Host; no bundling required)
- `webview-src/` — web UI source (React/JSX; must be bundled for the webview)
- `dist/webview/bundle.js` — built bundle that the webview loads at runtime
- `webpack.config.js` — build rules (entry/output/loaders)
- `package.json` — npm scripts and dependencies

**Quick commands (local setup)**
```bash
# from repo root
npm install
# build the webview bundle (production/minified)
npx webpack --mode production
# or use the npm script
npm run build:webview
```

**How to run and test the extension locally**
1. Open the project folder in VS Code.
2. Press F5 to launch the Extension Development Host (this runs code from `src/`).
3. In the new host window open a `.json` file and pick "FortuneSheet JSON Editor".

Notes:
- The `src/` files are loaded directly by VS Code when debugging (no webpack step required for `src/`).
- The webview uses whatever is present in `dist/webview/bundle.js`. Rebuild after changing `webview-src/`.

**Recommended development workflow**
- Run webpack in watch mode in a separate terminal while editing `webview-src/`:
```bash
npm run watch:webview
# or
npx webpack --mode development --watch
```
- After webpack rebuilds, reload the webview by closing and reopening the JSON file (or reopen the editor tab).
- Edit `src/` files, then press F5 to restart the Extension Development Host.

**Packaging / Shipping options**
Option A — Include `dist/webview/bundle.js` in the package (recommended for simplicity):
- Ensure you run `npm run build:webview` and commit `dist/webview/bundle.js` to the release branch or include it in the artifact.
- When the target machine unpacks the extension folder, it can run the extension without having webpack installed.

Option B — Build during CI / install on target:
- Do NOT commit `dist/`. Instead add a build step in CI or a `prepare` / `prepublishOnly` script to run `npm run build:webview` before packaging.
- Example `package.json` entry to add (optional):
```json
"scripts": {
  "build:webview": "webpack --mode production",
  "prepare": "npm run build:webview"
}
```
`prepare` runs automatically on `npm install` for package authors and in many CI flows.

**Creating a .vsix (packaged extension)**
1. Install `vsce` globally or use npx: `npm install -g vsce` or `npx vsce`.
2. Ensure `dist/webview/bundle.js` exists (built). If using CI, add a build step.
3. Run:
```bash
npx vsce package
```
This produces `your-extension-0.0.1.vsix` which can be installed in VS Code.

**CI example (GitHub Actions, minimal)**
- Steps to include in CI:
  - checkout
  - setup-node
  - npm ci
  - npm run build:webview
  - npx vsce package (or publish)

**Windows-specific notes**
- Use PowerShell or cmd; commands above work in PowerShell.
- If permissions block global `vsce` install, prefer `npx vsce`.

**What to include in source control for best portability**
- Keep `webview-src/` and `src/` committed (source).
- Two choices for `dist/`:
  - Commit `dist/webview/bundle.js` to make it trivial for consumers to install/run the extension without a build step.
  - Or ignore `dist/` and rely on CI or `prepare` script to build during packaging. If you choose this, document the requirement clearly.

**Common troubleshooting**
- Webview shows old UI: rebuild `dist/webview/bundle.js` and reopen the webview.
- Missing modules during build: run `npm install` and check `devDependencies` in `package.json` (webpack, babel loaders).
- CSP errors: ensure the generated HTML in `src/jsonEditorProvider.js` loads the script via `webview.asWebviewUri(...)` (already implemented in this repo).

**Recommended additions to the repo (optional)**
- Add `prepare` script to `package.json` so builds run during packaging.
- Add a CI workflow that runs `npm ci` and `npm run build:webview` and publishes the `.vsix`.
- Add a short `README.md` snippet (or link this file) explaining whether `dist/` is committed or built in CI.

---
If you want, I can:
- add the `prepare` script to `package.json` for you, or
- create a GitHub Actions workflow file that builds the webview and packages the extension.
