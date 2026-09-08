import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'floating' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'header',
  className = '' 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running as an installed PWA, hide
  if (isInstalled && !justInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 4000);
    }
  };

  if (justInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Instalado com sucesso!</span>
      </div>
    );
  }

  // Se não for instalável diretamente (por exemplo em desktop já com app ou navegador incompatível) e não for iOS, não mostra variante invasiva
  if (!isInstallable && !isIOS && variant !== 'card') {
    return null;
  }

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleInstallClick}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 dark:text-emerald-300 text-xs font-medium cursor-pointer transition-all duration-200 active:scale-95 shadow-sm ${className}`}
          title="Instalar NutriAI no seu dispositivo"
        >
          <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
          <span className="hidden sm:inline">Baixar App</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {variant === 'floating' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed bottom-20 right-4 z-40 ${className}`}
        >
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-xs shadow-xl shadow-emerald-500/25 border border-emerald-400/30 active:scale-95 transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Instalar no Celular</span>
          </button>
        </motion.div>
      )}

      {variant === 'banner' && (
        <div className={`p-4 rounded-2xl bg-gradient-to-r from-emerald-900/40 via-slate-900/60 to-slate-900/40 border border-emerald-500/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Instale o NutriAI no seu Celular</h4>
              <p className="text-xs text-slate-400">Acesse instantaneamente sem precisar digitar o link, mesmo offline.</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Instalar Agora</span>
          </button>
        </div>
      )}

      {variant === 'card' && (
        <button
          onClick={handleInstallClick}
          className={`w-full p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Instalar Aplicativo (PWA)</div>
              <div className="text-xs text-slate-400">Tenha o ícone na tela inicial do seu celular ou PC</div>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            Instalar
          </div>
        </button>
      )}

      {/* Guia interativo para iPhone/iPad (iOS Safari) */}
      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl relative text-white"
            >
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Instalar no iPhone / iPad</h3>
                  <p className="text-xs text-slate-400">Poucos segundos para ter o app nativo</p>
                </div>
              </div>

              <div className="space-y-3.5 my-5 text-sm text-slate-300">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">1. Toque no botão Compartilhar</span>
                    <p className="text-xs text-slate-400 mt-0.5">Localizado na barra inferior do Safari (ícone de quadrado com seta para cima).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">2. Selecione "Adicionar à Tela de Início"</span>
                    <p className="text-xs text-slate-400 mt-0.5">Role um pouco para baixo na lista de opções e confirme.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                Entendi, obrigado!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
