import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initDatabaseIntegrityMonitor } from './lib/databaseIntegrityMonitor';

// Auto-run database integrity monitoring for Firestore & Supabase in dev/runtime
initDatabaseIntegrityMonitor(2500);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
