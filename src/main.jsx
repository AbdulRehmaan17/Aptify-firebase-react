import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

// Global error handlers - MUST be set up before any imports that might throw
window.addEventListener('error', (e) => {
  console.error('🔥 Global Error:', e.error);
  console.error('🔥 Error Details:', {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    stack: e.error?.stack,
  });

  // Show error in UI if root element exists
  const rootElement = document.getElementById('root');
  if (rootElement && rootElement.children.length === 0) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui;">
        <h1 style="color: #dc2626; margin-bottom: 10px;">Application Error</h1>
        <p style="color: #6b7280; margin-bottom: 20px;">${e.message || 'An unexpected error occurred'}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('🔥 Promise Rejection:', e.reason);
  console.error('🔥 Rejection Details:', {
    reason: e.reason,
    promise: e.promise,
    stack: e.reason?.stack,
  });
});

// Ensure root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML =
    '<div style="padding: 20px; text-align: center; font-family: system-ui;"><h1 style="color: #dc2626;">Application Error</h1><p style="color: #6b7280;">Root element not found. Please check your HTML.</p></div>';
} else {
  try {
    // Add a loading indicator immediately
    rootElement.innerHTML =
      '<div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui;"><div style="text-align: center;"><div style="border: 4px solid #f3f4f6; border-top: 4px solid #2563eb; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div><p style="color: #6b7280;">Loading application...</p></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>';

    // Render the app
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (error) {
    console.error('🔥 Failed to render app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div>
          <h1 style="color: #dc2626; margin-bottom: 10px;">Failed to Load Application</h1>
          <p style="color: #6b7280; margin-bottom: 20px;">${error.message || 'An unexpected error occurred during initialization'}</p>
          <pre style="background: #f3f4f6; padding: 10px; border-radius: 6px; text-align: left; font-size: 12px; max-width: 600px; overflow: auto; margin: 0 auto 20px;">${error.stack || error.toString()}</pre>
          <button onclick="window.location.reload()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px;">
            Reload Page
          </button>
          <button onclick="console.clear(); console.log('Error:', ${JSON.stringify(error.toString())})" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
            View Error in Console
          </button>
        </div>
      </div>
    `;
  }
}
