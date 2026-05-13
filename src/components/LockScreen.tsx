import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Fingerprint, Utensils } from 'lucide-react';

export function LockScreen({ onUnlock, userEmail }: { onUnlock: () => void, userEmail?: string | null }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const simulateBiometric = () => {
    setError(false);
    setLoading(true);
    // Simulate biometric check
    setTimeout(() => {
      setLoading(false);
      onUnlock();
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xs w-full text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-emerald-500 rounded-3xl shadow-lg shadow-emerald-500/20 text-white">
            <Utensils className="w-10 h-10" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-1">NutriAI</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {userEmail || 'Bem-vindo de volta'}
          </p>
        </div>
        
        <div className="py-8">
          <button 
            onClick={simulateBiometric}
            disabled={loading}
            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center border-2 shadow-xl hover:scale-105 active:scale-95 transition-all
              ${error ? 'bg-red-50 dark:bg-red-900 border-red-500 text-red-500 shadow-red-500/20' : 'bg-emerald-50 dark:bg-slate-800 border-emerald-500 text-emerald-500 shadow-emerald-500/20'}
            `}
          >
            <Fingerprint className={`w-12 h-12 ${loading ? 'animate-pulse' : ''}`} />
          </button>
          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            Toque para desbloquear
          </p>
        </div>

        <button 
          onClick={() => {
            // Optional fallback to sign out
            localStorage.removeItem('nutri-biometric-enabled');
            window.location.reload(); 
          }} 
          className="text-xs text-slate-400 hover:text-emerald-500 underline"
        >
          Desativar Biometria
        </button>
      </motion.div>
    </div>
  );
}
