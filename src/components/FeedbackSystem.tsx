import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Star, X, Send, Heart, CheckCircle2, User as UserIcon, Volume2, Volume1, VolumeX, Sliders, Play, Square } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from '../lib/firebase';
import { auth, db } from '../lib/firebase';
import { playSfx, vibrate } from '../lib/sensory';
import { speak, stopSpeech, getVoiceVolume, setVoiceVolume } from '../lib/speech';
import { UserProfile } from '../types';

interface FeedbackSystemProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  addNotification?: (notif: { title: string; message: string; type: 'achievement' | 'point' | 'streak' | 'info' }) => void;
}

export function FeedbackSystem({ profile, isOpen, onClose, addNotification }: FeedbackSystemProps) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [userNameInput, setUserNameInput] = useState<string>(profile?.name || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceVolume, setVoiceVolumeState] = useState<number>(() => getVoiceVolume());
  const [showVoiceSettings, setShowVoiceSettings] = useState<boolean>(false);
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState<boolean>(false);
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

  // Function to automatically play Malu's thank-you voice exactly once
  const playMaluThankYou = (name?: string) => {
    if (hasPlayedVoiceRef.current) return;
    hasPlayedVoiceRef.current = true;

    const rawName = name?.trim() || profile?.name?.trim() || '';
    const firstName = rawName && !['usuário', 'usuario', 'usuário anônimo', 'anonimo', 'anônimo', ''].includes(rawName.toLowerCase())
      ? rawName.split(' ')[0]
      : null;

    const speechText = firstName
      ? `Muito obrigada pelo seu feedback, ${firstName}! Sua opinião nos ajuda muito a melhorar e evoluir o NutriAI para você.`
      : `Muito obrigada pelo seu feedback! Sua opinião nos ajuda muito a melhorar e evoluir o NutriAI para você.`;

    speak(speechText);
  };

  const handleCloseModal = () => {
    stopSpeech();
    hasPlayedVoiceRef.current = false;
    isSubmittingRef.current = false;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setShowSuccess(false);
    setComment('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

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

      playSfx('success');
      vibrate([100, 50, 100]);

      if (addNotification) {
        addNotification({
          title: 'Feedback Enviado!',
          message: 'Obrigado por nos ajudar a melhorar o NutriAI!',
          type: 'info',
        });
      }

      setShowSuccess(true);
      // Play Malu voice automatically
      playMaluThankYou(finalUserName);

      // Schedule auto-close smoothly
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = setTimeout(() => {
        handleCloseModal();
      }, 5500);

    } catch (err: any) {
      console.warn('Erro ao enviar feedback para o Firestore, tentando salvar localmente:', err);
      
      // Fallback: Save to LocalStorage
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

        playSfx('success');
        vibrate([100, 50, 100]);
        setShowSuccess(true);
        // Play Malu voice automatically
        playMaluThankYou(finalUserName);

        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => {
          handleCloseModal();
        }, 5500);
      } catch (fallbackErr) {
        setError('Ocorreu um erro ao processar seu feedback. Tente novamente mais tarde.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            id="feedback-overlay"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[24px] bg-white p-6 shadow-2xl dark:bg-slate-900 border border-emerald-500/10"
            id="feedback-modal-content"
          >
            {/* Background Accent Gradients */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />

            {/* Header / Dismiss */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/80">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <MessageSquare className="h-5 w-5 animate-pulse" />
                <h3 className="font-serif text-lg font-medium tracking-wide">Deixe seu Feedback</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Voice Volume Indicator / Quick Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    setShowVoiceSettings(prev => !prev);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all border ${
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
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                  id="close-feedback-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Collapsible Voice Settings Panel from Header */}
            <AnimatePresence>
              {showVoiceSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/60 -mx-6 px-6 py-3 space-y-2"
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
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                      className="ml-2 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
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
                className="mt-6 space-y-5"
              >
                {/* Rating Section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Como está sendo sua experiência?
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {ratingFaces.map((face) => {
                      const isSelected = rating === face.value;
                      return (
                        <motion.button
                          key={face.value}
                          type="button"
                          whileHover={{ scale: 1.12 }}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => {
                            setRating(face.value);
                            playSfx('tap');
                          }}
                          className={`flex flex-col items-center justify-center rounded-2xl py-3 border transition-all ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                              : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <span className="text-2xl mb-1">{face.emoji}</span>
                          <span className="text-[10px] font-medium leading-tight text-center">{face.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5" /> Nome (Opcional)
                  </label>
                  <input
                    type="text"
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    placeholder="Ex: Seu Nome"
                    className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-500  dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-100 resize-none outline-none ring-1 ring-slate-200/50 focus:ring-2 focus:ring-emerald-500 dark:ring-slate-700/50"
                  />
                </div>

                {/* Comment Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Sua mensagem ou sugestão
                  </label>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="O que você mais gostou ou o que podemos melhorar no NutriAI?"
                    className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-100 resize-none outline-none ring-1 ring-slate-200/50 focus:ring-2 focus:ring-emerald-500 dark:ring-slate-700/50"
                  />
                </div>

                {/* Voice Volume Control Setting */}
                <div 
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-2.5 transition-all"
                  id="feedback-voice-volume-setting-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        {voiceVolume === 0 ? (
                          <VolumeX className="w-4 h-4 text-rose-500" />
                        ) : voiceVolume < 0.5 ? (
                          <Volume1 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            Volume da Voz da IA (Chef Malu)
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                            {voiceVolume === 0 ? 'Mudo' : `${Math.round(voiceVolume * 100)}%`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Ajuste o volume da síntese de fala independentemente do som do sistema
                        </p>
                      </div>
                    </div>

                    {/* Test Voice Button */}
                    <button
                      type="button"
                      onClick={handleTestVoice}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer shrink-0 ${
                        isPlayingTestVoice
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      id="test-feedback-voice-volume-btn"
                      title="Ouvir teste de voz no volume atual"
                    >
                      {isPlayingTestVoice ? (
                        <>
                          <Square className="w-3 h-3 fill-white" />
                          <span>Parar</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-white" />
                          <span>Testar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleVolumeChange(voiceVolume === 0 ? 0.7 : 0)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                      title={voiceVolume === 0 ? "Desmutar voz" : "Silenciar voz"}
                    >
                      {voiceVolume === 0 ? (
                        <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Volume1 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={voiceVolume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                      id="feedback-voice-volume-slider"
                    />

                    <button
                      type="button"
                      onClick={() => handleVolumeChange(1.0)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                      title="Volume máximo"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Níveis rápidos:</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { label: 'Mudo', val: 0 },
                        { label: '30%', val: 0.3 },
                        { label: '70%', val: 0.7 },
                        { label: '100%', val: 1.0 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            playSfx('tap');
                            handleVolumeChange(preset.val);
                          }}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition ${
                            Math.abs(voiceVolume - preset.val) < 0.05
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
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
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 min-h-[48px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                    id="cancel-feedback-form-btn"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className="flex-[1.4] min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 transition-all cursor-pointer select-none whitespace-nowrap"
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
                className="mt-6 flex flex-col items-center justify-center text-center py-6"
                id="feedback-success-container"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 shadow-inner">
                  <CheckCircle2 className="h-12 w-12 animate-pulse text-emerald-500" />
                </div>

                <h4 className="mt-5 font-serif text-2xl font-bold text-slate-800 dark:text-white">
                  Obrigado pelo feedback!
                </h4>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Sua opinião nos motiva a evoluir diariamente e tornar o NutriAI cada vez mais completo e inteligente.
                </p>

                {/* Compact Volume Control on Success Screen */}
                <div 
                  className="mt-4 w-full max-w-sm rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 flex items-center justify-between gap-2.5"
                  id="feedback-success-voice-volume-bar"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    {voiceVolume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Volume da Voz: {Math.round(voiceVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={voiceVolume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                    id="feedback-success-voice-volume-slider"
                  />
                </div>

                <div className="mt-5 flex items-center gap-3 w-full max-w-sm">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCloseModal}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
                    id="dismiss-feedback-success-btn"
                  >
                    Fechar
                  </motion.button>
                </div>

                <div className="mt-5 flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                  <span>Feito com</span>
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500 animate-bounce" />
                  <span>para você</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
