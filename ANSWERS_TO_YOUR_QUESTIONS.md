# Answers — Frequently Asked Questions

This file summarizes the answers to the questions you asked about build, runtime, and workflow.

## Q1 — Which files actually run when I press F5 (Extension Development Host)?
- The extension code in `src/` runs in the VS Code Extension Host (Node.js). VS Code loads `src/` directly when you press F5.
- The webview UI runs the built bundle at `dist/webview/bundle.js`. The extension injects that script into the webview (see `src/jsonEditorProvider.js`).

## Q2 — So `webview-src/` is source and `dist/` is minified build — which one is used in the running webview?
- The webview executes `dist/webview/bundle.js`. `webview-src/` is your editable React/JSX source; webpack compiles it into the single bundle the webview loads.

## Q3 — Do I need to keep `webview-src/` in the repo?
- Yes. Keep `webview-src/` (source) committed so you can edit and maintain the UI.
- For consumers/installers you have two choices:
  - Commit `dist/webview/bundle.js` as part of the release so users can run the extension without rebuilding.
  - Or do not commit `dist/` and instead run the build in CI or via a `prepare` / `prepublishOnly` script so the bundle is produced during packaging.

## Q4 — Where are the build rules defined?
- Build rules are in `webpack.config.js`:
  - Entry: `./webview-src/main.jsx`
  - Output: `dist/webview/bundle.js`
  - Loaders: `babel-loader` for JSX/ES, `style-loader` + `css-loader` for CSS
- npm scripts in `package.json` call webpack (`build:webview`, `dev:webview`, `watch:webview`).

## Q5 — What is the difference between `src/` and `webview-src/`?
- `src/` runs in Node (Extension Host) and can use the `vscode` API and Node modules. No bundling required for development; press F5 to reload.
- `webview-src/` runs in a sandboxed browser iframe (no Node/VScode API). It must be transpiled and bundled for the browser (via webpack) and then loaded as `dist/webview/bundle.js`.

## Q6 — Commands I should run (quick reference)
```bash
# install deps
npm install

# build production bundle
npx webpack --mode production
# or
npm run build:webview

# development build
npx webpack --mode development
npm run dev:webview

# watch mode (auto-rebuild webview-src changes)
npx webpack --mode development --watch
npm run watch:webview

# run extension in debug (F5 from VS Code)
# (no webpack step needed to load src/ files, but rebuild webview bundle if webview-src/ changed)
```

## Q7 — Recommended dev workflow
- In one terminal run: `npm run watch:webview` to auto-rebuild the webview bundle on changes.
- In VS Code press F5 to run the Extension Development Host (tests `src/` changes).
- When `webview-src/` changes: either use watch mode or run `npm run build:webview`, then reload the webview (close/reopen the JSON file).

## Q8 — Packaging recommendation
- Add a `prepare` script in `package.json` to ensure `dist/webview/bundle.js` is built during packaging/CI, or commit `dist/webview/bundle.js` to releases.

## Q9 — Quick troubleshooting
- Old webview UI: rebuild `dist/webview/bundle.js` and reopen the webview.
- Missing build tools: run `npm install` and ensure `webpack` and `babel` devDependencies are present.
- CSP script error: confirm bundle is loaded via `webview.asWebviewUri(...)` in `src/jsonEditorProvider.js`.

---
If you want, I can:
- add a `prepare` script to `package.json`, or
- generate a small GitHub Actions workflow that runs `npm ci` and `npm run build:webview` and packages the extension (.vsix).