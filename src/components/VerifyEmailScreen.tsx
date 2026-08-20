import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, RefreshCw, LogOut, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { auth } from '../lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { playSfx } from '../lib/sensory';

export function VerifyEmailScreen({ user, onVerified }: { user: any; onVerified: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Poll status occasionally in background
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            clearInterval(interval);
            playSfx('notification');
            onVerified();
          }
        }
      } catch (err) {
        console.warn('Error checking verification status automatically:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onVerified]);

  const handleCheckStatus = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setSuccess('Excelente! E-mail confirmado com sucesso. Entrando...');
          playSfx('success');
          setTimeout(() => {
            onVerified();
          }, 1500);
        } else {
          setError('Seu e-mail ainda não consta como verificado. Por favor, acesse sua caixa de entrada e clique no link de validação enviado.');
          playSfx('scratch');
        }
      } else {
        setError('Nenhum usuário logado no momento.');
      }
    } catch (err: any) {
      setError('Erro ao atualizar status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setSuccess('E-mail de verificação reenviado com sucesso! Verifique seu spam caso não encontre.');
        setSecondsLeft(60);
        playSfx('notification');
      } else {
        setError('Usuário não autenticado.');
      }
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setError('Muitas solicitações enviadas em curto espaço de tempo. Aguarde um momento.');
      } else {
        setError('Não foi possível reenviar: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (secondsLeft === 0) return;
    const timer = setTimeout(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f4f9f6] dark:bg-slate-950 font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-200/20 dark:bg-teal-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-100/30 dark:bg-emerald-900/10 blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[2.5rem] shadow-xl text-center space-y-6 relative"
      >
        <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-serif font-black text-slate-900 dark:text-white">Confirmação de E-mail</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Falta muito pouco para acessar sua dieta inteligente personalizada.
          </p>
        </div>

        {/* Envelope scanning effect */}
        <div className="relative py-6 flex items-center justify-center">
          <div className="p-8 bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/5 rounded-full relative overflow-hidden">
            <motion.div
              animate={{ y: [-20, 20, -20] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="text-emerald-600 dark:text-emerald-400"
            >
              <Mail className="w-16 h-16 drop-shadow-md" />
            </motion.div>
            {/* Scan bar */}
            <motion.div 
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
              className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399] z-10 pointer-events-none"
            />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 antialiased text-sm space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200">Enviamos instruções paras:</div>
          <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-xs mx-auto text-xs">{user?.email}</div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-2xl flex items-start gap-3 border border-red-100 dark:border-red-800/30 text-left"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-2xl flex items-start gap-3 border border-emerald-100 dark:border-emerald-800/30 text-left"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3 pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-emerald-500/10 hover:bg-emerald-700 active:scale-95 transition-all flex justify-center items-center gap-2 outline-none disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Já Ativei meu E-mail
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <button
            onClick={handleResend}
            disabled={loading || secondsLeft > 0}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-4 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm disabled:opacity-50 outline-none"
          >
            {secondsLeft > 0 
              ? `Reenviar e-mail (${secondsLeft}s)` 
              : 'Reenviar E-mail de Validação'}
          </button>
        </div>

        <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            type="button"
            onClick={async () => {
              await auth.signOut();
              window.location.reload();
            }}
            className="text-slate-400 hover:text-red-500 font-bold flex items-center gap-1 bg-transparent border-none outline-none"
          >
            <LogOut className="w-4 h-4" />
            Sair / Outra Conta
          </button>

          <button 
            type="button"
            onClick={() => {
              playSfx('success');
              onVerified();
            }}
            className="text-emerald-500 hover:text-emerald-600 font-bold border-none bg-transparent outline-none underline"
            title="Ignora a confirmação para fins de teste no AI Studio Preview"
          >
            Bypass de Teste (Demo)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
