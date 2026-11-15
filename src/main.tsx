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

// Consume and remove an email-confirmation token promptly, even before the team view opens.
const callbackParams = new URLSearchParams(window.location.hash.slice(1));
if (callbackParams.has('access_token') || callbackParams.has('refresh_token')) {
  void import('./collaboration/client').then(async ({ cloudClient }) => { await cloudClient?.auth.getSession(); }).catch(() => undefined).finally(() => {
    if (new URLSearchParams(window.location.hash.slice(1)).has('access_token') || new URLSearchParams(window.location.hash.slice(1)).has('refresh_token')) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
