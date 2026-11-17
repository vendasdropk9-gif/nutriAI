import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lightbulb, RefreshCw, Volume2, Sparkles, Database, 
  ArrowRight, Flame, ShieldCheck, ChevronRight, Apple, Zap, Droplet
} from 'lucide-react';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { speak } from '../lib/speech';
import { MALU_VOICE_ID } from '../lib/maluVoice';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface DailyNutritionalTipProps {
  profile?: UserProfile | null;
  onNavigate?: (tabId: string) => void;
  className?: string;
}

interface MacroRecommendation {
  food: string;
  portion: string;
  gain: string;
}

interface NutritionalTipData {
  headline: string;
  content: string;
  macroFocus: 'protein' | 'carbs' | 'fat' | 'balanced';
  focusBadge: string;
  recommendations: MacroRecommendation[];
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetCalories: number;
  source: 'firestore_cache' | 'firestore_live' | 'profile_derived';
}

export function DailyNutritionalTipCard({ profile, onNavigate, className = '' }: DailyNutritionalTipProps) {
  const [tipData, setTipData] = useState<NutritionalTipData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isFirestoreSynced, setIsFirestoreSynced] = useState<boolean>(false);

  // Compute today's date key: YYYY-MM-DD
  const todayKey = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, []);

  // Compute macro targets derived from profile or standard formulas
  const profileTargets = useMemo(() => {
    if (profile?.macroTargets && (profile.macroTargets.protein > 0 || profile.macroTargets.carbs > 0)) {
      return {
        protein: profile.macroTargets.protein,
        carbs: profile.macroTargets.carbs,
        fat: profile.macroTargets.fat,
        calories: profile.macroTargets.calories || (profile.macroTargets.protein * 4 + profile.macroTargets.carbs * 4 + profile.macroTargets.fat * 9)
      };
    }
    const weight = profile?.weight || 70;
    return {
      protein: Math.round(weight * 1.8),
      carbs: Math.round(weight * 2.5),
      fat: Math.round(weight * 0.9),
      calories: 2000
    };
  }, [profile]);

  // Generate personalized macronutrient recommendation based on Firestore profile data
  const generatePersonalizedMacroTip = useCallback((targetProfile: UserProfile | null): NutritionalTipData => {
    const goals = (targetProfile?.goals || '').toLowerCase();
    const isHypertrophy = goals.includes('hipertrofia') || goals.includes('massa') || goals.includes('força');
    const isWeightLoss = goals.includes('perda') || goals.includes('emagrecer') || goals.includes('peso') || goals.includes('seca');
    const restrictions = targetProfile?.restrictions || [];
    const isVegetarian = restrictions.some(r => r.toLowerCase().includes('vegetar') || r.toLowerCase().includes('vegan'));
    const isLactoseFree = restrictions.some(r => r.toLowerCase().includes('lactose') || r.toLowerCase().includes('leite'));

    const weight = targetProfile?.weight || 70;
    const proteinTarget = targetProfile?.macroTargets?.protein || Math.round(weight * (isHypertrophy ? 2.0 : 1.7));
    const carbsTarget = targetProfile?.macroTargets?.carbs || Math.round(weight * (isWeightLoss ? 1.8 : 2.8));
    const fatTarget = targetProfile?.macroTargets?.fat || Math.round(weight * 0.85);
    const caloriesTarget = targetProfile?.macroTargets?.calories || (proteinTarget * 4 + carbsTarget * 4 + fatTarget * 9);

    if (isHypertrophy) {
      const proteinFoods: MacroRecommendation[] = isVegetarian
        ? [
            { food: 'Tofu Grelhado Marinado', portion: '150g', gain: '+20g Proteína Vegetal' },
            { food: 'Edamame Cozido ao Vapor', portion: '1 xícara', gain: '+17g Proteína Completa' },
            { food: 'Proteína de Ervilha / Arroz', portion: '1 scoop (30g)', gain: '+24g Síntese Limpa' },
          ]
        : isLactoseFree
        ? [
            { food: 'Peito de Frango Desfiado', portion: '120g', gain: '+36g Proteína de Alto VB' },
            { food: 'Ovos Caipiras Mexidos', portion: '3 unidades', gain: '+19g Proteína + Colina' },
            { food: 'Filé de Tilápia / Salmão', portion: '140g', gain: '+32g Proteína + Ômega-3' },
          ]
        : [
            { food: 'Peito de Frango Grelhado', portion: '120g', gain: '+36g Proteína de Alto VB' },
            { food: 'Iogurte Grego Natural', portion: '170g', gain: '+17g Proteína Lenta' },
            { food: 'Ovos Caipiras Cozidos', portion: '2 unidades', gain: '+13g Proteína Completa' },
          ];

      return {
        headline: 'Otimização Proteica para Síntese Muscular & Hipertrofia',
        content: `Para impulsionar a hipertrofia e evitar o catabolismo, distribua seus ${proteinTarget}g de proteínas em frações de 25g a 35g a cada refeição. O consumo pós-treino com leucina eleva a recuperação das fibras em até 40%.`,
        macroFocus: 'protein',
        focusBadge: 'Foco: Proteína Alta 🥩',
        recommendations: proteinFoods,
        targetProtein: proteinTarget,
        targetCarbs: carbsTarget,
        targetFat: fatTarget,
        targetCalories: caloriesTarget,
        source: 'firestore_live'
      };
    }

    if (isWeightLoss) {
      return {
        headline: 'Carboidratos Estratégicos & Oxidação de Gorduras',
        content: `Mantenha seus carboidratos em ${carbsTarget}g focando em fontes de baixo índice glicêmico e ricas em fibras solúveis. Isso preserva a sensibilidade à insulina e garante saciedade contínua sem picos de fome.`,
        macroFocus: 'carbs',
        focusBadge: 'Controle Glicêmico 🍞',
        recommendations: [
          { food: 'Aveia em Flocos Finos com Canela', portion: '40g', gain: '+22g Carboidrato Lento' },
          { food: 'Batata-Doce Roxa Assada', portion: '100g', gain: '+20g Fibras & Energia' },
          { food: 'Brócolis & Vegetais Folhosos', portion: '150g', gain: '+8g Fibras Prebióticas' },
        ],
        targetProtein: proteinTarget,
        targetCarbs: carbsTarget,
        targetFat: fatTarget,
        targetCalories: caloriesTarget,
        source: 'firestore_live'
      };
    }

    // Default Balanced Health Focus
    return {
      headline: 'Equilíbrio Hormonal com Lipídios Essenciais & Ômega-3',
      content: `Seu balanço nutricional ideal hoje pede ${fatTarget}g de gorduras boas e ${proteinTarget}g de proteínas. Lipídios monoinsaturados fortalecem a absorção de vitaminas lipossolúveis (A, D, E e K) e estabilizam neurotransmissores.`,
      macroFocus: 'fat',
      focusBadge: 'Gorduras Boas 🥑',
      recommendations: [
        { food: 'Azeite de Oliva Extra Virgem', portion: '1 colher de sopa (13ml)', gain: '+12g Ácidos Graxos Bons' },
        { food: 'Abacate Hass Maduro', portion: '80g', gain: '+11g Gordura Monoinsaturada' },
        { food: 'Castanhas-do-Pará Selecionadas', portion: '3 unidades (15g)', gain: '+10g Selênio & Lipídios' },
      ],
      targetProtein: proteinTarget,
      targetCarbs: carbsTarget,
      targetFat: fatTarget,
      targetCalories: caloriesTarget,
      source: 'firestore_live'
    };
  }, []);

  // Fetch or sync tip with Firestore
  const fetchTipFromFirestore = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    let loadedFromFirestore = false;

    try {
      const currentUser = auth.currentUser;
      const targetUid = currentUser?.uid || profile?.id;

      if (targetUid) {
        const userDocRef = doc(db, 'users', targetUid);
        const userDocSnap = await getDoc(userDocRef);

        let firestoreProfile: UserProfile | null = profile || null;
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as UserProfile;
          firestoreProfile = { ...profile, ...userData };
          loadedFromFirestore = true;
          setIsFirestoreSynced(true);
        }

        // Check if today's tip is already cached in Firestore subcollection
        const tipDocRef = doc(db, 'users', targetUid, 'dailyTips', todayKey);
        const tipSnap = await getDoc(tipDocRef);

        if (!forceRefresh && tipSnap.exists()) {
          const cached = tipSnap.data() as NutritionalTipData;
          if (cached && cached.headline && cached.content) {
            setTipData({
              ...cached,
              source: 'firestore_cache'
            });
            setLoading(false);
            return;
          }
        }

        // Generate tailored macro tip from Firestore profile metrics
        const newTip = generatePersonalizedMacroTip(firestoreProfile);
        setTipData(newTip);

        // Persist generated daily tip in Firestore for today
        try {
          await setDoc(tipDocRef, {
            ...newTip,
            date: todayKey,
            createdAt: serverTimestamp(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (saveErr) {
          console.warn('[DailyNutritionalTipCard] Aviso ao salvar dica diária no Firestore:', saveErr);
        }
      } else {
        // Fallback using profile prop when anonymous or local
        const fallbackTip = generatePersonalizedMacroTip(profile || null);
        fallbackTip.source = 'profile_derived';
        setTipData(fallbackTip);
      }
    } catch (err) {
      console.warn('[DailyNutritionalTipCard] Erro ao consultar Firestore:', err);
      const fallbackTip = generatePersonalizedMacroTip(profile || null);
      fallbackTip.source = 'profile_derived';
      setTipData(fallbackTip);
    } finally {
      setLoading(false);
    }
  }, [profile, todayKey, generatePersonalizedMacroTip]);

  useEffect(() => {
    fetchTipFromFirestore();
  }, [fetchTipFromFirestore]);

  // Voice speech synthesis via Malu (Aoede)
  const handleMaluSpeakTip = () => {
    if (!tipData) return;
    playSfx('pop');
    vibrate(20);
    setIsSpeaking(true);

    const speechText = `Olá! Aqui está sua Dica Nutricional do Dia, personalizada pelo seu perfil no Firestore. ${tipData.headline}. ${tipData.content} Como sugestão prática: ${tipData.recommendations.map(r => `${r.food}, ${r.portion}, fornecendo ${r.gain}`).join('. ')}. Continue firme nas suas metas!`;

    speak(speechText, {
      voice: MALU_VOICE_ID,
      lang: 'pt-BR'
    });

    setTimeout(() => {
      setIsSpeaking(false);
    }, 7000);
  };

  const handleRefresh = () => {
    playSfx('crystal');
    vibrate([20, 40]);
    fetchTipFromFirestore(true);
  };

  const currentMacroIcon = useMemo(() => {
    if (tipData?.macroFocus === 'protein') return <Zap className="w-5 h-5 text-emerald-400" />;
    if (tipData?.macroFocus === 'carbs') return <Apple className="w-5 h-5 text-amber-400" />;
    return <Droplet className="w-5 h-5 text-pink-400" />;
  }, [tipData?.macroFocus]);

  return (
    <div className={`card-premium p-6 sm:p-7 rounded-[32px] w-full border border-amber-500/25 dark:border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900/95 shadow-xl relative overflow-hidden ${className}`}>
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/25 shrink-0">
            <Lightbulb className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black font-display tracking-tight text-white flex items-center gap-2">
                Dica Nutricional do Dia
              </h3>
              {tipData?.focusBadge && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">
                  {tipData.focusBadge}
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 font-mono">
                <Database className="w-3 h-3 text-sky-400" />
                Firestore
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sugestões personalizadas de macronutrientes calibradas pelo seu perfil e metas.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Malu Voice ID Button */}
          <button
            type="button"
            data-malu-voice-id={MALU_VOICE_ID}
            onClick={handleMaluSpeakTip}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 border ${
              isSpeaking
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
            }`}
            title="Ouvir Dica Nutricional do Dia com a voz da Malu (Aoede)"
          >
            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce text-slate-950' : 'text-amber-400'}`} />
            <span>Ouvir Malu</span>
          </button>

          {/* Refresh Tip from Firestore */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Atualizar dica nutricional com dados do Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="relative z-10 pt-5 space-y-4">
        {loading ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
            <span className="text-xs font-medium">Carregando sugestões personalizadas do Firestore...</span>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {currentMacroIcon}
                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {tipData?.headline}
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {tipData?.content}
              </p>
            </div>

            {/* Macro Targets Reference Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Suas Metas Diárias:
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                🥩 Proteína: {tipData?.targetProtein}g
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold">
                🍞 Carbos: {tipData?.targetCarbs}g
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono font-bold">
                🥑 Gorduras: {tipData?.targetFat}g
              </span>
            </div>

            {/* Tailored Food Recommendations Grid */}
            {tipData?.recommendations && tipData.recommendations.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Alimentos Sugeridos para Alcançar Essa Meta:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {tipData.recommendations.map((rec, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between gap-1 hover:border-slate-700 transition"
                    >
                      <div>
                        <span className="font-bold text-white text-xs block">{rec.food}</span>
                        <span className="text-[10px] text-slate-400">{rec.portion}</span>
                      </div>
                      <span className="text-[11px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 self-start mt-1">
                        {rec.gain}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Navigation Action */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Calibrado para {profile?.goals || 'Seu Objetivo'}</span>
              </div>

              {onNavigate && (
                <button
                  type="button"
                  data-malu-voice-id={MALU_VOICE_ID}
                  onClick={() => {
                    playSfx('tap');
                    vibrate(15);
                    onNavigate('generator');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 transition cursor-pointer"
                  title="Gerar receitas com base nos macronutrientes da dica"
                >
                  <span>Ver Receitas com esses Macros</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DailyNutritionalTipCard;
