import { useCallback, useRef, useState } from 'react';

export interface VoiceTabMatch {
  tab: string;
  targetName: string;
  matchedKeyword: string;
  transcript: string;
}

interface VoiceTabRule {
  tab: string;
  targetNamePt: string;
  targetNameEn: string;
  keywords: string[];
  requireVerb?: boolean;
}

function normalizeVoiceText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,?!;:…"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NAVIGATION_VERB_PREFIX =
  /^(?:(?:ei\s+|oi\s+|ola\s+|malu[,!\s]+)*(?:por favor\s+)?(?:abrir|abra|ir\s+para|va\s+para|vai\s+para|navegar\s+para|navegue\s+para|mostrar|mostre|mostra|ver|veja|acessar|acesse|trocar\s+para|mudar\s+para|entrar\s+em|entrar\s+no|entrar\s+na|quero\s+ver|quero\s+ir\s+para|me\s+leve\s+para|open|go\s+to|navigate\s+to|switch\s+to|show\s+me|show|view|take\s+me\s+to)\s+(?:a\s+|o\s+|as\s+|os\s+|meu\s+|minha\s+|meus\s+|minhas\s+|my\s+|the\s+)?(?:aba\s+(?:de\s+|do\s+|da\s+)?|tela\s+(?:de\s+|do\s+|da\s+)?|pagina\s+(?:de\s+|do\s+|da\s+)?|tab\s+|section\s+)?)/i;

