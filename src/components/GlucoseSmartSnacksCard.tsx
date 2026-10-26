import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Clock, 
  Activity, 
  Utensils, 
  Flame, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Apple, 
  Heart, 
  Coffee,
  ArrowRight
} from 'lucide-react';
import { UserProfile, Recipe } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { playSfx, vibrate } from '../lib/sensory';
import { safeGet } from '../lib/storage';

interface GlucoseSmartSnacksCardProps {
  profile: UserProfile | null;
  onNavigate: (tabId: string) => void;
  onSelectRecipe?: (recipe: Recipe) => void;
}

interface SmartSnackRecommendation {
  id: string;
  name: string;
  category: string;
  prepTime: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  glycemicAdvice: string;
  reason: string;
  ingredients: string[];
  instructions: string[];
  imageUrl: string;
}

export const GlucoseSmartSnacksCard: React.FC<GlucoseSmartSnacksCardProps> = ({
  profile,
  onNavigate,
  onSelectRecipe
}) => {
  const { t } = useLanguage();
  const [latestGlucose, setLatestGlucose] = useState<{ value: number; context: string; date: string } | null>(null);
  const [currentTimeCategory, setCurrentTimeCategory] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('afternoon');
  const [selectedSnack, setSelectedSnack] = useState<SmartSnackRecommendation | null>(null);

  // Load latest glucose reading from localStorage or profile
  useEffect(() => {
    try {
      const savedLogs = safeGet('nutri-glucose-logs');
      if (savedLogs) {
        const parsed = JSON.parse(savedLogs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const latest = parsed[0];
          setLatestGlucose({
            value: Number(latest.value) || 92,
            context: latest.context || 'fasting',
            date: latest.date || 'Hoje'
          });
          return;
        }
      }
    } catch (e) {}

    // Fallback default
    setLatestGlucose({ value: 94, context: 'fasting', date: 'Hoje' });

    // Determine time of day category
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setCurrentTimeCategory('morning');
    else if (hour >= 12 && hour < 18) setCurrentTimeCategory('afternoon');
    else if (hour >= 18 && hour < 22) setCurrentTimeCategory('evening');
    else setCurrentTimeCategory('night');
  }, []);

  const glucoseVal = latestGlucose?.value || 94;

  // Curated smart snacks categorized by glucose level and time of day
  const getSmartSnacks = (): SmartSnackRecommendation[] => {
    // If glucose is high (> 120 mg/dL)
    if (glucoseVal > 120) {
      return [
        {
          id: 'snack-high-1',
          name: 'Abacate com Sementes de Chia e Azeite',
          category: 'Baixo Índice Glicêmico',
          prepTime: '5 min',
          calories: 185,
          protein: 3,
          carbs: 6,
          fat: 16,
          glycemicAdvice: 'Gorduras boas e fibras que retardam a absorção de glicose.',
          reason: 'Ideal para estabilizar picos glicêmicos recentes.',
          ingredients: ['1/2 abacate maduro', '1 colher de sopa de sementes de chia', 'Fio de azeite extra virgem', 'Pitada de sal marinho e orégano'],
          instructions: ['Amasse levemente o abacate em um prato fundo.', 'Polvilhe as sementes de chia por cima.', 'Regue com azeite e finalize com sal e orégano.'],
          imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 'snack-high-2',
          name: 'Omelete de Claras com Espinafre e Cúrcuma',
          category: 'Proteico & Anti-inflamatório',
          prepTime: '8 min',
          calories: 140,
          protein: 18,
          carbs: 3,
          fat: 4,
          glycemicAdvice: 'Proteína pura com zero impacto glicêmico.',
          reason: 'Ajuda a manter a saciedade sem elevar a glicemia.',
          ingredients: ['3 claras de ovo', '1 xícara de espinafre fresco picado', 'Pitada de cúrcuma e pimenta-do-reino', '1 colher de chá de azeite'],
          instructions: ['Bata levemente as claras com a cúrcuma e o espinafre.', 'Despeje em frigideira untada com azeite em fogo médio.', 'Dobre ao meio quando firmar e sirva quente.'],
          imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 'snack-high-3',
          name: 'Mix de Nozes, Castanhas e Chá Verde',
          category: 'Antioxidante & Fibras',
          prepTime: '2 min',
          calories: 190,
          protein: 5,
          carbs: 5,
          fat: 17,
          glycemicAdvice: 'Polifenóis do chá verde auxiliam na sensibilidade à insulina.',
          reason: 'Lanche prático para o meio da tarde.',
          ingredients: ['30g de mix de castanhas (pará, nozes, amêndoas)', '1 xícara de chá verde morno sem açúcar'],
          instructions: ['Prepare o chá verde com água quente.', 'Sirva acompanhado do mix de oleaginosas naturais.'],
          imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80'
        }
      ];
    }

    // If glucose is low (< 70 mg/dL)
    if (glucoseVal < 70) {
      return [
        {
          id: 'snack-low-1',
          name: 'Banana Amassada com Pasta de Amendoim e Canela',
          category: 'Energia Rápida & Sustentada',
          prepTime: '3 min',
          calories: 220,
          protein: 6,
          carbs: 28,
          fat: 10,
          glycemicAdvice: 'Carboidrato de rápida absorção combinado com gordura saudável.',
          reason: 'Essencial para elevar a glicemia de forma segura e gradual.',
          ingredients: ['1 banana madura', '1 colher de sopa de pasta de amendoim integral', 'Canela em pó a gosto'],
          instructions: ['Corte ou amasse a banana em uma tigela.', 'Adicione a pasta de amendoim por cima.', 'Polvilhe canela e saboreie.'],
          imageUrl: 'https://images.unsplash.com/photo-1577046026116-2d6b38c20894?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 'snack-low-2',
          name: 'Pão Integral com Mel e Queijo Branco',
          category: 'Equilíbrio Glicêmico',
          prepTime: '4 min',
          calories: 210,
          protein: 10,
          carbs: 32,
          fat: 5,
          glycemicAdvice: 'Recuperação rápida dos níveis de glicose no sangue.',
          reason: 'Previne episódios de hipoglicemia.',
          ingredients: ['1 fatia de pão de fermentação natural ou integral', '1 fatia de queijo minas frescal', '1 fio de mel puro'],
          instructions: ['Toque levemente o pão na chapa.', 'Cubra com o queijo frescal e regue com mel.'],
          imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80'
        }
      ];
    }

    // Normal glucose (70 - 99 mg/dL) or general balanced snacks
    if (currentTimeCategory === 'morning') {
      return [
        {
          id: 'snack-normal-m1',
          name: 'Iogurte Grego com Frutas Vermelhas e Granola Zero',
          category: 'Probiótico & Proteico',
          prepTime: '3 min',
          calories: 195,
          protein: 15,
          carbs: 18,
          fat: 6,
          glycemicAdvice: 'Baixo índice glicêmico com alta saciedade.',
          reason: 'Excelente para iniciar a manhã com energia estável.',
          ingredients: ['1 pote de iogurte grego natural desnatado', '1/2 xícara de mirtilos ou morangos picados', '1 colher de sopa de granola sem açúcar'],
          instructions: ['Coloque o iogurte em uma tigela.', 'Acrescente as frutas vermelhas frescas.', 'Finalize com a granola crocante.'],
          imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 'snack-normal-m2',
          name: 'Toast de Abacate com Ovo Poché',
          category: 'Gorduras Boas & Proteína',
          prepTime: '7 min',
          calories: 240,
          protein: 12,
          carbs: 16,
          fat: 14,
          glycemicAdvice: 'Curva glicêmica estável e prolongada.',
          reason: 'Combinação perfeita de macro e micronutrientes.',
          ingredients: ['1 fatia de pão integral tostado', '1/4 de abacate', '1 ovo caipira poché', 'Sal e pimenta a gosto'],
          instructions: ['Amasse o abacate sobre a torsta.', 'Prepare o ovo poché e coloque delicadamente por cima.', 'Tempere com pimenta e sal.'],
          imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80'
        }
      ];
    }

    // Afternoon / Evening snacks
    return [
      {
        id: 'snack-normal-a1',
        name: 'Smoothie Verde Detox com Proteína',
        category: 'Hidratação & Fibras',
        prepTime: '4 min',
        calories: 165,
        protein: 18,
        carbs: 20,
        fat: 3,
        glycemicAdvice: 'Fibras solúveis que controlam o pico de glicose pós-refeição.',
        reason: 'Refrescante e altamente nutritivo para a tarde.',
        ingredients: ['1 xícara de couve manteiga picada', '1/2 maçã verde', '1 scoop de whey protein neutro ou baunilha', '200ml de água de coco natural'],
        instructions: ['Adicione todos os ingredientes no liquidificador.', 'Bata em potência alta por 1 minuto até ficar homogêneo.', 'Sirve com gelo a gosto.'],
        imageUrl: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'snack-normal-a2',
        name: 'Palitos de Cenoura e Pepino com Homus',
        category: 'Vegetariano & Fibras',
        prepTime: '5 min',
        calories: 175,
        protein: 6,
        carbs: 18,
        fat: 9,
        glycemicAdvice: 'Grão-de-bico com baixo índice glicêmico e crocância.',
        reason: 'Excelente lanche para mastigação consciente.',
        ingredients: ['1 cenoura média em palitos', '1 pepino japonês em palitos', '3 colheres de sopa de homus de grão-de-bico tradicional'],
        instructions: ['Lave e corte os legumes em formato de palitos.', 'Sirva acompanhado do homus cremoso.'],
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
      }
    ];
  };

  const snacks = getSmartSnacks();

  const handleConvertToRecipe = (snack: SmartSnackRecommendation) => {
    const convertedRecipe: Recipe = {
      id: snack.id,
      name: snack.name,
      title: snack.name,
      description: snack.reason,
      prepTime: snack.prepTime,
      difficulty: 'Fácil',
      calories: snack.calories,
      protein: snack.protein,
      carbs: snack.carbs,
      fat: snack.fat,
      ingredients: snack.ingredients,
      instructions: snack.instructions,
      nutrition: {
        calories: snack.calories,
        protein: snack.protein,
        carbs: snack.carbs,
        fat: snack.fat,
        fiber: 4
      },
      imageUrl: snack.imageUrl,
      tags: ['Glicemia Saudável', 'Lanche Rápido', snack.category]
    };

    if (onSelectRecipe) {
      onSelectRecipe(convertedRecipe);
    } else {
      setSelectedSnack(snack);
    }
  };

  const getGlucoseStatusColor = (val: number) => {
    if (val < 70) return { bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30', label: 'Glicemia Baixa (<70)' };
    if (val <= 99) return { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', label: 'Glicemia Normal (70-99)' };
    if (val <= 125) return { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', label: 'Levemente Elevada (100-125)' };
    return { bg: 'bg-rose-500/10 text-rose-500 border-rose-500/30', label: 'Glicemia Elevada (>125)' };
  };

  const statusStyle = getGlucoseStatusColor(glucoseVal);

  return (
    <div className="card-premium p-6 sm:p-8 rounded-[32px] w-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md relative overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('smart_snacks_title', 'Sugestões de Lanches Glicêmicos')}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{t('glucose_smart_snacks', 'Lanches Rápidos Baseados em Glicemia')}</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {t('glucose_snacks_desc', 'Receitas selecionadas por IA considerando sua última medição e o horário atual.')}
          </p>
        </div>

        {/* Glucose Context Badge */}
        {latestGlucose && (
          <div 
            onClick={() => {
              playSfx('tap');
              onNavigate('glucose');
            }}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border cursor-pointer hover:opacity-90 transition-all ${statusStyle.bg}`}
            title="Ver histórico completo no GlucoseTracker"
          >
            <Activity className="w-4 h-4 shrink-0 animate-pulse" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Última Glicemia</div>
              <div className="text-sm font-black font-mono">
                {latestGlucose.value} <span className="text-[10px] font-normal">mg/dL</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
          </div>
        )}
      </div>

      {/* Snacks Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        {snacks.map((snack) => (
          <motion.div
            key={snack.id}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleConvertToRecipe(snack)}
            className="group bg-slate-50 dark:bg-slate-850/60 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
          >
            {/* Image Header */}
            <div className="relative h-36 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
              <img 
                src={snack.imageUrl} 
                alt={snack.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-extrabold text-white flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>{snack.prepTime}</span>
              </div>
              <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-[10px] font-extrabold text-white">
                {snack.category}
              </div>
            </div>

            {/* Body Content */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-serif font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug line-clamp-1">
                  {snack.name}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {snack.reason}
                </p>
              </div>

              {/* Macros Strip */}
              <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-center">
                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-750">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">Kcal</span>
                  <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">{snack.calories}</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-750">
                  <span className="text-[9px] text-emerald-500 block uppercase font-bold">Prot</span>
                  <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">{snack.protein}g</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-750">
                  <span className="text-[9px] text-amber-500 block uppercase font-bold">Carb</span>
                  <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">{snack.carbs}g</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-750">
                  <span className="text-[9px] text-sky-400 block uppercase font-bold">Gord</span>
                  <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">{snack.fat}g</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  Ver receita completa
                </span>
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Info Banner */}
      <div className="mt-5 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>As sugestões são ajustadas automaticamente conforme você registra novas medições na aba <strong>GlucoseTracker</strong>.</span>
        </div>
        <button
          type="button"
          onClick={() => {
            playSfx('tap');
            onNavigate('glucose');
          }}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition-all cursor-pointer shadow-xs"
        >
          Abrir GlucoseTracker
        </button>
      </div>

      {/* Snack Detail Modal */}
      <AnimatePresence>
        {selectedSnack && (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in-up">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6"
            >
              <button
                type="button"
                onClick={() => setSelectedSnack(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-4">
                <img 
                  src={selectedSnack.imageUrl} 
                  alt={selectedSnack.name} 
                  className="w-20 h-20 rounded-2xl object-cover shadow-md border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    {selectedSnack.category}
                  </span>
                  <h3 className="font-serif font-black text-xl text-slate-900 dark:text-white mt-1.5">
                    {selectedSnack.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ⏱️ Preparo: {selectedSnack.prepTime} • 🔥 {selectedSnack.calories} kcal
                  </p>
                </div>
              </div>

              {/* Glycemic Advice Box */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <strong className="flex items-center gap-1.5 font-bold">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Benefício Glicêmico:
                </strong>
                <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  {selectedSnack.glycemicAdvice} ({selectedSnack.reason})
                </p>
              </div>

              {/* Ingredients */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Ingredientes ({selectedSnack.ingredients.length})
                </h4>
                <ul className="space-y-1.5">
                  {selectedSnack.ingredients.map((ing, i) => (
                    <li key={i} className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{ing}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Modo de Preparo
                </h4>
                <ol className="space-y-2.5">
                  {selectedSnack.instructions.map((step, i) => (
                    <li key={i} className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectRecipe) {
                      onSelectRecipe({
                        id: selectedSnack.id,
                        name: selectedSnack.name,
                        title: selectedSnack.name,
                        description: selectedSnack.reason,
                        prepTime: selectedSnack.prepTime,
                        difficulty: 'Fácil',
                        calories: selectedSnack.calories,
                        protein: selectedSnack.protein,
                        carbs: selectedSnack.carbs,
                        fat: selectedSnack.fat,
                        ingredients: selectedSnack.ingredients,
                        instructions: selectedSnack.instructions,
                        nutrition: { calories: selectedSnack.calories, protein: selectedSnack.protein, carbs: selectedSnack.carbs, fat: selectedSnack.fat },
                        imageUrl: selectedSnack.imageUrl
                      });
                    }
                    setSelectedSnack(null);
                  }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all cursor-pointer shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Abrir na Tela de Receita</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSnack(null)}
                  className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlucoseSmartSnacksCard;
