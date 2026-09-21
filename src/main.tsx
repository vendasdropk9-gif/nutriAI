import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { initDatabaseIntegrityMonitor } from './lib/databaseIntegrityMonitor.ts';

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
