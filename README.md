# FortuneSheet JSON Editor

Project tree (top-level view):

```
FortuneSheet-Try-2/
├── ANSWERS_TO_YOUR_QUESTIONS.md
├── DOCUMENTATION.md
├── LICENSE (if present)
├── package.json
├── package-lock.json (if present)
├── webpack.config.js
├── setup.js
├── variable_config_extended.json
├── SETUP_FOR_OTHER_ENVIRONMENT.md
├── README.md
├── src/
│   ├── extension.js
│   ├── jsonEditorProvider.js
│   ├── jsonConverter.js
│   └── jsonValidator.js
├── webview-src/
│   ├── main.jsx
│   ├── components/
│   │   └── SpreadsheetEditor.jsx
│   ├── hooks/
│   │   └── useVscodeMessaging.js
│   └── utils/
│       └── themeHelper.js
├── dist/
│   └── webview/
│       └── bundle.js
└── node_modules/
```

Notes:
- `src/` contains the VS Code extension runtime code (runs in Node.js / Extension Host).
- `webview-src/` contains the React/browser UI source for the webview (must be bundled).
- `dist/webview/bundle.js` is the webpack-built bundle the webview loads at runtime.
- Use `npx webpack --mode production` or `npm run build:webview` to build the webview bundle.

See `DOCUMENTATION.md` for full details and development workflow.
