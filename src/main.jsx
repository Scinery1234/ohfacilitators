import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const root = document.getElementById('root');
if (!root) {
  document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">Root element not found.</p>';
} else {
  try {
    createRoot(root).render(
      <StrictMode>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (err) {
    root.innerHTML = `<div style="padding:24px;font-family:sans-serif"><h1 style="color:#dc2626">Load error</h1><pre>${err.message}</pre></div>`;
  }
}
