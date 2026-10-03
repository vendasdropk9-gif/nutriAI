import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initDatabaseIntegrityMonitor } from './lib/databaseIntegrityMonitor';

// Auto-run database integrity monitoring for Firestore & Supabase in dev/runtime with error safety
try {
  initDatabaseIntegrityMonitor(2500);
} catch (e) {
  console.warn('Database integrity monitor initialization skipped:', e);
}

const rootEl = document.getElementById('root');

if (rootEl) {
  try {
    createRoot(rootEl).render(
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
  } catch (renderError: any) {
    console.error('Fatal React render error:', renderError);
    rootEl.innerHTML = `
      <div style="min-height: 100vh; background-color: #0B0F14; color: #F8FAFC; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; padding: 24px; text-align: center;">
        <h2 style="font-size: 22px; margin-bottom: 8px; color: #EF4444;">Falha ao Inicializar o NutriAI</h2>
        <p style="font-size: 14px; color: #94A3B8; max-width: 400px; margin-bottom: 24px;">Ocorreu um erro ao carregar as configurações do aplicativo.</p>
        <div style="display: flex; gap: 12px;">
          <button onclick="window.location.reload()" style="background: #10B981; color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 600; cursor: pointer;">Tentar Novamente</button>
          <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="background: #334155; color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 600; cursor: pointer;">Reset Completo</button>
        </div>
      </div>
    `;
  }
}
