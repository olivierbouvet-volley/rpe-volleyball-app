import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import VideoPopout from './components/VideoPopout';
import './index.css';

// Detect popup mode via query parameter
const isVideoPopout = new URLSearchParams(window.location.search).has('popout');

// If this is the main window (not popup), always reset isVideoDetached on load.
// This prevents a stuck "detached" state if the popup was closed without sending
// the 'closing' BroadcastChannel message (e.g. browser crash, forced close).
if (!isVideoPopout) {
  try {
    const raw = localStorage.getItem('volleyvision-layout');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.isVideoDetached) {
        parsed.state.isVideoDetached = false;
        localStorage.setItem('volleyvision-layout', JSON.stringify(parsed));
      }
    }
  } catch { /* ignore */ }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isVideoPopout ? <VideoPopout /> : <App />}
  </React.StrictMode>
);
