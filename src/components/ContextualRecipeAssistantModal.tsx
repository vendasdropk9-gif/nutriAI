import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChefHat, Sparkles, BookOpen, ArrowRightLeft, Flame, Lightbulb, 
  CheckCircle2, Volume2, Loader2, X, RefreshCw, MessageSquare, 
  Send, Package, ShieldCheck, Zap
} from 'lucide-react';
import { Recipe, UserProfile, ContextualRecipeAdvice } from '../types';
import { generateContextualRecipeAdvice } from '../lib/gemini';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query } from '../lib/firebase';
import { safeGet } from '../lib/storage';

interface ContextualRecipeAssistantModalProps {
  recipe: Recipe;
  profile?: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContextualRecipeAssistantModal({
  recipe,
  profile,
  isOpen,
  onClose
}: ContextualRecipeAssistantModalProps) {
  const [activeTab, setActiveTab] = useState<'techniques' | 'pantry_substitutions' | 'ask_chef'>('techniques');
  const [loading, setLoading] = useState<boolean>(false);
  const [advice, setAdvice] = useState<ContextualRecipeAdvice | null>(null);
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Load Pantry items from Firestore or localStorage
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const loadPantry = async () => {
      let items: string[] = [];
      try {
        // Try local storage first
        const storedFridge = safeGet('nutri_fridge_items');
        if (storedFridge) {
          const parsed = JSON.parse(storedFridge);
          if (Array.isArray(parsed)) {
            items = parsed.map((i: any) => typeof i === 'string' ? i : (i.name || '')).filter(Boolean);
          }
        }

        // Try Firestore if available
        if (auth.currentUser && (!items || items.length === 0)) {
          const userPantryRef = collection(db, 'users', auth.currentUser.uid, 'pantry');
          const snap = await getDocs(query(userPantryRef));
          if (!snap.empty) {
            const fsItems = snap.docs.map(doc => doc.data()?.name || doc.data()?.title).filter(Boolean);
            if (fsItems.length > 0) items = fsItems;
          }
        }
      } catch (err) {
        console.warn("Aviso ao carregar itens da despensa:", err);
      }

      if (items.length === 0) {
        items = ["Iogurte Grego Natural", "Azeite de Oliva Extra Virgem", "Ovos Caipiras", "Cenoura", "Queijo Ricota", "Leite Vegetal", "Abacate", "Grão-de-bico"];
      }

      if (active) {
        setPantryItems(items);
        fetchAdvice(items);
      }
    };

    loadPantry();
    return () => {
      active = false;
    };
  }, [isOpen, recipe.id, recipe.name]);

  const fetchAdvice = async (itemsList: string[], question: string = '') => {
    setLoading(true);
    try {
      const res = await generateContextualRecipeAdvice(recipe, itemsList, question, profile);
      if (res) {
        setAdvice(res);
      }
    } catch (e) {
      console.warn("Erro ao buscar orientações da Chef Malu:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAskCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;
    playSfx('tap');
    vibrate(12);
    fetchAdvice(pantryItems, customQuestion.trim());
    setCustomQuestion('');
  };

  const handleSpeakText = (text: string) => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }
    setIsPlayingAudio(true);
    speak(text, {
      onEnded: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-3xl bg-white dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 rounded-[32px] border border-emerald-500/30 shadow-2xl overflow-hidden my-auto"
        >
          {/* Header Bar */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white relative border-b border-emerald-500/20">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Fechar Assistente Culinário"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg font-bold shrink-0">
                <ChefHat className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                  Gemini API • Assistente Culinário Contextual
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-black text-white mt-1">
                  Chef Malu: {recipe.name}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl leading-relaxed mt-2">
              Análise inteligente das técnicas gastronômicas da receita e substitutos diretos usando os ingredientes da sua despensa.
            </p>

            {/* Pantry Capsule Preview */}
            <div className="mt-4 pt-3 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300/90 font-semibold">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Despensa Atual: {pantryItems.length} itens identificados</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium overflow-x-auto max-w-full">
                {pantryItems.slice(0, 4).map((p, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 shrink-0">
                    {p}
                  </span>
                ))}
                {pantryItems.length > 4 && (
                  <span className="text-emerald-400 font-bold">+{pantryItems.length - 4} mais</span>
                )}
              </div>
            </div>
          </div>

          {/* Sub-Tabs Bar */}
          <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setActiveTab('techniques');
                playSfx('tap');
              }}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'techniques'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Técnicas Culinárias</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('pantry_substitutions');
                playSfx('tap');
              }}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'pantry_substitutions'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Trocas por Despensa</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('ask_chef');
                playSfx('tap');
              }}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'ask_chef'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Perguntar à Chef</span>
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="font-medium text-slate-600 dark:text-slate-300 text-sm">
                  Chef Malu está analisando as técnicas e conferindo os itens da sua despensa...
                </p>
              </div>
            ) : advice ? (
              <>
                {/* Summary Box with Speech Button */}
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Parecer da Chef Malu
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {advice.summaryAdvice}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSpeakText(advice.summaryAdvice)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isPlayingAudio
                        ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                        : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    }`}
                    title="Ouvir parecer com a voz da Malu"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* TAB 1: CULINARY TECHNIQUES */}
                {activeTab === 'techniques' && (
                  <div className="space-y-4">
                    <h4 className="font-serif font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-500" />
                      Técnicas Gastronômicas Aplicadas
                    </h4>

                    <div className="grid gap-4">
                      {advice.techniques?.map((tech, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">
                                {idx + 1}
                              </span>
                              {tech.name}
                            </span>
                            {tech.stepToApply && (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {tech.stepToApply}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {tech.description}
                          </p>
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2">
                            <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <span><strong>Dica Pró:</strong> {tech.proTip}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 2: PANTRY SUBSTITUTIONS */}
                {activeTab === 'pantry_substitutions' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-emerald-500" />
                        Substituições com Itens da sua Despensa
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {pantryItems.length} itens analisados
                      </span>
                    </div>

                    <div className="grid gap-4">
                      {advice.pantrySubstitutions?.map((sub, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-2 text-sm font-bold">
                              <span className="line-through text-slate-500">{sub.originalIngredient}</span>
                              <span className="text-emerald-500 font-black">➔</span>
                              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                {sub.pantryMatchItem} (Na Despensa)
                              </span>
                            </div>
                            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Proporção: {sub.substitutionRatio}
                            </span>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Impacto Culinário:</span>
                              <p className="text-slate-600 dark:text-slate-300">{sub.culinaryImpact}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">Nota Nutricional:</span>
                              <p className="text-slate-600 dark:text-slate-300">{sub.nutritionalNote}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: ASK CHEF CUSTOM QUESTION */}
                {activeTab === 'ask_chef' && (
                  <div className="space-y-4">
                    <h4 className="font-serif font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-emerald-500" />
                      Tire qualquer dúvida culinária sobre esta receita
                    </h4>

                    <form onSubmit={handleAskCustomQuestion} className="flex gap-2">
                      <input
                        type="text"
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="Ex: Como deixar a crosta mais crocante ou trocar o tempero?"
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!customQuestion.trim() || loading}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-5 py-3 rounded-xl transition-all flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Perguntar</span>
                      </button>
                    </form>

                    {/* Suggested Follow-Ups */}
                    <div className="pt-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                        Perguntas sugeridas:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {advice.suggestedFollowUps?.map((q, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setCustomQuestion(q);
                              fetchAdvice(pantryItems, q);
                              playSfx('tap');
                            }}
                            className="text-xs px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all text-left cursor-pointer border border-slate-200 dark:border-slate-700"
                          >
                            💬 {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer Bar */}
          <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Respostas geradas com inteligência contextual da Gemini API</span>
            </div>

            <button
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-6 py-2.5 rounded-full text-xs sm:text-sm transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
