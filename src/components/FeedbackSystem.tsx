import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Star, X, Send, Heart, CheckCircle2, User as UserIcon } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from '../lib/firebase';
import { auth, db } from '../lib/firebase';
import { playSfx, vibrate } from '../lib/sensory';
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

  const ratingFaces = [
    { value: 1, label: 'Muito Ruim', emoji: '😕' },
    { value: 2, label: 'Regular', emoji: '😐' },
    { value: 3, label: 'Bom', emoji: '🙂' },
    { value: 4, label: 'Muito Bom', emoji: '😃' },
    { value: 5, label: 'Excelente!', emoji: '🤩' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Por favor, escreva um pequeno comentário sobre sua experiência.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Safe UUID generation that works inside any sandbox/iframe
    const feedbackId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const finalUserName = userNameInput.trim() || 'Usuário Anônimo';
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
      setTimeout(() => {
        // Reset and close
        setShowSuccess(false);
        setComment('');
        onClose();
      }, 2200);

    } catch (err: any) {
      console.warn('Erro ao enviar feedback para o Firestore, tentando salvar localmente:', err);
      
      // Fallback: Save to LocalStorage so we don't block the user's positive experience!
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
        setTimeout(() => {
          setShowSuccess(false);
          setComment('');
          onClose();
        }, 2200);
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
            onClick={onClose}
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
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                id="close-feedback-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Render view conditionally to avoid nested AnimatePresence stuck states */}
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
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:active:bg-slate-700 transition-colors cursor-pointer"
                    id="cancel-feedback-form-btn"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
                    id="submit-feedback-form-btn"
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Enviar Feedback
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            ) : (
              /* Success Screen with robust pure CSS and pulse animation */
              <div
                className="mt-8 flex flex-col items-center justify-center text-center py-8"
                id="feedback-success-container"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 animate-transform transform hover:scale-110 duration-300">
                  <CheckCircle2 className="h-12 w-12 animate-pulse" />
                </div>

                <h4 className="mt-6 font-serif text-2xl font-bold text-slate-800 dark:text-white">
                  Obrigado pelo feedback!
                </h4>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Sua opinião nos motiva a evoluir diariamente e tornar o NutriAI cada vez mais completo e inteligente.
                </p>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playSfx('tap');
                    setShowSuccess(false);
                    setComment('');
                    onClose();
                  }}
                  className="mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
                  id="dismiss-feedback-success-btn"
                >
                  Fechar
                </motion.button>

                <div className="mt-6 flex items-center gap-1.5 text-xs text-rose-500 font-semibold animate-pulse">
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
