import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/20 rounded-[24px] text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto text-rose-500 font-bold text-xl">
            ⚠️
          </div>
          <h3 className="font-serif text-2xl text-rose-800 dark:text-rose-400 font-medium">Algo deu errado.</h3>
          <p className="font-sans text-slate-600 dark:text-slate-300">
            Toque para tentar novamente.
          </p>
          {this.state.error && (
            <pre className="p-4 bg-black/40 text-rose-300 rounded-xl text-left text-xs font-mono overflow-auto max-h-40">
              {this.state.error.name}: {this.state.error.message}
            </pre>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button 
              onClick={() => window.location.reload()} 
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-medium rounded-xl transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
            >
              🔄 Recarregar Página
            </button>
            <button 
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch(e) {}
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(r => r.unregister());
                    window.location.href = window.location.pathname;
                  }).catch(() => {
                    window.location.href = window.location.pathname;
                  });
                } else {
                  window.location.href = window.location.pathname;
                }
              }} 
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 border border-slate-700 active:scale-95 text-slate-200 font-medium rounded-xl transition-all cursor-pointer"
            >
              🧹 Limpar Dados & Resetar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
