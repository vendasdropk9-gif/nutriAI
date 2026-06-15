import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Star, X, Send, Heart, CheckCircle2, User as UserIcon } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
    { value: 1, label: 'Muito Ruim', emoji: '😕', color: 'hover:text-red-500' },
    { value: 2, label: 'Regular', emoji: '😐', color: 'hover:text-orange-500' },
    { value: 3, label: 'Bom', emoji: '🙂', color: 'hover:text-yellow-500' },
    { value: 4, label: 'Muito Bom', emoji: '😃', color: 'hover:text-emerald-400' },
    { value: 5, label: 'Excelente!', emoji: '🤩', color: 'hover:text-emerald-500 animate-bounce' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Por favor, escreva um pequeno comentário sobre sua experiência.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const feedbackId = crypto.randomUUID();
    const finalUserName = userNameInput.trim() || 'Usuário Anônimo';

    try {
      // Save to Firestore
      const feedbackRef = doc(collection(db, 'feedbacks'), feedbackId);
      await setDoc(feedbackRef, {
        userId: profile?.email || 'anonymous',
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
      }, 3500);

    } catch (err: any) {
      console.error('Erro ao enviar feedback para o Firestore:', err);
      
      // Fallback: Save to LocalStorage so we don't block the user's positive experience!
      try {
        const localFeedbacks = JSON.parse(localStorage.getItem('nutriAI-local-feedbacks') || '[]');
        localFeedbacks.push({
          id: feedbackId,
          userName: finalUserName,
          rating,
          comment: comment.trim(),
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('nutriAI-local-feedbacks', JSON.stringify(localFeedbacks));

        playSfx('success');
        vibrate([100, 50, 100]);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setComment('');
          onClose();
        }, 3500);
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

            <AnimatePresence mode="wait">
              {!showSuccess ? (
                <motion.form
                  key="feedback-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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
                      className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-100 dark:focus:bg-slate-900"
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
                      className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-100 dark:focus:bg-slate-900 resize-none"
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
                      className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:active:bg-slate-700 transition-colors"
                      id="cancel-feedback-form-btn"
                    >
                      Cancelar
                    </button>
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 disabled:opacity-50 transition-all"
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
                </motion.form>
              ) : (
                /* Success Screen with custom animation */
                <motion.div
                  key="feedback-success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-8 flex flex-col items-center justify-center text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ delay: 0.15, duration: 0.5, type: 'spring' }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20"
                  >
                    <CheckCircle2 className="h-12 w-12 animate-pulse" />
                  </motion.div>

                  <motion.h4
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 font-serif text-2xl font-bold text-slate-800 dark:text-white"
                  >
                    Obrigado pelo feedback!
                  </motion.h4>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm"
                  >
                    Sua opinião nos motiva a evoluir diariamente e tornar o NutriAI cada vez mais completo e inteligente.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ delay: 0.6, duration: 1.5, repeat: Infinity }}
                    className="mt-6 flex items-center gap-1.5 text-xs text-rose-500 font-semibold"
                  >
                    <span>Feito com</span>
                    <Heart className="h-3 w-3 fill-rose-500 animate-bounce" />
                    <span>para você</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
