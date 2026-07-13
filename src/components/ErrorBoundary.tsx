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
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-medium rounded-xl transition-all shadow-lg shadow-rose-500/20"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