const VOICE_TAB_RULES: VoiceTabRule[] = [
  {
    tab: 'assistant360',
    targetNamePt: 'Assistente 360°',
    targetNameEn: 'Assistant 360°',
    keywords: ['assistente 360', 'assistant 360', 'inicio', 'home', 'dashboard', 'tela inicial', 'painel principal'],
    requireVerb: true,
  },
  {
    tab: 'plan',
    targetNamePt: 'Plano Alimentar',
    targetNameEn: 'Meal Plan',
    keywords: ['plano alimentar', 'cardapio semanal', 'meu cardapio', 'meal plan', 'weekly plan', 'dieta semanal'],
  },
  {
    tab: 'shopping',
    targetNamePt: 'Lista de Compras',
    targetNameEn: 'Shopping List',
    keywords: ['lista de compras', 'minhas compras', 'shopping list', 'grocery list', 'supermercado'],
  },
  {
    tab: 'generator',
    targetNamePt: 'Gerador de Receitas',
    targetNameEn: 'Recipe Generator',
    keywords: ['gerador de receitas', 'criar receita', 'recipe generator', 'gerar receitas'],
  },
  {
    tab: 'quickdishes',
    targetNamePt: 'Pratos Rápidos',
    targetNameEn: 'Quick Dishes',
    keywords: ['pratos rapidos', 'receitas rapidas', 'quick dishes', '15 minutos', '15 minutes'],
  },
  {
    tab: 'coach',
    targetNamePt: 'Coach Nutricional',
    targetNameEn: 'Nutrition Coach',
    keywords: ['coach nutricional', 'meu coach', 'nutrition coach', 'mentor nutricional'],
  },
  {
    tab: 'analyzer',
    targetNamePt: 'Scanner de Alimentos',
    targetNameEn: 'Food Scanner',
    keywords: ['scanner de alimentos', 'escanear prato', 'foto do prato', 'food scanner', 'plate scanner'],
  },
  {
    tab: 'habits',
    targetNamePt: 'Hábitos & Hidratação',
    targetNameEn: 'Habits & Hydration',
    keywords: ['habitos', 'hidratacao', 'controle de agua', 'beber agua', 'jejum intermitente', 'habits', 'hydration', 'fasting'],
  },
  {
    tab: 'glucose',
    targetNamePt: 'Glicemia',
    targetNameEn: 'Blood Glucose',
    keywords: ['glicemia', 'glicose', 'blood glucose', 'acucar no sangue'],
  },
  {
    tab: 'bloodpressure',
    targetNamePt: 'Pressão Arterial',
    targetNameEn: 'Blood Pressure',
    keywords: ['pressao arterial', 'pressao', 'blood pressure'],
  },
  {
    tab: 'trainer',
    targetNamePt: 'Personal Trainer 3D',
    targetNameEn: '3D Personal Trainer',
    keywords: ['personal trainer', 'meus treinos', 'treinos', 'exercicios', 'workout', 'workouts', 'musculacao'],
  },
  {
    tab: 'body',
    targetNamePt: 'Avaliação Corporal & IMC',
    targetNameEn: 'Body Metrics & BMI',
    keywords: ['avaliacao corporal', 'calculadora de imc', 'imc', 'peso ideal', 'bmi', 'body metrics'],
  },
  {
    tab: 'evolution',
    targetNamePt: 'Histórico & Evolução',
    targetNameEn: 'Progress & History',
    keywords: ['historico de peso', 'evolucao', 'meu progresso', 'progress history', 'weight history'],
  },
  {
    tab: 'pricing',
    targetNamePt: 'Planos & Assinatura',
    targetNameEn: 'Pricing & Plans',
    keywords: ['planos', 'precos', 'assinatura', 'premium', 'ad free', 'sem anuncios', 'pricing', 'subscription'],
  },
  {
    tab: 'academies',
    targetNamePt: 'Academias Parceiras',
    targetNameEn: 'Partner Gyms',
    keywords: ['academias', 'academia parceira', 'partner gyms', 'gyms'],
  },
  {
    tab: 'herbs',
    targetNamePt: 'Fitoterapia & Chás',
    targetNameEn: 'Medicinal Herbs',
    keywords: ['fitoterapia', 'enciclopedia de chas', 'plantas medicinais', 'medicinal herbs', 'herbal encyclopedia'],
  },
  {
    tab: 'fridge',
    targetNamePt: 'Geladeira Inteligente',
    targetNameEn: 'Smart Fridge',
    keywords: ['geladeira', 'geladeira inteligente', 'smart fridge', 'fridge'],
  },
  {
    tab: 'pantry',
    targetNamePt: 'Scanner de Despensa',
    targetNameEn: 'Pantry Scanner',
    keywords: ['despensa', 'scanner de despensa', 'pantry', 'pantry scanner'],
  },
  {
    tab: 'cooking_advisor',
    targetNamePt: 'Chef Malu • Cozinha IA',
    targetNameEn: 'Chef Malu • AI Cooking',
    keywords: ['chef malu', 'cozinha orientada', 'cooking advisor', 'dicas culinarias'],
  },
  {
    tab: 'garden',
    targetNamePt: 'Horta Orgânica',
    targetNameEn: 'Smart Garden',
    keywords: ['horta', 'horta organica', 'smart garden', 'garden'],
  },
  {
    tab: 'wellness',
    targetNamePt: 'Central de Bem-Estar',
    targetNameEn: 'Wellness Hub',
    keywords: ['wellness', 'bem estar', 'meditacao', 'respiracao', 'meditation'],
  },
  {
    tab: 'profile',
    targetNamePt: 'Meu Perfil',
    targetNameEn: 'My Profile',
    keywords: ['meu perfil', 'perfil', 'minha conta', 'configuracoes', 'profile', 'my account', 'settings'],
  },
  {
    tab: 'partner',
    targetNamePt: 'Portal de Parceiros',
    targetNameEn: 'Partner Portal',
    keywords: ['parceiros', 'cupons', 'descontos', 'partner portal', 'partners'],
  },
  {
    tab: 'market',
    targetNamePt: 'Mercado Saudável',
    targetNameEn: 'Healthy Market',
    keywords: ['mercado', 'marketplace', 'loja', 'market'],
  },
  {
    tab: 'swaps',
    targetNamePt: 'Trocas Inteligentes',
    targetNameEn: 'Smart Swaps',
    keywords: ['trocas inteligentes', 'substituicoes', 'smart swaps'],
  },
  {
    tab: 'dining',
    targetNamePt: 'Comer Fora',
    targetNameEn: 'Dining Out',
    keywords: ['comer fora', 'restaurantes', 'dining out'],
  },
  {
    tab: 'challenge',
    targetNamePt: 'Desafios',
    targetNameEn: 'Challenges',
    keywords: ['desafios', 'challenge', 'challenges'],
  },
];

