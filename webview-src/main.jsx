import React from 'react';
import { createRoot } from 'react-dom/client';
import SpreadsheetEditor from './components/SpreadsheetEditor';

// Inject VS Code theme overrides for FortuneSheet
import './utils/themeHelper';

const root = createRoot(document.getElementById('root'));
root.render(<SpreadsheetEditor />);
