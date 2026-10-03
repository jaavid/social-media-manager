/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { isProduction } from './lib/runtime/config';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/common.css';
import './styles/legacy.css';
import './styles/accessibility.css';
import { bootstrapTheme } from './hooks/useTheme';

// Apply persisted theme before React paints, to avoid flash of wrong theme.
bootstrapTheme();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// ── Service Worker Registration (PWA) ───────────────────────────────────────
if ('serviceWorker' in navigator && isProduction()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
