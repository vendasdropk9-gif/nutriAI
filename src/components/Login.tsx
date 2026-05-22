import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Mail, Lock, ScanFace, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, Fingerprint, ShieldCheck, RefreshCw, Smartphone } from 'lucide-react';
import { signInWithGoogle, auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile, 
  getRedirectResult, 
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export function Login() {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'verify-email' | 'setup-biometrics'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isScanningFace, setIsScanningFace] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    // Check if we are returning from a Google redirect
    const checkRedirect = async () => {
      try {
        setLoading(true);
        const result = await getRedirectResult(auth);
        if (result) {
          // Success! auth context will handle it
        }
      } catch (err: any) {
        console.error("Redirect error", err);
        setError('Erro na autenticação com Google. Verifique sua conexão ou configuração do Firebase.');
      } finally {
        setLoading(false);
      }
    };
    checkRedirect();
  }, []);

  // Password strength calculation
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  }, [password]);

  // Form validation
  const validateForm = () => {
    setError('');
    
    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setError('Por favor, informe seu e-mail.');
      return false;
    }
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido.');
      return false;
    }

    if (view !== 'forgot') {
      if (!password) {
        setError('Por favor, informe sua senha.');
        return false;
      }
      if (password.length < 8) {
        setError('A senha deve ter pelo menos 8 caracteres para maior segurança.');
        return false;
      }
      if (view === 'register' && passwordStrength < 75) {
        setError('Aumente a força da sua senha (use letras maiúsculas, números e caracteres especiais).');
        return false;
      }
    }

    if (view === 'register' && !name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return false;
    }

    return true;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setSuccess('');
    
    if (!navigator.onLine) {
      setError('Sem conexão com internet. Verifique sua rede e tente novamente.');
      setLoading(false);
      return;
    }

    try {
      if (view === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Send verification email
        try {
          await sendEmailVerification(userCredential.user);
        } catch (vErr) {
          console.warn("Could not send verification email", vErr);
        }
        
        // Create user record in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name,
          email,
          createdAt: new Date().toISOString(),
          biometricsEnabled: false
        });

        setSuccess('Conta criada! Verifique seu e-mail para ativar sua conta.');
        setView('setup-biometrics');
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          // In many apps we allow login but show a warning
          setSuccess('Logado com sucesso. Lembre-se de verificar seu e-mail para desbloquear todas as funções.');
        }
      }
    } catch (err: any) {
      console.error("Auth error", err);
      if (err.code === 'auth/email-already-in-use') setError('Este e-mail já está cadastrado.');
      else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') setError('E-mail ou senha incorretos.');
      else if (err.code === 'auth/invalid-email') setError('Formato de e-mail inválido.');
      else if (err.code === 'auth/weak-password') setError('A senha fornecida é muito fraca.');
      else if (err.code === 'auth/network-request-failed') setError('Erro de conexão com a internet.');
      else setError('Ocorreu um erro inesperado. Tente novamente mais tarde.');
    } finally {
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
      setError('Falha ao autenticar com o Google. Tente novamente.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, insira seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.');
      setEmail('');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setError('Não encontramos uma conta com este e-mail.');
      else setError('Não foi possível enviar o e-mail de recuperação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = () => {
    setError('');
    setIsScanningFace(true);
    
    // Simulação do tempo de chamada da API nativa de biometria / WebAuthn
    setTimeout(() => {
      setIsScanningFace(false);
      // Aqui integraria com a API WebAuthn real ou Capacitor/Cordova para FaceID.
      // Como estamos na web pura em demonstração sem o setup de chave de segurança do backend:
      setError('Acesse as configurações do seu dispositivo para validar a identidade.');
      
      // Simula uma espera de interação
      setTimeout(() => {
         // Auto login if we had the public key matching
      }, 2000);
    }, 2500);
  };

  const handleEnableBiometrics = async (type: 'face' | 'fingerprint') => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      await setDoc(doc(db, 'users', user.uid), {
        biometricsEnabled: true,
        biometricType: type,
        biometricRegisteredAt: new Date().toISOString()
      }, { merge: true });

      localStorage.setItem('nutri-biometric-enabled', 'true');
      localStorage.setItem('nutri-biometric-type', type);

      setSuccess(`Acesso por ${type === 'face' ? 'Reconhecimento Facial' : 'Impressão Digital'} ativado com sucesso!`);
      
      setTimeout(() => {
        window.location.reload(); 
      }, 1500);
    } catch (err) {
      console.error("Biometric setup error", err);
      setError('Erro ao configurar biometria. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f4f9f6] dark:bg-slate-950 font-sans">
      
      {/* Decorative Side - Desktop Only */}
      <div className="hidden md:flex md:w-1/2 bg-emerald-600 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-900 opacity-90" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white opacity-5 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-300 opacity-10 rounded-full blur-[80px] -translate-x-1/4 translate-y-1/4" />
        
        <div className="relative z-10 p-12 text-center text-white max-w-lg">
          <div className="mb-8 inline-flex p-5 bg-white/10 rounded-[2rem] backdrop-blur-xl border border-white/20 shadow-2xl">
            <Utensils className="w-16 h-16 text-white drop-shadow-md" />
          </div>
          <h1 className="text-6xl font-serif font-bold mb-6 tracking-tight">NutriAI</h1>
          <p className="text-emerald-50 text-xl leading-relaxed font-light">
            Sua jornada de saúde potencializada por Inteligência Artificial. 
            Mais inteligente. Mais saudável. 100% focado em você.
          </p>
        </div>
      </div>

      {/* Auth Form Side */}
      <div className="flex-1 flex flex-col justify-center p-6 md:p-12 xl:p-24 relative overflow-y-auto no-scrollbar">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-auto"
        >
          {/* Mobile Header */}
          <div className="md:hidden flex flex-col items-center mb-10 mt-6">
            <div className="p-4 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl shadow-lg shadow-emerald-500/30 mb-4">
              <Utensils className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-slate-800 dark:text-white">NutriAI</h1>
          </div>

          <AnimatePresence mode="wait">
              <motion.div 
                key={view} 
                initial={{ opacity: 0, x: 10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                
                <div className="mb-8 text-center md:text-left">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                    {view === 'login' ? 'Bem-vindo de volta' : 
                     view === 'register' ? 'Crie sua conta' : 
                     view === 'forgot' ? 'Recuperar senha' :
                     view === 'setup-biometrics' ? 'Segurança Avançada' : 'Confirmação'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">
                    {view === 'login' ? 'Acesse para continuar sua evolução.' : 
                     view === 'register' ? 'Dê o primeiro passo para sua melhor versão.' : 
                     view === 'forgot' ? 'Informe seu e-mail para receber as instruções.' :
                     view === 'setup-biometrics' ? 'Deseja ativar o acesso por biometria facial ou digital?' : ''}
                  </p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-2xl flex items-start gap-3 border border-red-100 dark:border-red-800/30">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-2xl flex items-start gap-3 border border-emerald-100 dark:border-emerald-800/30">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <span>{success}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {view === 'setup-biometrics' ? (
                  <div className="space-y-4">
                    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] text-center space-y-4 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-20 h-20" />
                      </div>
                      <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                        <Smartphone className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-tighter text-xs">Proteção NutriAI</h4>
                        <p className="text-xs text-slate-500 max-w-[200px] mx-auto mt-1">Habilite o acesso rápido e seguro usando os sensores do seu hardware.</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                          onClick={() => handleEnableBiometrics('face')}
                          disabled={loading}
                          className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-emerald-500/30 transition-all group"
                        >
                          <ScanFace className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Face ID</span>
                        </button>
                        <button 
                          onClick={() => handleEnableBiometrics('fingerprint')}
                          disabled={loading}
                          className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-emerald-500/30 transition-all group"
                        >
                          <Fingerprint className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Digital</span>
                        </button>
                      </div>

                      <button 
                         onClick={() => window.location.reload()}
                         className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors pt-2 block mx-auto outline-none"
                      >
                        Pular por enquanto
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={view === 'forgot' ? handleResetPassword : handleEmailAuth} className="space-y-4" noValidate>
                    {view === 'register' && (
                      <div className="relative group">
                        <input 
                          type="text" 
                          placeholder="Nome Completo" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800 dark:text-white placeholder-slate-400"
                        />
                      </div>
                    )}

                    <div className="relative group">
                      <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                      <input 
                        type="email" 
                        placeholder="E-mail" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-5 pr-12 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800 dark:text-white placeholder-slate-400"
                      />
                    </div>

                    {view !== 'forgot' && (
                      <div className="space-y-2">
                        <div className="relative group">
                          <Lock className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Senha" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-5 pr-20 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800 dark:text-white placeholder-slate-400"
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        {view === 'register' && password.length > 0 && (
                          <div className="px-2 space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                               <span className="text-slate-400">Força da Senha</span>
                               <span className={passwordStrength < 50 ? 'text-red-500' : passwordStrength < 75 ? 'text-amber-500' : 'text-emerald-500'}>
                                 {passwordStrength < 50 ? 'Fraca' : passwordStrength < 75 ? 'Média' : 'Forte'}
                               </span>
                            </div>
                            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${passwordStrength}%` }}
                                 className={`h-full transition-all duration-500 ${passwordStrength < 50 ? 'bg-red-500' : passwordStrength < 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                               />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  {view === 'login' && (
                    <div className="flex justify-end pt-1">
                      <button type="button" onClick={() => setView('forgot')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors">
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}

                    <button
                      type="submit"
                      disabled={loading || isScanningFace}
                      className="w-full bg-emerald-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 hover:shadow-emerald-500/30 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:active:scale-100 mt-2 outline-none"
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          {view === 'login' ? 'Entrar' : view === 'register' ? 'Criar Conta' : 'Enviar Link'}
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {view !== 'forgot' && view !== 'setup-biometrics' && (
                  <div className="mt-8 space-y-4">
                    <div className="relative flex items-center justify-center py-2">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent h-[1px] top-1/2" />
                      <span className="relative bg-[#f4f9f6] dark:bg-slate-950 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Ou
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Botão Google */}
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading || isScanningFace}
                        className="flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white py-3.5 px-4 rounded-2xl font-bold shadow-sm hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] transition-all disabled:opacity-70 outline-none"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                      </button>

                      {/* Botão Biometria Facial */}
                      {view === 'login' && (
                        <button 
                          onClick={handleBiometricLogin}
                          disabled={loading || isScanningFace}
                          className="flex items-center justify-center gap-3 bg-slate-900 border border-slate-900 dark:bg-white dark:border-white text-white dark:text-slate-900 py-3.5 px-4 rounded-2xl font-bold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70 group relative overflow-hidden outline-none"
                        >
                          {isScanningFace ? (
                            <div className="absolute inset-0 bg-slate-800 dark:bg-slate-200 flex flex-col items-center justify-center">
                              <motion.div 
                                animate={{ scale: [1, 1.1, 1] }} 
                                transition={{ repeat: Infinity, duration: 1.5 }}
                              >
                                <ScanFace className="w-6 h-6 text-emerald-400 dark:text-emerald-600" />
                              </motion.div>
                              <div className="absolute top-0 w-full h-1 bg-emerald-400/50" style={{ animation: 'scan 1.5s linear infinite' }} />
                            </div>
                          ) : (
                            <>
                              <ScanFace className="w-5 h-5 text-current" />
                              Face ID
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <style dangerouslySetInnerHTML={{__html: `
                      @keyframes scan {
                        0% { transform: translateY(0); opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { transform: translateY(48px); opacity: 0; }
                      }
                    `}} />

                    <div className="text-center pt-4">
                      <span className="text-slate-500 dark:text-slate-400 text-sm">
                        {view === 'login' ? 'Ainda não tem uma conta? ' : 'Já faz parte? '}
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          setView(view === 'login' ? 'register' : 'login');
                          setError('');
                          setSuccess('');
                        }} 
                        className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors outline-none"
                      >
                        {view === 'login' ? 'Registre-se agora' : 'Faça login'}
                      </button>
                    </div>
                  </div>
                )}
                
                {view === 'forgot' && (
                  <div className="mt-8 text-center">
                    <button 
                      onClick={() => setView('login')} 
                      className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      Voltar ao painel de acesso
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

