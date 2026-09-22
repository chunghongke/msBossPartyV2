import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './index.css';
// 當新版本上線且舊的動態 chunk 404 時自動重載最新版本
window.addEventListener('vite:preloadError', (event) => {
  console.warn('模組預載失敗 (可能伺服器已發布新版本)，正在為您重新整理載入最新版本...', event);
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
