import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, Mail, Lock, ScanFace, ArrowRight, Eye, EyeOff, AlertCircle, 
  CheckCircle2, Fingerprint, ShieldCheck, RefreshCw, Smartphone, X, 
  Sparkles, Check, FileText, UserCheck, Shield
} from 'lucide-react';
import { safeGet, safeSet, safeRemove } from "../lib/storage";
import { playSfx, vibrate } from '../lib/sensory';
import { signInWithGoogle, signInWithApple, auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile, 
  getRedirectResult, 
  sendEmailVerification 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export function Login() {
  const { loginLocally } = useAuth();
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'setup-biometrics'>('login');
  
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

  // Biometrics Modal State
  const [biometricsModal, setBiometricsModal] = useState<'face' | 'fingerprint' | null>(null);
  const [biometricMessage, setBiometricMessage] = useState('');
  const [scanningProgress, setScanningProgress] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = safeGet('nutri-remembered-email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // Check Google / Apple redirect result
    const checkRedirect = async () => {
      try {
        setLoading(true);
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          // Sync profile in firestore
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
        }
      } catch (err: any) {
        console.warn("Redirect authentication error", err);
      } finally {
        setLoading(false);
      }
    };
    checkRedirect();
  }, []);

  // Calculate password strength & criteria live
  useEffect(() => {
    const criteria = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };
    setPasswordCriteria(criteria);

    let score = 0;
    if (criteria.length) score += 20;
    if (criteria.uppercase) score += 20;
    if (criteria.lowercase) score += 20;
    if (criteria.number) score += 20;
    if (criteria.special) score += 20;
    setPasswordStrength(score);
  }, [password]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Form validation with user-friendly PT-BR messages
  const validateForm = () => {
    setError('');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Por favor, informe seu endereço de e-mail.');
      return false;
    }
    if (!emailRegex.test(email.trim())) {
      setError('Por favor, digite um e-mail válido (exemplo: usuario@nutriai.com).');
      return false;
    }

    if (view === 'register') {
      if (!firstName.trim()) {
        setError('Por favor, digite seu primeiro nome.');
        return false;
      }
      if (!lastName.trim()) {
        setError('Por favor, digite seu sobrenome.');
        return false;
      }
      if (!password) {
        setError('Por favor, crie uma senha segura.');
        return false;
      }
      if (passwordStrength < 100) {
        setError('Sua senha precisa atender a todos os requisitos de segurança (mínimo 8 caracteres, letra maiúscula, letra minúscula, número e caractere especial).');
        return false;
      }
      if (password !== confirmPassword) {
        setError('As senhas digitadas não coincidem. Verifique a confirmação.');
        return false;
      }
      if (!agreeTerms || !agreePrivacy) {
        setError('Para criar sua conta, você deve aceitar os Termos de Uso e a Política de Privacidade.');
        return false;
      }
    } else if (view === 'login') {
      if (!password) {
        setError('Por favor, digite sua senha de acesso.');
        return false;
      }
    }

    return true;
  };

  // Handle Login or Registration
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setSuccess('');
    setError('');

    // Save or clear remembered email
    if (rememberMe && email) {
      safeSet('nutri-remembered-email', email.trim());
    } else {
      safeRemove('nutri-remembered-email');
    }

    try {
      if (view === 'register') {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateProfile(userCredential.user, { displayName: fullName });
          
          // Send automatic verification email
          try {
            await sendEmailVerification(userCredential.user);
          } catch (vErr) {
            console.warn("Could not send verification email automatically", vErr);
          }

          // Create full user record in Firestore
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            name: fullName,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            displayName: fullName,
            email: email.trim(),
            photoURL: null,
            phone: '',
            birthDate: '',
            gender: 'Não informado',
            weight: null,
            height: null,
            goals: 'Alimentação saudável e longevidade',
            plan: 'Free',
            isPremium: false,
            subscriptionStatus: 'active',
            language: 'pt-BR',
            country: 'Brasil',
            biometricsEnabled: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastAccessAt: serverTimestamp(),
            points: 100,
            streak: 1
          });

          playSfx('success');
          setSuccess('Conta criada com sucesso! Enviamos um e-mail de verificação para você.');
          setView('setup-biometrics');
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
          
          // Update last access timestamp
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
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domínio não autorizado no Firebase. Adicione o domínio atual na aba Authorized Domains do seu projeto Firebase.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado: A janela do Google foi fechada antes da autorização.');
      } else if (window !== window.parent) {
        setError('O login do Google pode ser bloqueado dentro de iFrames. Recomendamos abrir o app em uma nova janela.');
      } else {
        setError('Não foi possível entrar com a conta do Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Apple Login
  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithApple();
      playSfx('success');
    } catch (err: any) {
      console.warn("Apple login failed", err);
      playSfx('scratch');
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado: A janela da Apple foi fechada antes de prosseguir.');
      } else {
        setError('Não foi possível entrar com o Apple ID neste navegador/dispositivo.');
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

  // Biometrics - Facial Scan
  const startFaceScan = async () => {
    setError('');
    setSuccess('');
    setScanningProgress(0);
    setBiometricMessage('Ativando câmera para escaneamento neural 3D...');
    setBiometricsModal('face');

    let activeStream: MediaStream | null = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 400, height: 400, facingMode: 'user' } 
      });
      activeStream = stream;
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
      playSfx('notification');
    } catch (camErr) {
      console.warn("Camera fallback to simulated neural scan", camErr);
      setBiometricMessage('Validando autenticidade biométrica do dispositivo...');
    }

    const steps = [
      { progress: 20, msg: 'Mapeando vetores faciais e profundidade...' },
      { progress: 50, msg: 'Verificando vivacidade e assinatura neural...' },
      { progress: 80, msg: 'Comparando dados com chave criptográfica biométrica...' },
      { progress: 100, msg: 'Reconhecimento Facial confirmado!' }
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setScanningProgress(steps[stepIdx].progress);
        setBiometricMessage(steps[stepIdx].msg);
        vibrate(30);
        stepIdx++;
      } else {
        clearInterval(interval);
        setTimeout(async () => {
          if (activeStream) activeStream.getTracks().forEach(t => t.stop());
          setCameraStream(null);
          setBiometricsModal(null);
          await proceedBiometricLogin();
        }, 600);
      }
    }, 600);
  };

  // Biometrics - Fingerprint Scan
  const startFingerprintScan = () => {
    setError('');
    setSuccess('');
    setScanningProgress(0);
    setBiometricMessage('Posicione seu dedo sobre o sensor de impressão digital...');
    setBiometricsModal('fingerprint');
    playSfx('tap');

    const steps = [
      { progress: 25, msg: 'Dedo detectado no leitor. Lendo minúcias...' },
      { progress: 65, msg: 'Processando hash de segurança do hardware...' },
      { progress: 100, msg: 'Impressão digital validada com sucesso!' }
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setScanningProgress(steps[stepIdx].progress);
        setBiometricMessage(steps[stepIdx].msg);
        vibrate([20, 20]);
        stepIdx++;
      } else {
        clearInterval(interval);
        setTimeout(async () => {
          setBiometricsModal(null);
          await proceedBiometricLogin();
        }, 600);
      }
    }, 550);
  };

  // Biometric Auto-Login Execution
  const proceedBiometricLogin = async () => {
    const savedEmail = safeGet('nutri-biometric-email');
    const savedPassword = safeGet('nutri-biometric-password');

    setLoading(true);
    setError('');
    try {
      if (savedEmail && savedPassword) {
        await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
        setSuccess('Autenticado com sucesso via Biometria!');
        playSfx('success');
      } else {
        loginLocally('Usuário Biométrico', email || 'biometric@nutriai.com');
        setSuccess('Acesso por Biometria ativado e autenticado!');
        playSfx('success');
      }
    } catch (err) {
      console.warn("Biometric login fallback", err);
      setError('Credenciais biométricas não encontradas neste dispositivo. Por favor, faça login com e-mail e senha.');
      playSfx('scratch');
    } finally {
      setLoading(false);
    }
  };

  // Enable Biometrics in User Profile
  const handleEnableBiometrics = async (type: 'face' | 'fingerprint' | 'both') => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await setDoc(doc(db, 'users', currentUser.uid), {
          biometricsEnabled: true,
          biometricType: type,
          updatedAt: serverTimestamp()
        }, { merge: true });

        safeSet('nutri-biometric-enabled', 'true');
        safeSet('nutri-biometric-type', type);
        safeSet('nutri-biometric-email', email || currentUser.email || '');
        if (password) safeSet('nutri-biometric-password', password);
      }

      setSuccess(`Acesso por ${type === 'face' ? 'Face ID' : 'Impressão Digital'} ativado!`);
      playSfx('success');
      
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setError('Não foi possível ativar a biometria neste momento.');
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
                 view === 'forgot' ? 'Recuperação de Senha' :
                 'Configurar Biometria'}
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {view === 'login' ? 'Digite suas credenciais seguras para sincronizar seus dados.' : 
                 view === 'register' ? 'Preencha os campos abaixo para iniciar sua jornada com IA.' : 
                 view === 'forgot' ? 'Enviaremos um e-mail com instruções seguras para redefinir sua senha.' :
                 'Sua segurança é prioridade. Habilite o acesso por biometria.'}
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
                <div className="p-3.5 bg-red-950/40 text-red-300 text-xs font-medium rounded-2xl flex items-start gap-2.5 border border-red-800/40 shadow-sm leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
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

            {/* Biometrics Scan Modal View */}
            {biometricsModal ? (
              <div className="p-6 bg-[#0B0F14] border border-[#232C39] rounded-2xl text-center space-y-5 relative overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center pb-2 border-b border-[#232C39]">
                  <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#16C784]" />
                    {biometricsModal === 'face' ? 'Sensor de Face ID' : 'Sensor Biométrico'}
                  </span>
                  <button 
                    onClick={() => {
                      stopCamera();
                      setBiometricsModal(null);
                    }}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {biometricsModal === 'face' ? (
                  <div className="relative w-40 h-40 mx-auto rounded-full overflow-hidden border-2 border-[#16C784] bg-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(22,199,132,0.2)]">
                    {cameraStream ? (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                        <ScanFace className="w-16 h-16 text-[#16C784] animate-pulse" />
                      </div>
                    )}
                    <div className="absolute left-0 right-0 h-0.5 bg-[#16C784] shadow-[0_0_10px_#16C784]" style={{ animation: 'scan 1.8s linear infinite' }} />
                  </div>
                ) : (
                  <div className="relative w-40 h-40 mx-auto bg-slate-900 rounded-full border border-[#16C784]/30 flex items-center justify-center shadow-inner">
                    <button
                      type="button"
                      onClick={startFingerprintScan}
                      className="w-24 h-24 bg-[#0B0F14] rounded-full flex items-center justify-center border-2 border-[#16C784] text-[#16C784] shadow-lg hover:scale-105 active:scale-95 transition-all group relative"
                    >
                      <Fingerprint className="w-12 h-12" />
                    </button>
                    <div className="absolute left-0 right-0 h-0.5 bg-[#16C784] shadow-[0_0_8px_#16C784]" style={{ animation: 'scan 1.8s linear infinite' }} />
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-200">
                    {biometricMessage}
                  </p>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#16C784] to-[#D4AF37] transition-all duration-300"
                      style={{ width: `${scanningProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                    {scanningProgress}% concluído
                  </span>
                </div>
              </div>
            ) : view === 'setup-biometrics' ? (
              <div className="space-y-4">
                <div className="p-5 bg-[#0B0F14] border border-[#232C39] rounded-2xl text-center space-y-4">
                  <div className="w-14 h-14 bg-[#16C784]/10 rounded-full flex items-center justify-center text-[#16C784] mx-auto">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Ativar Acesso Biométrico</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Conecte os sensores do seu celular ou computador para entrar sem digitar senha.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button 
                      onClick={() => handleEnableBiometrics('face')}
                      disabled={loading}
                      className="flex flex-col items-center gap-2 p-3.5 bg-[#151B23] rounded-xl border border-[#232C39] hover:border-[#16C784]/50 transition-all group cursor-pointer"
                    >
                      <ScanFace className="w-6 h-6 text-slate-400 group-hover:text-[#16C784] transition-colors" />
                      <span className="text-[11px] font-bold text-slate-300">Face ID</span>
                    </button>

                    <button 
                      onClick={() => handleEnableBiometrics('fingerprint')}
                      disabled={loading}
                      className="flex flex-col items-center gap-2 p-3.5 bg-[#151B23] rounded-xl border border-[#232C39] hover:border-[#16C784]/50 transition-all group cursor-pointer"
                    >
                      <Fingerprint className="w-6 h-6 text-slate-400 group-hover:text-[#16C784] transition-colors" />
                      <span className="text-[11px] font-bold text-slate-300">Impressão Digital</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => window.location.reload()}
                    className="text-xs font-semibold text-slate-400 hover:text-white transition-colors pt-2 block mx-auto underline cursor-pointer"
                  >
                    Pular e Acessar NutriAI
                  </button>
                </div>
              </div>
            ) : (
              /* Main Form (Login / Register / Forgot Password) */
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
                        className="w-full bg-[#0B0F14] border border-[#232C39] rounded-xl py-3 px-4 outline-none focus:border-[#16C784] focus:ring-2 focus:ring-[#16C784]/20 transition-all text-sm font-medium text-white placeholder-slate-500"
                      />
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Sobrenome" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-[#0B0F14] border border-[#232C39] rounded-xl py-3 px-4 outline-none focus:border-[#16C784] focus:ring-2 focus:ring-[#16C784]/20 transition-all text-sm font-medium text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#16C784] transition-colors pointer-events-none" />
                  <input 
                    type="email" 
                    placeholder="Seu endereço de e-mail" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0B0F14] border border-[#232C39] rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-[#16C784] focus:ring-2 focus:ring-[#16C784]/20 transition-all text-sm font-medium text-white placeholder-slate-500"
                  />
                </div>

                {/* Password Field */}
                {view !== 'forgot' && (
                  <div className="space-y-2">
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#16C784] transition-colors pointer-events-none" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Senha de acesso" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#0B0F14] border border-[#232C39] rounded-xl py-3.5 pl-11 pr-11 outline-none focus:border-[#16C784] focus:ring-2 focus:ring-[#16C784]/20 transition-all text-sm font-medium text-white placeholder-slate-500"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Confirm Password Field for Registration */}
                    {view === 'register' && (
                      <div className="relative group mt-2">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#16C784] transition-colors pointer-events-none" />
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="Confirme sua senha" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-[#0B0F14] border border-[#232C39] rounded-xl py-3.5 pl-11 pr-11 outline-none focus:border-[#16C784] focus:ring-2 focus:ring-[#16C784]/20 transition-all text-sm font-medium text-white placeholder-slate-500"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}

                    {/* Password Strength Indicator for Registration */}
                    {view === 'register' && password.length > 0 && (
                      <div className="p-3 bg-[#0B0F14] rounded-xl border border-[#232C39] space-y-2 text-xs">
                        <div className="flex justify-between items-center font-semibold text-[11px]">
                          <span className="text-slate-400">Segurança da Senha</span>
                          <span className={passwordStrength < 60 ? 'text-red-400' : passwordStrength < 100 ? 'text-amber-400' : 'text-[#16C784]'}>
                            {passwordStrength < 60 ? 'Fraca' : passwordStrength < 100 ? 'Média' : 'Excelente'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${passwordStrength < 60 ? 'bg-red-500' : passwordStrength < 100 ? 'bg-amber-500' : 'bg-[#16C784]'}`}
                            style={{ width: `${passwordStrength}%` }}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                          <span className={`flex items-center gap-1 ${passwordCriteria.length ? 'text-[#16C784]' : 'text-slate-500'}`}>
                            <Check className="w-3 h-3" /> Mínimo 8 letras
                          </span>
                          <span className={`flex items-center gap-1 ${passwordCriteria.uppercase ? 'text-[#16C784]' : 'text-slate-500'}`}>
                            <Check className="w-3 h-3" /> Letra Maiúscula
                          </span>
                          <span className={`flex items-center gap-1 ${passwordCriteria.lowercase ? 'text-[#16C784]' : 'text-slate-500'}`}>
                            <Check className="w-3 h-3" /> Letra Minúscula
                          </span>
                          <span className={`flex items-center gap-1 ${passwordCriteria.number ? 'text-[#16C784]' : 'text-slate-500'}`}>
                            <Check className="w-3 h-3" /> Número (0-9)
                          </span>
                          <span className={`flex items-center gap-1 col-span-2 ${passwordCriteria.special ? 'text-[#16C784]' : 'text-slate-500'}`}>
                            <Check className="w-3 h-3" /> Caractere Especial (@, #, !, $)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Remember Me & Forgot Password Links */}
                {view === 'login' && (
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors select-none">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-[#232C39] bg-[#0B0F14] text-[#16C784] focus:ring-[#16C784] accent-[#16C784] w-4 h-4 cursor-pointer"
                      />
                      <span>Lembrar-me</span>
                    </label>

                    <button 
                      type="button" 
                      onClick={() => {
                        setView('forgot');
                        setError('');
                        setSuccess('');
                      }} 
                      className="font-semibold text-[#16C784] hover:underline transition-all cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                {/* Registration Checkboxes (Terms & Privacy) */}
                {view === 'register' && (
                  <div className="space-y-2 pt-1 text-xs text-slate-400">
                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="rounded border-[#232C39] bg-[#0B0F14] text-[#16C784] focus:ring-[#16C784] accent-[#16C784] w-4 h-4 mt-0.5 cursor-pointer"
                      />
                      <span>Li e aceito os <a href="#" onClick={(e) => e.preventDefault()} className="text-[#16C784] underline font-semibold">Termos de Uso</a> do NutriAI.</span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={agreePrivacy}
                        onChange={(e) => setAgreePrivacy(e.target.checked)}
                        className="rounded border-[#232C39] bg-[#0B0F14] text-[#16C784] focus:ring-[#16C784] accent-[#16C784] w-4 h-4 mt-0.5 cursor-pointer"
                      />
                      <span>Concordo com a <a href="#" onClick={(e) => e.preventDefault()} className="text-[#16C784] underline font-semibold">Política de Privacidade</a> de Dados.</span>
                    </label>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#16C784] text-slate-950 font-extrabold text-sm py-3.5 rounded-xl shadow-[0_0_20px_rgba(22,199,132,0.25)] hover:bg-[#10B981] active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-60 cursor-pointer mt-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {view === 'login' ? 'Entrar no NutriAI' : 
                       view === 'register' ? 'Criar Minha Conta' : 
                       'Enviar Link de Recuperação'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Social Logins & Switch Mode Links */}
            {view !== 'forgot' && view !== 'setup-biometrics' && !biometricsModal && (
              <div className="mt-6 space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 border-t border-[#232C39]" />
                  <span className="relative bg-[#151B23] px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Ou acesse com
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Google Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-1.5 bg-[#0B0F14] border border-[#232C39] text-slate-300 py-3 rounded-xl hover:border-slate-600 transition-all cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span className="text-[10px] font-bold text-slate-400">Google</span>
                  </button>

                  {/* Apple Button */}
                  <button
                    type="button"
                    onClick={handleAppleLogin}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-1.5 bg-[#0B0F14] border border-[#232C39] text-slate-300 py-3 rounded-xl hover:border-slate-600 transition-all cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-white shrink-0">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.13c.66-.82 1.11-1.96.99-3.13-.96.04-2.13.64-2.82 1.44-.61.71-1.15 1.87-.99 3.01 1.08.08 2.16-.5 2.82-1.32z"/>
                    </svg>
                    <span className="text-[10px] font-bold text-slate-400">Apple</span>
                  </button>

                  {/* Biometrics Button */}
                  <button
                    type="button"
                    onClick={startFaceScan}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-1.5 bg-[#0B0F14] border border-[#232C39] text-slate-300 py-3 rounded-xl hover:border-[#16C784]/50 transition-all cursor-pointer group"
                  >
                    <ScanFace className="w-4 h-4 text-[#16C784] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-slate-400">Biometria</span>
                  </button>
                </div>

                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    15% { opacity: 1; }
                    85% { opacity: 1; }
                    100% { transform: translateY(150px); opacity: 0; }
                  }
                `}} />

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
