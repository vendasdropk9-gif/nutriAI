import React, { useEffect, useState } from 'react';
import { diagnoseFirestoreConnection, DiagnosticResult } from '../lib/firebaseDiagnostics';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export const ConnectionDiagnostic: React.FC = () => {
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  useEffect(() => {
    diagnoseFirestoreConnection().then(setResult);
  }, []);

  if (!result) return null;

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-lg flex items-center gap-3 z-50 ${result.status === 'success' ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-500/50' : 'bg-red-900/90 text-red-100 border border-red-500/50'}`}>
      {result.status === 'success' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
      <span className="text-sm font-semibold">{result.message}</span>
    </div>
  );
};
