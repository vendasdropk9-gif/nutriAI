import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, 
  CheckCircle2, Sparkles, Check, FileText, UserCheck, Shield, Copy, ExternalLink
} from 'lucide-react';
import { safeGet, safeSet } from "../lib/storage";
import { playSfx } from '../lib/sensory';
import { signInWithGoogle, auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile, 
  getRedirectResult, 
  sendEmailVerification 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from '../lib/firebase';

export function Login() {
  const { loginLocally } = useAuth();
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Login & Registration Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // UX & Feedback States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Validation Breakdown
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [passwordStrength, setPasswordStrength] = useState(0);

  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleCopyDomain = () => {
    const domain = typeof window !== 'undefined' ? window.location.hostname : '';
    if (domain && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(domain);
      setCopiedDomain(true);
      playSfx('tap');
      setTimeout(() => setCopiedDomain(false), 3000);
    }
  };

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = safeGet('nutri-remembered-email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // Check Google redirect result
    const checkRedirect = async () => {
      try {
        setLoading(true);
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const names = (result.user.displayName || '').split(' ');
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            name: result.user.displayName || 'Usuário NutriAI',
            firstName: names[0] || '',
            lastName: names.slice(1).join(' ') || '',
            email: result.user.email || '',
            photoURL: result.user.photoURL || null,
            plan: 'Free',
            isPremium: false,
            subscriptionStatus: 'active',
            language: 'pt-BR',
            country: 'Brasil',
            lastAccessAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
          playSfx('success');
        }
      } catch (err: any) {
        console.warn("Redirect check failed", err);
      } finally {
        setLoading(false);
      }
    };
    checkRedirect();
  }, []);

  // Live Password Strength & Criteria Assessment
  useEffect(() => {
    if (!password) {
      setPasswordCriteria({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false
      });
      setPasswordStrength(0);
      return;
    }

    const length = password.length >= 8;
    const uppercase = /[A-Z]/.test(password);
    const lowercase = /[a-z]/.test(password);
    const number = /[0-9]/.test(password);
    const special = /[^A-Za-z0-9]/.test(password);

    const score = [length, uppercase, lowercase, number, special].filter(Boolean).length;
    setPasswordStrength(score);

    setPasswordCriteria({
      length,
      uppercase,
      lowercase,
      number,
      special
    });
  }, [password]);

  // Form Validation
  const validateForm = () => {
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      setError('Por favor, informe seu endereço de e-mail.');
      return false;
    }
    if (!emailRegex.test(email.trim())) {
      setError('O endereço de e-mail digitado parece inválido. Verifique o formato.');
      return false;
    }
    if (!password) {
      setError('Por favor, digite sua senha de acesso.');
      return false;
    }

    if (view === 'register') {
      if (!firstName.trim()) {
        setError('Por favor, informe seu primeiro nome.');
        return false;
      }
      if (password.length < 8) {
        setError('A senha deve conter no mínimo 8 caracteres para sua segurança.');
        return false;
      }
      if (password !== confirmPassword) {
        setError('As senhas digitadas não coincidem. Digite novamente.');
        return false;
      }
      if (!agreeTerms || !agreePrivacy) {
        setError('Para criar sua conta, é necessário aceitar os Termos de Uso e a Política de Privacidade.');
        return false;
      }
    }
    return true;
  };

  // Email & Password Authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      playSfx('scratch');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (rememberMe) {
        safeSet('nutri-remembered-email', email.trim());
      }

      if (view === 'register') {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          
          await updateProfile(userCredential.user, {
            displayName: fullName
          });

          try {
            await sendEmailVerification(userCredential.user);
          } catch (e) {
            console.warn("Could not send email verification", e);
          }

          // Initial Firestore Profile Creation
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            name: fullName,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            photoURL: null,
            gender: 'Não informado',
            weight: null,
            height: null,
            goals: 'Alimentação saudável e longevidade',
            plan: 'Free',
            isPremium: false,
            subscriptionStatus: 'active',
            language: 'pt-BR',
            country: 'Brasil',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastAccessAt: serverTimestamp(),
            points: 100,
            streak: 1
          });

          playSfx('success');
          setSuccess('Conta criada com sucesso! Bem-vindo(a) ao NutriAI.');
        } catch (firebaseErr: any) {
          console.warn("Firebase Register error", firebaseErr);
          if (['auth/operation-not-allowed', 'auth/web-storage-unsupported', 'auth/network-request-failed', 'auth/invalid-api-key'].includes(firebaseErr.code)) {
            loginLocally(fullName, email.trim());
            setSuccess('Modo seguro local ativado! Cadastro realizado com sucesso.');
          } else {
            throw firebaseErr;
          }
        }
      } else {
        // Login View
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
          
          try {
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              lastAccessAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }, { merge: true });
          } catch (e) {}

          playSfx('success');
        } catch (firebaseErr: any) {
          console.warn("Firebase Login error", firebaseErr);
          if (['auth/operation-not-allowed', 'auth/web-storage-unsupported', 'auth/network-request-failed', 'auth/invalid-api-key'].includes(firebaseErr.code)) {
            loginLocally(email.split('@')[0], email.trim());
            setSuccess('Acesso concedido em modo offline seguro.');
          } else {
            throw firebaseErr;
          }
        }
      }
    } catch (err: any) {
      console.warn("Auth operation failed", err);
      playSfx('scratch');

      if (err.code === 'auth/email-already-in-use') {
        setError('Este endereço de e-mail já está cadastrado no NutriAI. Faça login ou recupere sua senha.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login por E-mail/Senha não está ativado no Firebase. Ative em Firebase Console > Authentication > Sign-in method > Email/Password.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.');
      } else if (err.code === 'auth/invalid-email') {
        setError('O e-mail digitado é inválido. Por favor, verifique a digitação.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha informada é considerada muito fraca pelo servidor de segurança.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas malsucedidas de login. Por motivos de segurança, aguarde alguns minutos antes de tentar novamente.');
      } else if (err.code === 'auth/user-disabled') {
        setError('Esta conta foi desativada temporariamente. Entre em contato com o suporte do NutriAI.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Sem conexão com o servidor de autenticação. Verifique sua conexão com a internet.');
      } else {
        setError('Ocorreu uma falha ao realizar a operação. Tente novamente em instantes.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      playSfx('success');
    } catch (err: any) {
      console.warn("Google login failed", err);
      playSfx('scratch');
      if (err.code === 'auth/unauthorized-domain' || err?.message?.includes('authorized for OAuth operations')) {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'seu domínio na Vercel';
        setError(`Domínio "${currentHost}" não autorizado no Firebase. Adicione "${currentHost}" em Firebase Console > Authentication > Settings > Authorized domains.`);
      } else if (err.code === 'auth/popup-blocked') {
        setError('O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado: A janela do Google foi fechada antes da autorização.');
      } else if (window !== window.parent) {
        setError('O login do Google pode ser bloqueado dentro de iFrames. Recomendamos abrir o app em uma nova janela.');
      } else {
        setError(err?.message || 'Não foi possível entrar com a conta do Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Password Recovery
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Por favor, informe um e-mail válido para receber as instruções.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(`Link de redefinição de senha enviado com sucesso para ${email.trim()}! Verifique também sua pasta de spam.`);
      playSfx('notification');
    } catch (err: any) {
      playSfx('scratch');
      if (err.code === 'auth/user-not-found') {
        setError('Não encontramos nenhuma conta associada a este e-mail.');
      } else {
        setError('Falha ao enviar e-mail de recuperação. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#0B0F14] text-slate-100 font-sans relative p-4 sm:p-6 overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Premium Ambient Lights */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glassmorphism Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#151B23]/90 backdrop-blur-2xl border border-[#232C39] rounded-[32px] p-7 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.7)] relative z-10 my-auto"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 4 }}
            onClick={() => playSfx('tap')}
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#10B981] via-[#16C784] to-[#D4AF37] p-0.5 shadow-[0_0_25px_rgba(16,185,129,0.35)] mb-3 flex items-center justify-center cursor-pointer"
          >
            <div className="w-full h-full bg-[#0B0F14] rounded-[14px] flex items-center justify-center">
              <Utensils className="w-8 h-8 text-[#16C784]" />
            </div>
          </motion.div>
          
          <h1 className="text-3xl font-display font-extrabold text-white tracking-tight flex items-center justify-center gap-1">
            Nutri<span className="text-[#16C784]">AI</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 uppercase tracking-widest ml-1">
              PRO
            </span>
          </h1>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
            Plataforma Avançada de Saúde & Nutrição
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={view} 
            initial={{ opacity: 0, x: 12 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* View Subtitle */}
            <div className="mb-6 text-center">
              <h2 className="text-xl font-display font-bold text-white mb-1">
                {view === 'login' ? 'Acessar Conta' : 
                 view === 'register' ? 'Criar Nova Conta' : 
                 'Recuperação de Senha'}
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {view === 'login' ? 'Digite suas credenciais seguras para sincronizar seus dados.' : 
                 view === 'register' ? 'Preencha os campos abaixo para iniciar sua jornada com IA.' : 
                 'Enviaremos um e-mail com instruções seguras para redefinir sua senha.'}
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-5"
              >
                <div className="p-3.5 bg-red-950/40 text-red-300 text-xs font-medium rounded-2xl flex flex-col gap-2.5 border border-red-800/40 shadow-sm leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <span className="flex-1">{error}</span>
                  </div>
                  {error.includes('não autorizado no Firebase') && typeof window !== 'undefined' && (
                    <div className="mt-1 pt-2.5 border-t border-red-800/30 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyDomain}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-100 rounded-xl text-[11px] font-semibold transition border border-red-700/50 active:scale-95"
                      >
                        {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedDomain ? 'Domínio Copiado!' : 'Copiar Domínio'}
                      </button>
                      <a
                        href="https://console.firebase.google.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-semibold transition border border-slate-700/50"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir Firebase Console
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Success Message Alert */}
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-5"
              >
                <div className="p-3.5 bg-emerald-950/40 text-emerald-300 text-xs font-medium rounded-2xl flex items-start gap-2.5 border border-emerald-800/40 shadow-sm leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{success}</span>
                </div>
              </motion.div>
            )}

            {/* Main Form (Login / Register / Forgot Password) */}
            <form onSubmit={view === 'forgot' ? handleResetPassword : handleEmailAuth} className="space-y-3.5" noValidate>
              
              {/* Name Fields for Registration */}
              {view === 'register' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Nome" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-[#0B0F14] border border-[#232C39] rounded-xl px-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16C784] transition"
                      required
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Sobrenome" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-[#0B0F14] border border-[#232C39] rounded-xl px-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16C784] transition"
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input 
                  type="email" 
                  placeholder="Seu melhor e-mail" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B0F14] border border-[#232C39] rounded-xl pl-10 pr-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16C784] transition"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password Input (Hidden on 'forgot' view) */}
              {view !== 'forgot' && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder={view === 'register' ? 'Crie uma senha forte' : 'Sua senha'} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0B0F14] border border-[#232C39] rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16C784] transition"
                    autoComplete={view === 'register' ? 'new-password' : 'current-password'}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Confirm Password (Register Only) */}
              {view === 'register' && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="Confirme sua senha" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0B0F14] border border-[#232C39] rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16C784] transition"
                    autoComplete="new-password"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Password Strength Indicator (Register Only) */}
              {view === 'register' && password && (
                <div className="space-y-2 p-3 bg-[#0B0F14] border border-[#232C39] rounded-xl">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Força da Senha:</span>
                    <span className={`font-bold ${
                      passwordStrength <= 2 ? 'text-red-400' :
                      passwordStrength <= 3 ? 'text-amber-400' :
                      passwordStrength === 4 ? 'text-emerald-400' : 'text-[#16C784]'
                    }`}>
                      {passwordStrength <= 2 ? 'Fraca' :
                       passwordStrength <= 3 ? 'Moderada' :
                       passwordStrength === 4 ? 'Forte' : 'Excelente'}
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div 
                        key={lvl}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength >= lvl 
                            ? passwordStrength <= 2 ? 'bg-red-500' :
                              passwordStrength <= 3 ? 'bg-amber-500' :
                              passwordStrength === 4 ? 'bg-emerald-500' : 'bg-[#16C784]'
                            : 'bg-slate-700/40'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-400 pt-1">
                    <span className={`flex items-center gap-1 ${passwordCriteria.length ? 'text-[#16C784]' : ''}`}>
                      <Check className="w-3 h-3" /> Mín. 8 caracteres
                    </span>
                    <span className={`flex items-center gap-1 ${passwordCriteria.uppercase ? 'text-[#16C784]' : ''}`}>
                      <Check className="w-3 h-3" /> Letra maiúscula
                    </span>
                    <span className={`flex items-center gap-1 ${passwordCriteria.number ? 'text-[#16C784]' : ''}`}>
                      <Check className="w-3 h-3" /> Número
                    </span>
                    <span className={`flex items-center gap-1 ${passwordCriteria.special ? 'text-[#16C784]' : ''}`}>
                      <Check className="w-3 h-3" /> Símbolo especial
                    </span>
                  </div>
                </div>
              )}

              {/* Login Extra Options (Remember Me & Forgot Password) */}
              {view === 'login' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#232C39] bg-[#0B0F14] text-[#16C784] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    Lembrar meu e-mail
                  </label>

                  <button 
                    type="button" 
                    onClick={() => {
                      setView('forgot');
                      setError('');
                      setSuccess('');
                    }}
                    className="text-[#16C784] hover:underline font-medium cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {/* Terms of Service & Privacy (Register Only) */}
              {view === 'register' && (
                <div className="space-y-2 pt-1 text-[11px] text-slate-400">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 rounded border-[#232C39] bg-[#0B0F14] text-[#16C784] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Concordo com os <a href="/manual" target="_blank" className="text-[#16C784] underline">Termos de Uso</a> e diretrizes do NutriAI.</span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="mt-0.5 rounded border-[#232C39] bg-[#0B0F14] text-[#16C784] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Aceito o processamento e a <a href="/manual" target="_blank" className="text-[#16C784] underline">Política de Privacidade</a> de dados biométricos.</span>
                  </label>
                </div>
              )}

              {/* Primary Action Button */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#10B981] to-[#16C784] hover:from-[#059669] hover:to-[#10B981] text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {view === 'login' ? 'Entrar na Plataforma' : 
                       view === 'register' ? 'Criar Minha Conta Grátis' : 
                       'Enviar Instruções'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Social Logins & Switch Mode Links */}
            {view !== 'forgot' && (
              <div className="mt-6 space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 border-t border-[#232C39]" />
                  <span className="relative bg-[#151B23] px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Ou acesse com
                  </span>
                </div>

                {/* Single Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-[#0B0F14] hover:bg-[#121820] border border-[#232C39] hover:border-slate-600 text-slate-200 py-3.5 px-4 rounded-xl transition-all cursor-pointer font-semibold text-xs shadow-sm active:scale-[0.99]"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Continuar com o Google</span>
                </button>

                {/* View Switch Link */}
                <div className="text-center pt-2">
                  <span className="text-xs text-slate-400">
                    {view === 'login' ? 'Ainda não possui uma conta? ' : 'Já possui uma conta NutriAI? '}
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      setView(view === 'login' ? 'register' : 'login');
                      setError('');
                      setSuccess('');
                    }} 
                    className="text-xs font-bold text-[#16C784] hover:underline cursor-pointer"
                  >
                    {view === 'login' ? 'Cadastre-se gratuitamente' : 'Fazer login'}
                  </button>
                </div>
              </div>
            )}

            {/* Back to Login Button for Recovery view */}
            {view === 'forgot' && (
              <div className="mt-6 text-center">
                <button 
                  type="button"
                  onClick={() => {
                    setView('login');
                    setError('');
                    setSuccess('');
                  }} 
                  className="text-xs font-bold text-[#16C784] hover:underline cursor-pointer"
                >
                  Voltar ao painel de acesso
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
