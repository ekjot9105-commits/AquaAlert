import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { flushOfflineQueue } from './services/offlineQueue'

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(error => console.warn('AquaAlert offline shell unavailable', error));
window.addEventListener('online', () => { void flushOfflineQueue().catch(error => console.warn('Offline queue sync deferred', error)); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