export function matchVoiceTabCommand(
  cmd: string | undefined,
  lang: string = 'pt-BR'
): VoiceTabMatch | null {
  if (!cmd || !cmd.trim()) return null;

  const normalized = normalizeVoiceText(cmd);
  if (!normalized) return null;

  const isPt = !lang.toLowerCase().startsWith('en');
  const hasExplicitVerb = NAVIGATION_VERB_PREFIX.test(normalized);
  const strippedTarget = normalized.replace(NAVIGATION_VERB_PREFIX, '').trim();

  // Avoid stealing explicit recipe/herb search phrases such as "quero receita de panqueca" or "buscar cha de alecrim"
  const isSearchPhraseWithoutNavVerb =
    !hasExplicitVerb &&
    /(?:receita de|receitas de|receita com|cha de|ingredientes|how to|recipe for|recipe with|ingredients for)/.test(
      normalized
    );
  if (isSearchPhraseWithoutNavVerb) {
    return null;
  }

  for (const rule of VOICE_TAB_RULES) {
    if (rule.requireVerb && !hasExplicitVerb) {
      continue;
    }

    for (const kw of rule.keywords) {
      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const boundaryRegex = new RegExp(`(?:^|\\s)${escapedKw}(?:$|\\s)`);

      if (
        strippedTarget === kw ||
        boundaryRegex.test(strippedTarget) ||
        (hasExplicitVerb && boundaryRegex.test(normalized))
      ) {
        return {
          tab: rule.tab,
          targetName: isPt ? rule.targetNamePt : rule.targetNameEn,
          matchedKeyword: kw,
          transcript: cmd.trim(),
        };
      }
    }
  }

  // Fallback for generic verb + short single tab phrase ("abrir receitas" -> generator, "open market" -> market)
  if (hasExplicitVerb) {
    if (/\breceitas?\b|\brecipes?\b/.test(strippedTarget)) {
      return {
        tab: 'generator',
        targetName: isPt ? 'Gerador de Receitas' : 'Recipe Generator',
        matchedKeyword: 'receitas',
        transcript: cmd.trim(),
      };
    }
    if (/\bcompras?\b|\bshopping\b/.test(strippedTarget)) {
      return {
        tab: 'shopping',
        targetName: isPt ? 'Lista de Compras' : 'Shopping List',
        matchedKeyword: 'compras',
        transcript: cmd.trim(),
      };
    }
    if (/\bplano\b|\bcardapio\b|\bmeal plan\b/.test(strippedTarget)) {
      return {
        tab: 'plan',
        targetName: isPt ? 'Plano Alimentar' : 'Meal Plan',
        matchedKeyword: 'plano',
        transcript: cmd.trim(),
      };
    }
    if (/\bchas?\b|\btea\b|\bherbs?\b/.test(strippedTarget)) {
      return {
        tab: 'herbs',
        targetName: isPt ? 'Fitoterapia & Chás' : 'Medicinal Herbs',
        matchedKeyword: 'chas',
        transcript: cmd.trim(),
      };
    }
  }

  return null;
}

export function useVoiceTabNavigator(options?: {
  onNavigate?: (tab: string) => void;
  lang?: string;
}) {
  const [lastMatch, setLastMatch] = useState<VoiceTabMatch | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateTab = useCallback(
    (tab: string, targetName?: string) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: tab }));
      }
      if (options?.onNavigate) {
        options.onNavigate(tab);
      }
      if (targetName) {
        setLastMatch({
          tab,
          targetName,
          matchedKeyword: tab,
          transcript: targetName,
        });
      }
    },
    [options]
  );

  const previewVoiceCommand = useCallback(
    (cmd?: string): VoiceTabMatch | null => {
      return matchVoiceTabCommand(cmd, options?.lang || 'pt-BR');
    },
    [options?.lang]
  );

  const processVoiceCommand = useCallback(
    (cmd?: string): VoiceTabMatch | null => {
      const match = matchVoiceTabCommand(cmd, options?.lang || 'pt-BR');
      if (!match) return null;

      setLastMatch(match);
      setIsNavigating(true);

      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
      }
      navTimerRef.current = setTimeout(() => {
        setIsNavigating(false);
      }, 1500);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: match.tab }));
      }
      if (options?.onNavigate) {
        options.onNavigate(match.tab);
      }

      return match;
    },
    [options]
  );

  const clearMatch = useCallback(() => {
    setLastMatch(null);
    setIsNavigating(false);
  }, []);

  return {
    navigateTab,
    previewVoiceCommand,
    processVoiceCommand,
    clearMatch,
    lastMatch,
    isNavigating,
  };
}
