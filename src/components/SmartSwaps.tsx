import React, { useState } from 'react';
import {
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Lightbulb,
  Scale,
  BarChart2,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { UserProfile, SmartSwap, FoodNutritionComparison } from '../types';
import { generateSmartSwap, compareFoodsNutrition } from '../lib/gemini';
import { VoicePlayButton } from './VoicePlayButton';
import { NutritionalComparisonChart } from './NutritionalComparisonChart';
import { COMPARISON_PRESETS, generateFallbackComparison } from '../data/foodNutritionDatabase';

interface SmartSwapsProps {
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function SmartSwaps({ profile, onAwardPoints }: SmartSwapsProps) {
  // Navigation tabs: 'discover' (Substituições Inteligentes) | 'compare' (Comparador A vs B)
  const [activeTab, setActiveTab] = useState<'discover' | 'compare'>('discover');

  // Discover state
  const [foodItem, setFoodItem] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [swap, setSwap] = useState<SmartSwap | null>(null);
  const [swapComparison, setSwapComparison] = useState<FoodNutritionComparison | null>(null);
  const [isLoadingSwapChart, setIsLoadingSwapChart] = useState(false);
  const [showSwapChart, setShowSwapChart] = useState(true);

  // Dedicated Comparator state (Alimento A vs Alimento B)
  const [foodA, setFoodA] = useState('Pão Francês');
  const [foodB, setFoodB] = useState('Pão 100% Integral');
  const [isComparing, setIsComparing] = useState(false);
  const [activeComparison, setActiveComparison] = useState<FoodNutritionComparison | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>('bread');

  // Initial load of default comparison preset if compare tab is opened
  const handleSelectPreset = async (presetId: string) => {
    const preset = COMPARISON_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    setFoodA(preset.foodA);
    setFoodB(preset.foodB);

    setIsComparing(true);
    try {
      const comp = await compareFoodsNutrition(preset.foodA, preset.foodB, profile);
      setActiveComparison(comp);
      if (onAwardPoints) onAwardPoints(20, `Comparação nutricional: ${preset.title}`);
    } catch (err) {
      console.warn('Erro ao comparar preset:', err);
      setActiveComparison(generateFallbackComparison(preset.foodA, preset.foodB));
    } finally {
      setIsComparing(false);
    }
  };

  const handleCustomCompare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!foodA.trim() || !foodB.trim()) return;

    setIsComparing(true);
    setSelectedPresetId(null);
    try {
      const comp = await compareFoodsNutrition(foodA, foodB, profile);
      setActiveComparison(comp);
      if (onAwardPoints) onAwardPoints(25, `Comparação nutricional: ${foodA} vs ${foodB}`);
    } catch (err) {
      console.warn('Erro no comparador customizado:', err);
      setActiveComparison(generateFallbackComparison(foodA, foodB));
    } finally {
      setIsComparing(false);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!foodItem.trim()) return;

    setIsGenerating(true);
    setSwap(null);
    setSwapComparison(null);

    try {
      const result = await generateSmartSwap(foodItem, profile);
      setSwap(result);
      if (onAwardPoints) onAwardPoints(30, `Troca inteligente para: ${foodItem}`);

      // Gerar automaticamente o gráfico de barras comparando original vs substituto
      if (result && result.original && result.substitute) {
        setIsLoadingSwapChart(true);
        try {
          const comp = await compareFoodsNutrition(result.original, result.substitute, profile);
          setSwapComparison(comp);
        } catch (chartErr) {
          console.warn('Fallback no gráfico da troca:', chartErr);
          setSwapComparison(generateFallbackComparison(result.original, result.substitute));
        } finally {
          setIsLoadingSwapChart(false);
        }
      }
    } catch (error) {
      console.warn(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Switch to compare tab pre-filled with the current swap items
  const handleOpenInComparator = (orig: string, sub: string) => {
    setFoodA(orig);
    setFoodB(sub);
    setActiveTab('compare');
    if (swapComparison) {
      setActiveComparison(swapComparison);
    } else {
      handleCustomCompare();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Cabeçalho do Componente */}
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Trocas & Comparador Nutricional
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Descubra alternativas saudáveis para qualquer alimento ou compare lado a lado o valor nutricional de dois ingredientes através de gráficos de barras.
        </p>

        {/* Seletor de Abas / Modos de Uso */}
        <div className="flex items-center justify-center pt-2">
          <div className="inline-flex p-1.5 rounded-3xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner gap-1">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'discover'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lightbulb className="w-4 h-4 text-emerald-500" />
              Descobrir Substituição
            </button>
            <button
              onClick={() => {
                setActiveTab('compare');
                if (!activeComparison && !isComparing) {
                  handleSelectPreset('bread');
                }
              }}
              className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'compare'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="w-4 h-4 text-emerald-500" />
              Comparador (A vs B)
            </button>
          </div>
        </div>
      </div>

      {/* ABA 1: DESCOBRIR SUBSTITUIÇÃO (FUNCIONALIDADE ORIGINAL APRIMORADA) */}
      {activeTab === 'discover' && (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="clay-card p-8">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <input
                  type="text"
                  value={foodItem}
                  onChange={(e) => setFoodItem(e.target.value)}
                  placeholder="Ex: Chocolate, Refrigerante, Pão Branco, Batata Frita..."
                  className="w-full pl-16 pr-6 py-6 bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-slate-600/50 rounded-3xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-serif text-xl md:text-2xl text-slate-700 dark:text-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating || !foodItem.trim()}
                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Lightbulb className="w-6 h-6" />}
                Descobrir Substituição
              </button>
            </form>
          </div>

          {swap && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center clay-card p-6 shadow-xl">
                <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl border border-rose-100/50 dark:border-rose-800/30">
                  <AlertCircle className="w-10 h-10 text-rose-500 opacity-60" />
                  <p className="text-sm font-bold text-rose-400 uppercase tracking-widest">Original</p>
                  <h3 className="text-3xl font-serif font-bold text-rose-700 dark:text-rose-400 text-center">{swap.original}</h3>
                </div>

                <div className="hidden md:flex justify-center">
                  <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-lg">
                    <ArrowRight className="w-8 h-8 text-emerald-500" />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/30">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Troca Saudável</p>
                  <h3 className="text-3xl font-serif font-bold text-emerald-700 dark:text-emerald-300 text-center">{swap.substitute}</h3>
                </div>
              </div>

              <div className="flex items-start gap-6 clay-card p-6 shadow-sm relative overflow-hidden">
                {/* Decorative element */}
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Sparkles className="w-24 h-24" />
                </div>

                {swap.assistantMessage && (
                  <VoicePlayButton
                    text={swap.assistantMessage}
                    size="lg"
                    title="Ouvir sugestão com a voz da Malu"
                  />
                )}
                <div className="space-y-2">
                  <h4 className="font-serif text-2xl text-emerald-800 dark:text-emerald-400 font-medium italic">Minha sugestão:</h4>
                  <p className="font-sans text-slate-700 dark:text-slate-300 text-xl leading-relaxed italic">
                    "{swap.assistantMessage}"
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="clay-card p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Por que trocar?</h4>
                  <p className="text-lg text-slate-700 dark:text-slate-200 font-sans leading-relaxed">{swap.reason}</p>
                </div>

                <div className="clay-card p-6 space-y-4">
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Principais Benefícios:</h4>
                  <ul className="space-y-3">
                    {swap.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="font-medium">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* SEÇÃO INTEGRADA: GRÁFICO DE BARRAS DA TROCA INTELIGENTE */}
              <div className="clay-card p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-700/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                      <BarChart2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Comparação Nutricional em Gráfico
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Diferença de calorias, proteínas, carboidratos, gorduras e fibras
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenInComparator(swap.original, swap.substitute)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center gap-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500" />
                      Abrir no Comparador
                    </button>
                    <button
                      onClick={() => setShowSwapChart(!showSwapChart)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 transition-all"
                      title={showSwapChart ? 'Recolher gráfico' : 'Expandir gráfico'}
                    >
                      {showSwapChart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isLoadingSwapChart ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                    <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                    <p className="text-sm font-medium">Calculando comparação nutricional com gráfico de barras...</p>
                  </div>
                ) : swapComparison && showSwapChart ? (
                  <NutritionalComparisonChart comparison={swapComparison} />
                ) : !showSwapChart ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-2">
                    Gráfico recolhido. Clique em expandir para visualizar a comparação nutricional completa.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: COMPARADOR NUTRICIONAL DIRETO (A vs B) COM GRÁFICO DE BARRAS */}
      {activeTab === 'compare' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Card de Configuração do Comparativo */}
          <div className="clay-card p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Comparar Dois Alimentos ou Pratos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Digite dois ingredientes ou pratos para comparar a densidade nutricional no gráfico
                </p>
              </div>
            </div>

            {/* Presets Rápidos com 1 Clique */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-500" />
                Comparações Populares Rápidas:
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {COMPARISON_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                      selectedPresetId === preset.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{preset.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Formulário de Comparação Customizada */}
            <form onSubmit={handleCustomCompare} className="space-y-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Input Alimento A */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                    Alimento ou Prato A (Opção 1)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={foodA}
                      onChange={(e) => {
                        setFoodA(e.target.value);
                        setSelectedPresetId(null);
                      }}
                      placeholder="Ex: Arroz Branco, Batata Frita, Coca-cola..."
                      className="w-full px-5 py-4 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/30 font-medium text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Input Alimento B */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    Alimento ou Prato B (Opção 2)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={foodB}
                      onChange={(e) => {
                        setFoodB(e.target.value);
                        setSelectedPresetId(null);
                      }}
                      placeholder="Ex: Quinoa Cozida, Batata Doce Assada..."
                      className="w-full px-5 py-4 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isComparing || !foodA.trim() || !foodB.trim()}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-base shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isComparing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Calculando Comparação Nutricional...</span>
                  </>
                ) : (
                  <>
                    <BarChart2 className="w-5 h-5" />
                    <span>Comparar Nutrientes & Gerar Gráfico de Barras</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Resultado do Comparativo */}
          {activeComparison && (
            <div className="animate-in fade-in duration-500">
              <NutritionalComparisonChart comparison={activeComparison} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
