import React, { useState } from 'react';
import { generateJuiceRecipe } from '../lib/gemini';
import { UserProfile } from '../types';
import { GlassWater, Loader2, Sparkles, Plus, Leaf, Flame, HeartPulse, PiggyBank, Clock, CheckCircle2, Image as ImageIcon, Maximize2, X } from 'lucide-react';
import { DetoxBanner } from './DetoxBanner';
import { VoicePlayButton } from './VoicePlayButton';

interface JuiceGeneratorProps {
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

const SUGGESTIONS = [
  { label: '🍍 Abacaxi com Manga', text: 'abacaxi com manga e hortelã' },
  { label: '🥬 Couve & Maçã Verde', text: 'couve, maçã verde, limão e gengibre' },
  { label: '🍊 Laranja & Cenoura', text: 'laranja, cenoura e cúrcuma' },
  { label: '🍉 Melancia & Hortelã', text: 'melancia com hortelã e limão' },
  { label: '🟣 Beterraba & Morango', text: 'beterraba, morango e água de coco' },
];

export function JuiceGenerator({ profile, onAwardPoints }: JuiceGeneratorProps) {
  const [ingredients, setIngredients] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJuice, setGeneratedJuice] = useState<any | null>(null);
  const [budgetMode, setBudgetMode] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleGenerate = async (e?: React.FormEvent, customIngredients?: string) => {
    if (e) e.preventDefault();
    const finalIng = customIngredients !== undefined ? customIngredients : ingredients;
    if (customIngredients !== undefined) {
      setIngredients(customIngredients);
    }

    setIsGenerating(true);
    setGeneratedJuice(null);
    
    try {
      const data = await generateJuiceRecipe(profile, finalIng, budgetMode);
      if (data) {
        setGeneratedJuice(data);
        if (onAwardPoints) onAwardPoints(15, 'Suco funcional personalizado gerado');
      }
    } catch (err) {
      console.warn("Erro na geração de suco:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <DetoxBanner />

      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Sucos Funcionais
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
          Sucos naturais focados em emagrecimento, metabolismo e saúde, totalmente personalizados para o seu perfil com foto em alta resolução.
        </p>
      </div>

      <div className="clay-card p-8">
        <form onSubmit={(e) => handleGenerate(e)} className="space-y-6">
          <div className="space-y-4">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Tenho esses ingredientes
            </label>
            <input
              type="text"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Ex: abacaxi com manga, couve, hortelã..."
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-sm text-base md:text-lg"
            />

            {/* Sugestões rápidas */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Sugestões:</span>
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleGenerate(undefined, sug.text)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/50 dark:border-emerald-800/40 transition-all hover:scale-105"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
            <button
              type="button"
              onClick={() => setBudgetMode(!budgetMode)}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${
                budgetMode 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold' 
                : 'bg-white/40 dark:bg-slate-700/30 border-white/60 dark:border-slate-600/50 text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${budgetMode ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <PiggyBank className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm">Modo Economia</p>
                <p className="text-[10px] leading-tight opacity-70">
                  {budgetMode ? 'Sucos de baixo custo' : 'Frutas da estação'}
                </p>
              </div>
            </button>

            <button
              type="submit"
              disabled={isGenerating}
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-medium transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando receita e foto em HD...
                </>
              ) : (
                <>
                  <GlassWater className="w-5 h-5" />
                  Gerar Suco Detox
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {generatedJuice && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
          
          {generatedJuice.assistantMessage && (
            <div className="flex items-start gap-4 clay-card p-6 shadow-sm relative overflow-hidden">
                <VoicePlayButton
                  text={generatedJuice.assistantMessage}
                  size="md"
                  title="Ouvir assistente com a voz da Malu"
                />
                <div>
                  <h4 className="font-serif text-xl text-emerald-800 dark:text-emerald-400 font-medium mb-1">Assistente NutriAI diz:</h4>
                  <p className="font-sans text-slate-700 dark:text-slate-300 text-lg leading-relaxed italic">
                    "{generatedJuice.assistantMessage}"
                  </p>
                </div>
            </div>
          )}

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[32px] clay-card overflow-hidden shadow-2xl border border-white/60 dark:border-slate-700/50">
            
            {/* Header com Foto em Alta Qualidade junto com o Nome do Suco */}
            <div className="p-6 md:p-8 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-br from-emerald-50/60 via-white/40 to-amber-50/40 dark:from-emerald-950/30 dark:via-slate-800/40 dark:to-amber-950/20">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                
                {/* Foto Culinária em Alta Resolução */}
                {generatedJuice.imageUrl && (
                  <div className="md:col-span-5 relative group overflow-hidden rounded-2xl shadow-lg border border-white/80 dark:border-slate-700/60 aspect-[4/3] bg-slate-100 dark:bg-slate-900">
                    <img
                      src={generatedJuice.imageUrl}
                      alt={generatedJuice.name || "Foto do suco funcional em alta qualidade"}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                      <span className="text-xs font-semibold text-white/95 flex items-center gap-1.5 drop-shadow">
                        <ImageIcon className="w-3.5 h-3.5" /> Alta Resolução HD
                      </span>
                      <button
                        onClick={() => setIsImageModalOpen(true)}
                        className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors shadow"
                        title="Ampliar foto em tela cheia"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute top-3 left-3 bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full shadow flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Foto Culinária HD
                    </div>
                  </div>
                )}

                {/* Título, Categoria, Badges e Botão de Áudio */}
                <div className={`${generatedJuice.imageUrl ? 'md:col-span-7' : 'md:col-span-12'} space-y-5`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {generatedJuice.category && (
                      <span className="px-3.5 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-semibold text-xs border border-emerald-300/40">
                        {generatedJuice.category}
                      </span>
                    )}
                    <span className="px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {generatedJuice.prepTime || "5 min"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-serif text-3xl md:text-4xl leading-tight text-slate-800 dark:text-white font-bold tracking-tight">
                      {generatedJuice.name || "Suco Saudável"}
                    </h3>
                    <VoicePlayButton
                      text={`Receita do ${generatedJuice.name}. ${generatedJuice.assistantMessage || ''}. Ingredientes: ${(generatedJuice.ingredients || []).join(', ')}. Modo de preparo: ${(generatedJuice.instructions || []).join('. ')}.`}
                      size="lg"
                      title="Ouvir receita completa com a voz da Malu"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-2xl border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Flame className="w-4 h-4 text-orange-500" />
                      {generatedJuice.nutrition?.calories ?? 120} kcal
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-2xl border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Leaf className="w-4 h-4 text-emerald-500" />
                      Fibras: {generatedJuice.nutrition?.fiber ?? 3}g
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-2xl border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      Carboidratos: {generatedJuice.nutrition?.carbs ?? 25}g
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Conteúdo: Ingredientes, Benefícios e Preparo */}
            <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12 bg-white/30 dark:bg-slate-900/30">
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="font-sans text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 border-b border-white/40 dark:border-slate-700/50 pb-4">
                    Ingredientes Frescos
                  </h4>
                  <ul className="space-y-3">
                    {(generatedJuice.ingredients || []).map((ing: string, idx: number) => (
                      <li key={idx} className="flex gap-3 text-slate-700 dark:text-slate-200 font-medium items-center bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl border border-white/40 dark:border-slate-700/40">
                        <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="leading-relaxed">{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-sans text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 border-b border-white/40 dark:border-slate-700/50 pb-4">
                    Benefícios para o seu objetivo
                  </h4>
                  <ul className="space-y-3">
                    {(generatedJuice.benefits || []).map((ben: string, idx: number) => (
                      <li key={idx} className="flex gap-3 text-slate-600 dark:text-slate-300 items-start">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                        <span className="leading-relaxed">{ben}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="font-sans text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 border-b border-white/40 dark:border-slate-700/50 pb-4">
                  Modo de Preparo
                </h4>
                <div className="space-y-4">
                  {(generatedJuice.instructions || []).map((step: string, idx: number) => (
                    <div key={idx} className="flex gap-4 group p-3.5 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/40 transition-all hover:bg-white/70 dark:hover:bg-slate-800/70">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-md shadow-emerald-500/20">
                        {idx + 1}
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed pt-1 text-sm md:text-base">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal de Imagem em Tela Cheia */}
      {isImageModalOpen && generatedJuice?.imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20">
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={generatedJuice.imageUrl}
              alt={generatedJuice.name}
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[80vh] object-cover"
            />
            <div className="p-6 bg-slate-900/95 text-white">
              <h4 className="font-serif text-2xl font-bold text-emerald-400">{generatedJuice.name}</h4>
              <p className="text-sm text-slate-300 mt-1">{generatedJuice.category || "Suco Funcional e Saudável"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
