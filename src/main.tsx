import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './themes.css';

// A Pages deployment can remove hashed chunks used by an older open tab.
// Reload once per 30 seconds; if recovery fails, the error boundary remains visible.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const previous = Number(sessionStorage.getItem('orbital-reload-at') || 0);
    if (Date.now() - previous < 30000) return;
    sessionStorage.setItem('orbital-reload-at', String(Date.now()));
    event.preventDefault();
    window.location.reload();
  } catch { /* Storage may be disabled; leave the error for the boundary. */ }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
