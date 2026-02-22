import { useEffect, useCallback, useRef } from 'react';

// Acquire the VS Code API once (calling it twice throws)
const vscode = acquireVsCodeApi();

/**
 * Hook that manages bidirectional messaging with the VS Code extension.
 *
 * @param {Object} handlers
 * @param {Function} handlers.onLoadData          – called with loadData messages
 * @param {Function} handlers.onValidationErrors  – called with validationErrors messages
 * @returns {{ postMessage: Function }}
 */
export default function useVscodeMessaging({ onLoadData, onValidationErrors }) {
  // Store handlers in a ref so the effect doesn't re-subscribe on every render
  const handlersRef = useRef({ onLoadData, onValidationErrors });
  handlersRef.current = { onLoadData, onValidationErrors };

  useEffect(() => {
    const handler = (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'loadData':
          handlersRef.current.onLoadData(msg);
          break;
        case 'validationErrors':
          handlersRef.current.onValidationErrors(msg);
          break;
      }
    };

    window.addEventListener('message', handler);

    // Tell the extension we're ready to receive data
    vscode.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handler);
  }, []);

  const postMessage = useCallback((msg) => {
    vscode.postMessage(msg);
  }, []);

  return { postMessage };
}
