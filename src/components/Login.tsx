import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, LogIn, Mail, Lock, Fingerprint, User as UserIcon, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { signInWithGoogle, auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';

export function Login() {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!navigator.onLine) {
      setError('Sem conexão com internet.');
      setLoading(false);
      return;
    }

    try {
      if (view === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error", err);
      if (err.code === 'auth/email-already-in-use') setError('Este e-mail já está cadastrado.');
      else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') setError('E-mail ou senha incorretos.');
      else if (err.code === 'auth/invalid-email') setError('E-mail inválido.');
      else if (err.code === 'auth/weak-password') setError('A senha deve ter pelo menos 6 caracteres.');
      else if (err.code === 'auth/network-request-failed') setError('Sem conexão com internet.');
      else setError('Erro na autenticação. Tente novamente.');
    } finally {
      if (view === 'forgot') setLoading(false); 
      // If success, AuthContext triggers an unmount of Login, 
      // but if error, we need to set loading to false.
      // Wait, let's just set loading to false unconditionally, 
      // it won't matter if it gets unmounted except for a dev warning.
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Login failed", err);
      setError('Erro ao entrar com Google.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Digite seu email para recuperar a senha.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setError('Email de recuperação enviado!');
    } catch (err) {
      setError('Erro ao enviar email.');
    } finally {
      setLoading(false);
    }
  };

  const enableBiometric = () => {
    localStorage.setItem('nutri-biometric-enabled', 'true');
    alert("Biometria habilitada para o próximo login!");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] dark:bg-slate-950">
      
      {/* Decorative Side */}
      <div className="hidden md:flex md:w-1/2 bg-emerald-600 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-900 opacity-90" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white opacity-5 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />
        <div className="relative z-10 p-12 text-center text-white max-w-lg">
          <div className="mb-8 inline-flex p-4 bg-white/20 rounded-3xl backdrop-blur-xl border border-white/30">
            <Utensils className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-5xl font-serif font-bold mb-6">NutriAI</h1>
          <p className="text-emerald-100 text-lg leading-relaxed">
            Sua jornada de saúde potencializada por Inteligência Artificial. Dietas perfeitas, treinos adaptáveis e evolução constante.
          </p>
        </div>
      </div>

      {/* Auth Form Side */}
      <div className="flex-1 flex flex-col justify-center p-6 md:p-12 relative overflow-y-auto no-scrollbar">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full mx-auto"
        >
          {/* Mobile Header */}
          <div className="md:hidden flex justify-center mb-8">
            <div className="p-4 bg-emerald-500 rounded-3xl shadow-lg shadow-emerald-500/20">
              <Utensils className="w-10 h-10 text-white" />
            </div>
          </div>

          <AnimatePresence mode="wait">
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
                  {view === 'login' ? 'Entrar' : view === 'register' ? 'Criar Conta' : 'Recuperar Senha'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                  {view === 'login' ? 'Continue sua jornada de saúde.' : view === 'register' ? 'Personalize sua experiência NutriAI.' : 'Enviaremos um link para seu email.'}
                </p>

                {error && (
                  <div className="p-3 mb-6 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl border border-red-200 dark:border-red-800/50">
                    {error}
                  </div>
                )}

                <form onSubmit={view === 'forgot' ? handleResetPassword : handleEmailAuth} className="space-y-4">
                  {view === 'register' && (
                    <>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Nome Completo" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-slate-800 dark:text-white"
                          required
                        />
                      </div>
                      <div className="relative">
                        <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Seu objetivo (ex: Perder Peso)" 
                          value={goals}
                          onChange={(e) => setGoals(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-slate-800 dark:text-white"
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="email" 
                      placeholder="E-mail" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-slate-800 dark:text-white"
                      required
                    />
                  </div>

                  {view !== 'forgot' && (
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Senha" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-slate-800 dark:text-white"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  )}

                  {view === 'login' && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setView('forgot')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 text-white font-bold text-lg py-4 rounded-2xl shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95 transition-all flex justify-center items-center gap-2"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {view === 'login' ? 'Entrar' : view === 'register' ? 'Criar Conta' : 'Enviar Link'}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                {view !== 'forgot' && (
                  <div className="mt-8">
                    <div className="relative flex items-center justify-center mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent h-px top-1/2" />
                      <span className="relative bg-[#f8fafc] dark:bg-slate-950 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Ou continue com
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white py-4 rounded-2xl font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all mb-6"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Google
                    </button>
                    
                    {view === 'login' && localStorage.getItem('nutri-biometric-enabled') !== 'true' && (
                      <button 
                        onClick={enableBiometric}
                        className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-semibold mb-6"
                      >
                        <Fingerprint className="w-4 h-4" />
                        Ativar Login Biométrico
                      </button>
                    )}

                    <div className="text-center">
                      <button 
                        onClick={() => setView(view === 'login' ? 'register' : 'login')} 
                        className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        {view === 'login' ? 'Não tem uma conta? Registre-se' : 'Já tem uma conta? Entre'}
                      </button>
                    </div>
                  </div>
                )}
                
                {view === 'forgot' && (
                  <div className="mt-6 text-center">
                    <button 
                      onClick={() => setView('login')} 
                      className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                    >
                      Voltar para o login
                    </button>
                  </div>
                )}

              </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

    </div>
  );
}
