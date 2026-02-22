const vscode = require('vscode');
const { JsonEditorProvider } = require('./jsonEditorProvider');

/**
 * Called by VS Code when the extension activates.
 * Registers the FortuneSheet JSON custom editor provider.
 */
function activate(context) {
  const provider = JsonEditorProvider.register(context);
  context.subscriptions.push(provider);
}

function deactivate() {}

module.exports = { activate, deactivate };
