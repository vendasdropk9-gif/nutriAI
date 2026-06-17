import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Fingerprint, Utensils, LogOut, Sun, Moon } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { playSfx, vibrate } from '../lib/sensory';

interface LockScreenProps {
  onUnlock: () => void;
  userEmail?: string | null;
  onDisableBiometric?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function LockScreen({ 
  onUnlock, 
  userEmail,
  onDisableBiometric,
  isDarkMode,
  onToggleDarkMode
}: LockScreenProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const simulateBiometric = () => {
    setError(false);
    setLoading(true);
    playSfx('tap');
    vibrate(20);
    // Simulate biometric check
    setTimeout(() => {
      setLoading(false);
      playSfx('success');
      vibrate([50, 50]);
      onUnlock();
    }, 1000);
  };

  const handleSignOut = async () => {
    try {
      playSfx('tap');
      await signOut(auth);
      if (onDisableBiometric) {
        onDisableBiometric();
      } else {
        localStorage.removeItem('nutri-biometric-enabled');
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTheme = () => {
    playSfx('tap');
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      const current = localStorage.getItem('nutri-dark-mode') === 'true';
      const newVal = !current;
      localStorage.setItem('nutri-dark-mode', String(newVal));
      if (newVal) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white transition-colors duration-500 overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-200/20 dark:bg-emerald-950/15 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-200/15 dark:bg-teal-950/15 blur-[120px]" />
      </div>

      {/* Top Absolute Action Bar */}
      <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-10 w-full max-w-7xl mx-auto">
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-xs md:text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Sair da Conta / Voltar para Login"
        >
          <LogOut className="w-4 h-4 text-emerald-500" />
          <span>Sair da Conta</span>
        </button>
        
        <button 
          onClick={handleToggleTheme}
          className="p-3 rounded-full border border-slate-200/85 dark:border-slate-800/85 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer"
          title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-500 animate-[spin_12s_linear_infinite]" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>
      </div>

      {/* Lock Card Container */}
      <div className="w-full max-w-sm px-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="clay-card p-8 md:p-10 text-center space-y-8 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-slate-850/60 shadow-2xl rounded-[36px]"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-emerald-500 rounded-[20px] shadow-lg shadow-emerald-500/20 text-white relative">
              <Utensils className="w-10 h-10" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2 tracking-tight">NutriAI</h2>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate" title={userEmail || 'Bem-vindo de volta'}>
              {userEmail || 'bem-vindo@nutriai.com'}
            </p>
          </div>
          
          <div className="py-2 flex flex-col items-center justify-center">
            <div className="relative">
              {/* Pulsing outer visual waves */}
              <div className="absolute inset-[-12px] rounded-full border border-emerald-500/15 animate-ping duration-[2s] select-none pointer-events-none" />
              <div className="absolute inset-[-6px] rounded-full border border-emerald-500/25 animate-pulse duration-[1.5s] select-none pointer-events-none" />
              
              <button 
                onClick={simulateBiometric}
                disabled={loading}
                className={`w-28 h-28 rounded-full flex items-center justify-center border-2 border-emerald-500 hover:border-emerald-400 hover:scale-105 active:scale-95 transition-all outline-none focus:outline-none cursor-pointer relative z-10
                  ${error ? 'bg-red-50 dark:bg-red-950/20 border-red-500 text-red-500' : 'bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-500 dark:text-emerald-400 shadow-xl shadow-emerald-500/10'}
                `}
              >
                <Fingerprint className={`w-14 h-14 ${loading ? 'animate-pulse text-emerald-400' : ''}`} />
              </button>
            </div>
            
            <p className="mt-6 text-sm font-bold text-slate-700 dark:text-slate-300">
              Toque para desbloquear
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Acesso rápido por biometria
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6">
            <button 
              onClick={() => {
                playSfx('tap');
                if (onDisableBiometric) {
                  onDisableBiometric();
                } else {
                  localStorage.removeItem('nutri-biometric-enabled');
                  window.location.reload(); 
                }
              }} 
              className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Desativar Biometria
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
