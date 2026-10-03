import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Star, X, Send, Heart, CheckCircle2, User as UserIcon, Volume2, Volume1, VolumeX, Sliders, Play, Square } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from '../lib/firebase';
import { auth, db } from '../lib/firebase';
import { playSfx, vibrate } from '../lib/sensory';
import { speak, stopSpeech, getVoiceVolume, setVoiceVolume, unlockAudio } from '../lib/speech';
import { UserProfile } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface FeedbackSystemProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  addNotification?: (notif: { title: string; message: string; type: 'achievement' | 'point' | 'streak' | 'info' }) => void;
}

export function FeedbackSystem({ profile, isOpen, onClose, addNotification }: FeedbackSystemProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [userNameInput, setUserNameInput] = useState<string>(profile?.name || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceVolume, setVoiceVolumeState] = useState<number>(() => getVoiceVolume());
  const [showVoiceSettings, setShowVoiceSettings] = useState<boolean>(false);
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState<boolean>(false);
  const [isSpeakingThankYou, setIsSpeakingThankYou] = useState<boolean>(false);
  const closeTimeoutRef = useRef<any>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const hasPlayedVoiceRef = useRef<boolean>(false);

  // Sync external volume updates
  useEffect(() => {
    const handleVolumeChange = (e: any) => {
      if (typeof e.detail === 'number') {
        setVoiceVolumeState(e.detail);
      }
    };
    window.addEventListener('app:voice-volume-changed', handleVolumeChange);
    return () => window.removeEventListener('app:voice-volume-changed', handleVolumeChange);
  }, []);

  // Stop speech when modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopSpeech();
      setIsPlayingTestVoice(false);
      hasPlayedVoiceRef.current = false;
      isSubmittingRef.current = false;
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    }
  }, [isOpen]);

  // Listener para o evento de 'click' no documento para ativar ou reiniciar a API window.speechSynthesis após interação
  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentClick = () => {
      unlockAudio();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch (e) {}
      }
    };

    document.addEventListener('click', handleDocumentClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
    };
  }, [isOpen]);

  // Ativa e reinicia a API window.speechSynthesis síncronamente na interação direta do usuário
  const activateSpeechSynthesis = () => {
    unlockAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        if (typeof SpeechSynthesisUtterance !== 'undefined') {
          const warmUp = new SpeechSynthesisUtterance('');
          warmUp.volume = 0;
          window.speechSynthesis.speak(warmUp);
        }
      } catch (e) {}
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVoiceVolumeState(clamped);
    setVoiceVolume(clamped);
  };

  const handleTestVoice = () => {
    if (isPlayingTestVoice) {
      stopSpeech();
      setIsPlayingTestVoice(false);
      return;
    }
    playSfx('tap');
    setIsPlayingTestVoice(true);
    const testText = "Olá! Este é o nível de volume da minha voz no NutriAI. Como está o som para você?";
    speak(testText, {
      volume: voiceVolume,
      onEnded: () => setIsPlayingTestVoice(false),
      onError: () => setIsPlayingTestVoice(false),
    });
  };

  const ratingFaces = [
    { value: 1, label: 'Muito Ruim', emoji: '😕' },
    { value: 2, label: 'Regular', emoji: '😐' },
    { value: 3, label: 'Bom', emoji: '🙂' },
    { value: 4, label: 'Muito Bom', emoji: '😃' },
    { value: 5, label: 'Excelente!', emoji: '🤩' },
  ];

  // Function to automatically play Malu's thank-you voice with Web Speech API (window.speechSynthesis) and Brazilian voice
  const playMaluThankYou = () => {
    if (hasPlayedVoiceRef.current) return;
    hasPlayedVoiceRef.current = true;

    unlockAudio();
    stopSpeech();

    const speechText = 'Obrigado pelo seu feedback';
    setIsSpeakingThankYou(true);

    const safeClose = () => {
      setIsSpeakingThankYou(false);
      hasPlayedVoiceRef.current = false;
      isSubmittingRef.current = false;
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setShowSuccess(false);
      setComment('');
      // Fecha automaticamente o componente utilizando a propriedade 'onClose'
      onClose();
    };

    // Segurança contra bloqueio de áudio ou travamento: fecha em até 4.5s se nenhum evento disparar
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(safeClose, 4500);

    // 1. Inicialização da API Web Speech (window.speechSynthesis) com SpeechSynthesisUtterance
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        // Desbloqueia e cancela execuções pendentes para evitar bloqueio da fila de áudio do navegador
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = 'pt-BR';

        const currentVol = getVoiceVolume();
        utterance.volume = Math.max(0.8, typeof currentVol === 'number' && currentVol > 0 ? currentVol : 1.0);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Localiza e configura um objeto de voz brasileiro (pt-BR)
        const selectBrazilianVoice = () => {
          try {
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
              // Prioriza vozes brasileiras femininas com entonação suave
              const femaleBrazilianVoice = voices.find(v => 
                (v.lang.replace('_', '-').toLowerCase() === 'pt-br' || v.lang.toLowerCase().startsWith('pt')) &&
                /malu|luciana|maria|leticia|fernanda|helena|francisca|female|mulher|google português/i.test(v.name)
              );
              const anyBrazilianVoice = voices.find(v => 
                v.lang.replace('_', '-').toLowerCase() === 'pt-br'
              );
              const anyPortugueseVoice = voices.find(v => 
                v.lang.toLowerCase().startsWith('pt')
              );

              const chosenVoice = femaleBrazilianVoice || anyBrazilianVoice || anyPortugueseVoice;
              if (chosenVoice) {
                utterance.voice = chosenVoice;
              }
            }
          } catch (e) {}
        };

        selectBrazilianVoice();

        // Se o navegador carregar as vozes assincronamente, atualiza a voz
        if (!utterance.voice && window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => {
            selectBrazilianVoice();
          };
        }

        utterance.onend = () => {
          safeClose();
        };

        utterance.onerror = (event) => {
          console.warn('SpeechSynthesisUtterance error, executando fechamento seguro:', event);
          safeClose();
        };

        // Dispara a fala através do window.speechSynthesis
        window.speechSynthesis.speak(utterance);

        // Tratamento adicional contra bloqueio no Chrome/Safari: chamar resume() após speak()
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        return;
      } catch (speechErr) {
        console.warn('Falha ao usar window.speechSynthesis, usando fallback:', speechErr);
      }
    }

    // 2. Fallback de voz externa através do speak()
    speak(speechText, {
      voice: 'Aoede',
      model: 'gemini-3.8-flash-tts',
      volume: Math.max(0.8, voiceVolume || 1.0),
      lang: 'pt-BR',
      onEnded: safeClose,
      onError: safeClose
    });
  };

  const handleCloseModal = (stopAudio?: boolean | React.SyntheticEvent) => {
    const shouldStop = typeof stopAudio === 'boolean' ? stopAudio : true;
    if (shouldStop) {
      stopSpeech();
    }
    setIsSpeakingThankYou(false);
    hasPlayedVoiceRef.current = false;
    isSubmittingRef.current = false;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setShowSuccess(false);
    setComment('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    // Garante que a API window.speechSynthesis seja ativada ou reiniciada após o evento de clique do usuário
    activateSpeechSynthesis();

    if (!comment.trim()) {
      setError('Por favor, escreva um pequeno comentário sobre sua experiência.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    // Safe UUID generation that works inside any sandbox/iframe
    const feedbackId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const finalUserName = userNameInput.trim() || profile?.name || 'Usuário Anônimo';
    const finalUserId = auth.currentUser?.uid || profile?.email || 'anonymous';

    // Show success view and play Malu's thank-you voice immediately in user gesture context
    playSfx('success');
    vibrate([100, 50, 100]);
    setShowSuccess(true);
    playMaluThankYou();

    if (addNotification) {
      addNotification({
        title: 'Feedback Enviado!',
        message: 'Obrigado por nos ajudar a melhorar o NutriAI!',
        type: 'info',
      });
    }

    try {
      // Save to Firestore with correct UID to pass security rules
      const feedbackRef = doc(collection(db, 'feedbacks'), feedbackId);
      await setDoc(feedbackRef, {
        userId: finalUserId,
        userName: finalUserName,
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.warn('Erro ao enviar feedback para o Firestore, salvando localmente:', err);
      try {
        const localFeedbacks = JSON.parse(safeGet('nutriAI-local-feedbacks') || '[]');
        localFeedbacks.push({
          id: feedbackId,
          userName: finalUserName,
          rating,
          comment: comment.trim(),
          createdAt: new Date().toISOString()
        });
        safeSet('nutriAI-local-feedbacks', JSON.stringify(localFeedbacks));
      } catch (fallbackErr) {}
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            id="feedback-overlay"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-[24px] bg-white shadow-2xl dark:bg-slate-900 border border-emerald-500/15 overflow-hidden my-auto z-10"
            id="feedback-modal-content"
          >
            {/* Background Accent Gradients */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />

            {/* Header / Dismiss (Fixed at Top of Modal) */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 pb-3 sm:pb-4 dark:border-slate-800/80 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <MessageSquare className="h-5 w-5 animate-pulse shrink-0" />
                <h3 className="font-serif text-base sm:text-lg font-medium tracking-wide">Deixe seu Feedback</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Voice Volume Indicator / Quick Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    setShowVoiceSettings(prev => !prev);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all border cursor-pointer ${
                    showVoiceSettings
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-emerald-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Configurar Volume da Voz da IA"
                  id="toggle-feedback-voice-settings-btn"
                >
                  {voiceVolume === 0 ? (
                    <VolumeX className="h-3.5 w-3.5 text-rose-500" />
                  ) : voiceVolume < 0.5 ? (
                    <Volume1 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  <span className="text-[11px] font-mono font-bold">
                    {Math.round(voiceVolume * 100)}%
                  </span>
                  <Sliders className="h-3 w-3 opacity-60" />
                </button>

                <button
                  onClick={handleCloseModal}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  id="close-feedback-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 pt-3 sm:pt-4 custom-scrollbar">
              {/* Collapsible Voice Settings Panel from Header */}
              <AnimatePresence>
                {showVoiceSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-800/60 rounded-xl p-3 mb-4 space-y-2"
                    id="feedback-header-voice-panel"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Configurações de Áudio da Malu (IA)
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {voiceVolume === 0 ? 'Mudo (0%)' : `${Math.round(voiceVolume * 100)}%`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleVolumeChange(voiceVolume === 0 ? 0.7 : 0)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={voiceVolume === 0 ? "Desmutar" : "Silenciar"}
                      >
                        {voiceVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume1 className="w-3.5 h-3.5" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={voiceVolume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                      <button
                        type="button"
                        onClick={handleTestVoice}
                        className="ml-2 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                      >
                        {isPlayingTestVoice ? 'Parar' : 'Testar'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Render view conditionally */}
              {!showSuccess ? (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {/* Rating Section */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t('feedback_experience_question', 'Como está sendo sua experiência?')}
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {ratingFaces.map((face) => {
                        const isSelected = rating === face.value;
                        return (
                          <motion.button
                            key={face.value}
                            type="button"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => {
                              setRating(face.value);
                              playSfx('tap');
                            }}
                            className={`flex flex-col items-center justify-center rounded-xl sm:rounded-2xl py-2 sm:py-2.5 px-1 border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <span className="text-xl sm:text-2xl mb-1">{face.emoji}</span>
                            <span className="text-[9px] sm:text-[10px] font-medium leading-tight text-center truncate w-full">{t(face.label)}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5" /> {t('label_name_optional', 'Nome (Opcional)')}
                    </label>
                    <input
                      type="text"
                      value={userNameInput}
                      onChange={(e) => setUserNameInput(e.target.value)}
                      placeholder={t('placeholder_your_name', 'Ex: Seu Nome')}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-100 resize-none outline-none ring-1 ring-slate-200/50 focus:ring-2 focus:ring-emerald-500 dark:ring-slate-700/50"
                    />
                  </div>

                  {/* Comment Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t('label_message_or_suggestion', 'Sua mensagem ou sugestão')}
                    </label>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t('placeholder_feedback_comment', 'O que você mais gostou ou o que podemos melhorar no NutriAI?')}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-100 resize-none outline-none ring-1 ring-slate-200/50 focus:ring-2 focus:ring-emerald-500 dark:ring-slate-700/50"
                    />
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs font-medium text-red-500"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Submit Actions */}
                  <div className="flex items-center gap-2.5 sm:gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 min-h-[44px] sm:min-h-[48px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-3 sm:px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                      id="cancel-feedback-form-btn"
                    >
                      Cancelar
                    </button>
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      onClick={activateSpeechSynthesis}
                      onPointerDown={activateSpeechSynthesis}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      className="flex-[1.4] min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 px-4 sm:px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 transition-all cursor-pointer select-none whitespace-nowrap"
                      id="submit-feedback-form-btn"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span className="text-xs font-semibold">Enviando...</span>
                        </div>
                      ) : (
                        <>
                          <Send className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                          <span className="leading-none">Enviar Feedback</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              ) : (
                /* Success Screen */
                <div
                  className="flex flex-col items-center justify-center text-center py-4 sm:py-6"
                  id="feedback-success-container"
                >
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 shadow-inner">
                    <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 animate-pulse text-emerald-500" />
                  </div>

                  <h4 className="mt-4 sm:mt-5 font-serif text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
                    Obrigado pelo feedback!
                  </h4>

                  <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    Sua opinião nos motiva a evoluir diariamente e tornar o NutriAI cada vez mais completo e inteligente.
                  </p>

                  <div className="mt-5 flex items-center gap-3 w-full max-w-sm">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleCloseModal(true)}
                      className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
                      id="dismiss-feedback-success-btn"
                    >
                      Fechar
                    </motion.button>
                  </div>

                  <div className="mt-4 sm:mt-5 flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                    <span>Feito com</span>
                    <Heart className="h-4 w-4 fill-rose-500 text-rose-500 animate-bounce" />
                    <span>para você</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
