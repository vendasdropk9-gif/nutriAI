import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Sparkles, Leaf, ChefHat, BookOpen, X, ChevronRight, Apple, Globe, 
  Mic, MicOff, Heart, Flame, Zap, ShieldAlert, Scale, Brain, Camera, User, 
  CalendarDays, ShoppingBasket, Image as ImageIcon, Trophy, Store, MapPin, 
  Dumbbell, Activity, Crown, Package, Radio, Utensils
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { useLanguage, useTranslation } from '../contexts/LanguageContext';
import { useVoiceTabNavigator } from '../hooks/useVoiceTabNavigator';

interface GlobalSearchProps {
  activeTab: string;
  onNavigate: (tab: any) => void;
  isDarkMode: boolean;
  variant?: 'auto' | 'desktop' | 'mobile';
}

/**
 * Natural Language Voice Command parser for recipes, ingredients, teas, and features
 */
export function extractVoiceSearchQuery(rawTranscript: string, lang: string = 'pt-BR'): {
  cleanedQuery: string;
  detectedType: 'recipe' | 'ingredient' | 'herb' | 'feature' | 'general';
  originalTranscript: string;
} {
  if (!rawTranscript || !rawTranscript.trim()) {
    return { cleanedQuery: '', detectedType: 'general', originalTranscript: '' };
  }

  const text = rawTranscript.trim();
  let lower = text.toLowerCase();

  // Strip trailing punctuation
  lower = lower.replace(/[.,?!;:…]+$/, '').trim();

  // Portuguese natural language patterns
  const ptPatterns: Array<{ pattern: RegExp; type: 'recipe' | 'ingredient' | 'herb' | 'feature' | 'general' }> = [
    { pattern: /^(?:eu\s+)?(?:quero|gostaria\s+de|preciso\s+de|desejo)\s+(?:ver\s+|fazer\s+|preparar\s+|encontrar\s+|buscar\s+)?(?:uma\s+|um\s+|alguma\s+)?(?:receita\s+de\s+|receitas\s+de\s+|receitas\s+com\s+|receita\s+com\s+)(.+)/i, type: 'recipe' },
    { pattern: /^(?:procure|pesquisar|buscar|busque|encontre|ache|procurar|pesquise)\s+(?:por\s+)?(?:uma\s+|um\s+|alguma\s+)?(?:receita\s+de\s+|receitas\s+de\s+|receitas\s+com\s+|receita\s+com\s+)(.+)/i, type: 'recipe' },
    { pattern: /^(?:como\s+(?:fazer|preparar|cozinhar)|qual\s+a\s+receita\s+de)\s+(.+)/i, type: 'recipe' },
    { pattern: /^(?:ingredientes\s+(?:de|para|do|da)|quais\s+os\s+ingredientes\s+de)\s+(.+)/i, type: 'ingredient' },
    { pattern: /^(?:receitas?\s+(?:de|com|fit\s+de|faceis\s+de|rapidas\s+de|saudaveis\s+de|saudaveis\s+com))\s+(.+)/i, type: 'recipe' },
    { pattern: /^(?:quero|busque|buscar|encontrar|ver|procurar|pesquisar)\s+(?:o\s+|um\s+|uma\s+)?(?:cha\s+de\s+|chá\s+de\s+|infusao\s+de\s+|infusão\s+de\s+|erva\s+)(.+)/i, type: 'herb' },
    { pattern: /^(?:cha\s+de\s+|chá\s+de\s+|infusao\s+de\s+|infusão\s+de\s+)(.+)/i, type: 'herb' },
    { pattern: /^(?:abrir|ver|ir\s+para|acessar|mostrar)\s+(?:a\s+|o\s+|meu\s+|minha\s+)?(?:tela\s+de\s+|funcionalidade\s+de\s+|recurso\s+de\s+)?(.+)/i, type: 'feature' },
    { pattern: /^(?:procure|pesquisar|buscar|busque|encontre|ache|procurar|pesquise|quero|mostrar|mostre|ver)\s+(?:por\s+|sobre\s+|o\s+|a\s+|os\s+|as\s+|um\s+|uma\s+)?(.+)/i, type: 'general' },
  ];

  // English natural language patterns
  const enPatterns: Array<{ pattern: RegExp; type: 'recipe' | 'ingredient' | 'herb' | 'feature' | 'general' }> = [
    { pattern: /^(?:i\s+want\s+(?:to\s+(?:see|cook|make|find)\s+)?|i\s+need\s+(?:a\s+)?)(?:recipe\s+for\s+|recipes\s+for\s+|recipes\s+with\s+|recipe\s+with\s+)(.+)/i, type: 'recipe' },
    { pattern: /^(?:search\s+for|look\s+for|find\s+me|find|show\s+me|get\s+me)\s+(?:recipes\s+for\s+|recipes\s+with\s+|recipe\s+for\s+|recipe\s+with\s+)(.+)/i, type: 'recipe' },
    { pattern: /^(?:how\s+to\s+(?:cook|make|prepare)|what\s+is\s+the\s+recipe\s+for)\s+(.+)/i, type: 'recipe' },
    { pattern: /^(?:ingredients\s+for|what\s+are\s+the\s+ingredients\s+for)\s+(.+)/i, type: 'ingredient' },
    { pattern: /^(?:recipes?\s+(?:for|with|healthy|quick))\s+(.+)/i, type: 'recipe' },
    { pattern: /^(?:search\s+for|look\s+for|find|show\s+me|show|open|go\s+to)\s+(?:the\s+|a\s+|an\s+)?(.+)/i, type: 'general' },
  ];

  const patterns = lang.toLowerCase().startsWith('pt') 
    ? [...ptPatterns, ...enPatterns] 
    : [...enPatterns, ...ptPatterns];

  for (const item of patterns) {
    const match = lower.match(item.pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length >= 2) {
        return {
          cleanedQuery: extracted,
          detectedType: item.type,
          originalTranscript: text
        };
      }
    }
  }

  return {
    cleanedQuery: text,
    detectedType: 'general',
    originalTranscript: text
  };
}

// 1. App Features/Modules definition with comprehensive keywords and description
const appFeatures = [
  {
    name: "Assistente de Saúde 360° (Malu AI)",
    description: "Visão geral de metas diárias, recomendações inteligentes e assistente por voz.",
    tab: "assistant360",
    icon: Globe,
    category: "feature",
    tags: ["inicio", "home", "chat", "assistente", "malu", "dashboard", "geral", "nutriai", "dia", "rotina", "voz", "360"]
  },
  {
    name: "Pratos Rápidos & Fáceis (Até 15 min)",
    description: "Receitas saudáveis ultrarrápidas para o dia a dia e marmitas práticas.",
    tab: "quickdishes",
    icon: Flame,
    category: "feature",
    tags: ["pratos rapidos", "rapido", "facil", "15 minutos", "marmita", "praticidade", "almoço rapido", "jantar rapido", "lanche"]
  },
  {
    name: "Coach Nutricional IA",
    description: "Orientação e conselhos diários personalizados para sua meta de saúde.",
    tab: "coach",
    icon: Zap,
    category: "feature",
    tags: ["coach", "mentor", "dicas", "motivacao", "ia", "conselhos", "habitos", "nutricionista"]
  },
  {
    name: "Gerador de Receitas por IA",
    description: "Crie pratos saudáveis e personalizados com os ingredientes da sua geladeira.",
    tab: "generator",
    icon: ChefHat,
    category: "feature",
    tags: ["gerador de receitas", "receita", "receitas", "cozinhar", "cardapio", "prato", "ingredientes", "dieta", "culinaria"]
  },
  {
    name: "Cardápio Semanal Personalizado",
    description: "Planejamento nutricional completo de 7 dias com café, almoço e jantar.",
    tab: "mealplan",
    icon: CalendarDays,
    category: "feature",
    tags: ["cardapio", "semanal", "planejamento", "semana", "refeicoes", "organizar", "dieta 7 dias"]
  },
  {
    name: "Scanner de Alimentos por Foto",
    description: "Fotografe seu prato para calcular calorias, macros e qualidade nutricional instantaneamente.",
    tab: "scanner",
    icon: Camera,
    category: "feature",
    tags: ["scanner", "foto", "prato", "camera", "calorias da foto", "reconhecer comida", "inteligencia artificial"]
  },
  {
    name: "Acompanhamento de Glicemia",
    description: "Registro de glicose em jejum, pós-prandial e alertas preventivos.",
    tab: "glucose",
    icon: Activity,
    category: "feature",
    tags: ["glicemia", "glicose", "diabetes", "acucar no sangue", "hba1c", "insulina", "curva glicemica"]
  },
  {
    name: "Diário de Hábitos & Humor",
    description: "Acompanhe sono, estresse, disposição física e sintomas ao longo dos dias.",
    tab: "lifestyle",
    icon: Brain,
    category: "feature",
    tags: ["habitos", "sono", "humor", "estresse", "disposicao", "rotina", "saude mental", "diario"]
  },
  {
    name: "Guia de Avaliação Corporal & IMC",
    description: "Calculadora de IMC, peso ideal, taxa metabólica basal e metas de peso.",
    tab: "imc",
    icon: Scale,
    category: "feature",
    tags: ["imc", "peso", "gordura", "balanca", "metabolismo", "tmb", "massa muscular", "emagrecer", "peso ideal"]
  },
  {
    name: "Lista de Compras Inteligente",
    description: "Lista sincronizada com receitas geradas, dividida por seções de supermercado.",
    tab: "shopping",
    icon: ShoppingBasket,
    category: "feature",
    tags: ["lista de compras", "compras", "mercado", "supermercado", "feira", "mantimentos", "itens"]
  },
  {
    name: "Personal Trainer 3D & Treinos",
    description: "Exercícios com avatares 3D, divisão muscular e séries detalhadas para fazer em casa ou academia.",
    tab: "workout",
    icon: Dumbbell,
    category: "feature",
    tags: ["treino", "personal", "exercicios", "3d", "academia", "musculacao", "emagrecimento", "queimar gordura"]
  },
  {
    name: "Timer & Protocolos de Jejum Intermitente",
    description: "Acompanhe suas janelas de alimentação (16/8, 14/10, 18/6) com cronômetro em tempo real.",
    tab: "fasting",
    icon: Flame,
    category: "feature",
    tags: ["jejum", "intermitente", "cronometro", "fasting", "janela alimentar", "autofagia", "queima de gordura"]
  },
  {
    name: "Calculadora de Hidratação & Alerta de Água",
    description: "Meta diária personalizada de ingestão de água e lembretes sonoros periódicos.",
    tab: "water",
    icon: Apple,
    category: "feature",
    tags: ["agua", "hidratacao", "beber agua", "copos", "garrafa", "lembrete de agua", "litros"]
  },
  {
    name: "Histórico & Evolução de Peso",
    description: "Gráficos de progresso, perda de gordura e histórico de calorias consumidas.",
    tab: "history",
    icon: Trophy,
    category: "feature",
    tags: ["historico", "graficos", "evolucao", "progresso", "perda de peso", "relatorio", "estatisticas"]
  },
  {
    name: "Planos Premium e Assinatura",
    description: "Veja os benefícios do NutriAI Pro e inteligência artificial ilimitada.",
    tab: "pricing",
    icon: Crown,
    category: "feature",
    tags: ["precos", "planos", "assinatura", "premium", "vip", "comprar premium", "pro", "dinheiro", "cartao"]
  },
  {
    name: "Pesquisar Academias Parceiras",
    description: "Encontre ginásios, estúdios e academias com desconto pelo aplicativo.",
    tab: "academies",
    icon: Globe,
    category: "feature",
    tags: ["academias", "parceiros", "gym", "modalidades", "treinar", "descontos", "bairro"]
  },
  {
    name: "Enciclopédia de Fitoterapia & Chás",
    description: "Tudo sobre plantas medicinais, ciência por trás do preparo e alertas.",
    tab: "herbs",
    icon: Leaf,
    category: "feature",
    tags: ["ervas", "medicinais", "cha", "infusao", "fitoterapia", "cura", "plantas", "botanica", "alecrim", "gengibre"]
  },
  {
    name: "Geladeira Inteligente & Desperdício Zero",
    description: "Acompanhe validades e organize as sobras com avisos automáticos.",
    tab: "fridge",
    icon: Apple,
    category: "feature",
    tags: ["geladeira", "inventario", "desperdicio", "alimentos", "vencimento", "estoque", "cozinha", "comida estragando"]
  },
  {
    name: "Scanner de Despensa & Aproveitamento de Validades",
    description: "Escaneie códigos de barras ou cadastre mantimentos. Gere receitas que priorizam alimentos perto do vencimento.",
    tab: "pantry",
    icon: Package,
    category: "feature",
    tags: ["despensa", "scanner", "codigo de barras", "validade", "vencimento", "anti-desperdicio", "mantimentos", "ingredientes", "salvar comida", "aproveitamento"]
  },
  {
    name: "Chef Malu • Cozinha Orientada por IA",
    description: "Tire dúvidas culinárias (tempo de forno, substituições saudáveis como iogurte no lugar de creme de leite) com áudio Aoede.",
    tab: "cooking_advisor",
    icon: ChefHat,
    category: "feature",
    tags: ["chef", "cozinha orientada", "quanto tempo assar", "assar frango", "substituir", "creme de leite", "iogurte grego", "culinaria", "dicas de preparo", "temperatura", "forno", "nutricao"]
  },
  {
    name: "Horta Orgânica em Casa",
    description: "Dicas de semeadura, rega e insolação de hortaliças em vasos ou quintais.",
    tab: "garden",
    icon: Leaf,
    category: "feature",
    tags: ["horta", "cultivar", "plantar", "temperos", "organico", "casa", "jardim", "vaso", "terra"]
  },
  {
    name: "Central de Meditações e Respiração (Wellness Hub)",
    description: "Frequências sonoras curativas, controle de batimentos e exercícios de relaxamento.",
    tab: "wellness",
    icon: Heart,
    category: "feature",
    tags: ["wellness", "bem-estar", "meditacao", "respiracao", "relaxar", "som", "ansiedade", "foco", "calma", "solfejo"]
  },
  {
    name: "Meu Perfil e Dados Pessoais",
    description: "Edite suas fotos, medidas corporais, restrições e configurações de conta.",
    tab: "profile",
    icon: User,
    category: "feature",
    tags: ["perfil", "conta", "foto", "dados", "configuracoes", "nome", "senha", "biometria", "peso meta"]
  },
  {
    name: "Integração Google Fit & Apple Health",
    description: "Sincronize passos, calorias ativas e ajuste dinamicamente seu plano alimentar.",
    tab: "profile",
    icon: Activity,
    category: "feature",
    tags: ["google fit", "apple health", "passos", "calorias ativas", "sincronizacao", "healthkit", "oauth", "fitness", "gasto calorico", "relogio", "smartwatch"]
  },
  {
    name: "Parceiros & Descontos Exclusivos",
    description: "Lojas de suplementos, produtos naturais e academias com cupom.",
    tab: "partner",
    icon: Store,
    category: "feature",
    tags: ["parceiro", "cupom", "desconto", "loja", "suplementos", "compras", "vantagens"]
  }
];

// 2. Default Medicinal Herbs definition
const medicinalHerbs = [
  {
    id: "herb-alecrim",
    name: "Chá de Alecrim",
    scientific: "Rosmarinus officinalis",
    description: "Estimulante digestivo, tônico circulatório e excelente para cansaço mental.",
    category: "herb",
    tags: ["alecrim", "digestao", "circulacao", "foco", "energia", "tonico", "dor de cabeca", "memoria", "rosemary"]
  },
  {
    id: "herb-capim-limao",
    name: "Chá de Capim-Limão",
    scientific: "Cymbopogon citratus",
    description: "Calmante suave, ansiolítico leve e relaxante para cólicas abdominais.",
    category: "herb",
    tags: ["capim limao", "capim cidreira", "capim santo", "calmante", "ansiedade", "dormir", "colica", "digestivo", "lemongrass"]
  },
  {
    id: "herb-camomila",
    name: "Chá de Camomila",
    scientific: "Matricaria chamomilla",
    description: "Forte ação ansiolítica, calmante para insônia e relaxante muscular.",
    category: "herb",
    tags: ["camomila", "dormir", "calmante", "sono", "ansiedade", "estresse", "colica", "bebe", "chazinho", "chamomile"]
  },
  {
    id: "herb-gengibre",
    name: "Chá de Gengibre",
    scientific: "Zingiber officinale",
    description: "Poderoso termogênico, digestivo, combate náuseas e atua como anti-inflamatório.",
    category: "herb",
    tags: ["gengibre", "emagrecer", "termogenico", "inflamacao", "gripe", "tosse", "garganta", "enjoo", "digestao", "ginger"]
  },
  {
    id: "herb-hortela",
    name: "Chá de Hortelã",
    scientific: "Mentha piperita",
    description: "Alivia gases intestinais, melhora a digestão pesada e acalma dores de cabeça irritantes.",
    category: "herb",
    tags: ["hortela", "gases", "digestao", "estomago", "refrescante", "halito", "respiracao", "sinusite", "mint", "peppermint"]
  },
  {
    id: "herb-guaco",
    name: "Chá de Guaco",
    scientific: "Mikania glomerata",
    description: "Expectorante natural consagrado contra tosse, asma e bronquite.",
    category: "herb",
    tags: ["guaco", "tosse", "expectorante", "gripe", "resfriado", "pulmao", "respirar"]
  }
];

// 3. Dynamic Recipes & Healthy Ingredients
const healthyRecipesAndIngredients = [
  {
    name: "Crepioca Fit de Aveia",
    description: "Receita rápida rica em proteínas com aveia, queijo cottage e sementes de chia.",
    ingredients: "aveia, ovo, queijo cottage, chia",
    preferences: "Rápido, Proteico",
    category: "recipe",
    tags: ["crepioca", "aveia", "ovo", "fit", "cafe da manha", "proteina", "rapido", "saudavel", "oat pancake"]
  },
  {
    name: "Shake Funcional de Banana & Whey",
    description: "Excelente pós-treino com banana, whey protein, leite de amêndoas e canela.",
    ingredients: "banana, whey protein, leite de amêndoas, canela",
    preferences: "Pós-treino, Hipertrofia",
    category: "recipe",
    tags: ["shake", "vitamina", "whey", "banana", "leite vegetal", "pos-treino", "academia", "maromba", "protein shake"]
  },
  {
    name: "Salada Colorida de Quinoa & Frango",
    description: "Refeição equilibrada com peito de frango grelhado, quinoa cozida, pepino e hortelã.",
    ingredients: "peito de frango, quinoa, pepino, tomate cereja, hortelã",
    preferences: "Almoço Leve, Low Carb",
    category: "recipe",
    tags: ["salada", "quinoa", "frango", "almoço", "jantar", "leve", "low carb", "proteico", "chicken salad"]
  },
  {
    name: "Sopa Termogênica de Abóbora & Gengibre",
    description: "Cremosa sopa desintoxicante de abóbora cabotiá temperada com raspas de gengibre.",
    ingredients: "abóbora cabotiá, gengibre, alho poró, azeite",
    preferences: "Jantar Detox, Termogênico",
    category: "recipe",
    tags: ["sopa", "caldo", "abobora", "gengibre", "jantar", "detox", "frio", "termogenico", "pumpkin soup"]
  },
  {
    name: "Suco Verde Super Detox",
    description: "Suco prensado de couve, maçã fuji, limão siciliano e gengibre termogênico.",
    ingredients: "couve, limão, maçã, gengibre, hortelã",
    preferences: "Detox, Matinal",
    category: "recipe",
    tags: ["suco verde", "detox", "couve", "gengibre", "suco", "imunidade", "frescor", "emagrecer", "green juice"]
  },
  {
    name: "Aveia em Flocos",
    description: "Super grão rico em beta-glucanas que regulam o intestino, controlam colesterol e dão saciedade.",
    ingredients: "aveia",
    preferences: "Ingrediente Rico em Fibras",
    category: "ingredient",
    tags: ["aveia", "fibra", "intestino", "colesterol", "saciedade", "carboidrato complexo", "mingau", "oats"]
  },
  {
    name: "Sementes de Chia",
    description: "Semente rica em ômega-3, magnésio e fibras solúveis, excelente para criar géis saudáveis.",
    ingredients: "chia",
    preferences: "Ingrediente Rico em Ômega-3",
    category: "ingredient",
    tags: ["chia", "semente", "omega 3", "anti-inflamatorio", "pudim", "saciedade", "fibras", "chia seeds"]
  },
  {
    name: "Abacate Orgânico",
    description: "Excelente fonte de gorduras monoinsaturadas boas, beta-sitosterol e potássio.",
    ingredients: "abacate",
    preferences: "Gorduras Saudáveis",
    category: "ingredient",
    tags: ["abacate", "gordura boa", "coracao", "vitamina e", "salada", "creme", "guacamole", "avocado"]
  },
  {
    name: "Omelete de Espinafre e Queijo Branco",
    description: "Refeição proteica rica em ferro e minerais, pronta em menos de 8 minutos.",
    ingredients: "ovos, espinafre fresco, queijo minas, azeite, orégano",
    preferences: "Rápido, Low Carb, Proteico",
    category: "recipe",
    tags: ["omelete", "espinafre", "ovo", "queijo", "cafe da manha", "jantar leve", "proteina", "spinach omelette"]
  },
  {
    name: "Panqueca de Banana e Canela",
    description: "Panqueca natural sem açúcar e sem farinha de trigo, perfeita para pré-treino.",
    ingredients: "banana madura, ovos, aveia, canela em pó",
    preferences: "Pré-Treino, Sem Glúten",
    category: "recipe",
    tags: ["panqueca", "banana", "canela", "sem gluten", "sem acucar", "pre-treino", "banana pancake"]
  }
];

// Helper component for real-time speech waveform feedback animation with emerald + gold gradient
const VoiceWaveform = ({ barCount = 5, className = "" }: { barCount?: number; className?: string }) => {
  return (
    <div className={`flex items-center gap-1 h-4 px-1 ${className}`}>
      {Array.from({ length: barCount }).map((_, idx) => (
        <motion.span
          key={idx}
          className="w-1 bg-gradient-to-t from-[#10B981] via-[#16C784] to-[#D8B14A] rounded-full shadow-[0_0_8px_rgba(216,177,74,0.25)]"
          animate={{
            height: ['20%', '100%', '35%', '85%', '25%'],
            opacity: [0.7, 1, 0.8, 1, 0.7],
          }}
          transition={{
            repeat: Infinity,
            repeatType: 'reverse',
            duration: 0.45 + (idx % 3) * 0.14,
            ease: "easeInOut",
            delay: idx * 0.08,
          }}
        />
      ))}
    </div>
  );
};

export function GlobalSearch({ activeTab, onNavigate, isDarkMode, variant = 'auto' }: GlobalSearchProps) {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const [queryText, setQueryText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [detectedVoiceIntent, setDetectedVoiceIntent] = useState<'recipe' | 'ingredient' | 'herb' | 'feature' | 'general' | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeLangCode = language || 'pt-BR';

  // Hook for voice keywords switching tabs (e.g., 'Malu, show my meal plan' -> navigates to plan tab)
  const { processVoiceCommand, lastMatch, isNavigating } = useVoiceTabNavigator({
    onNavigate: (targetTab) => {
      onNavigate(targetTab);
      setTimeout(() => {
        setIsOpen(false);
        setQueryText('');
      }, 400);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    },
    lang: activeLangCode
  });

  // Speech Recognition handler with Natural Language Voice Command extraction
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      setIsListening(false);
      setInterimTranscript('');
      setDetectedVoiceIntent(null);
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      const msg = activeLangCode.startsWith('pt')
        ? 'Seu navegador não possui suporte ao microfone. Tente utilizar o Google Chrome, Safari ou Edge.'
        : 'Your browser does not support microphone speech recognition. Try Google Chrome, Safari, or Edge.';
      alert(msg);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      
      // Match active language dialect
      if (activeLangCode === 'en-US' || activeLangCode === 'en-GB' || activeLangCode === 'en-AU') {
        recognition.lang = activeLangCode;
      } else if (activeLangCode.startsWith('en')) {
        recognition.lang = 'en-US';
      } else {
        recognition.lang = 'pt-BR';
      }

      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setIsOpen(true);
        setInterimTranscript('');
        setDetectedVoiceIntent(null);
        playSfx('tap');
        vibrate(25);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        if (transcript) {
          setInterimTranscript(transcript);

          // 1. Check if spoken phrase triggers a keyword tab navigation (e.g. 'Malu, show my meal plan')
          const navMatch = processVoiceCommand(transcript);
          if (navMatch) {
            setQueryText(navMatch.targetName);
            return;
          }

          // 2. Otherwise extract natural language query for recipes, ingredients, teas, or features
          const parsed = extractVoiceSearchQuery(transcript, recognition.lang);
          setDetectedVoiceIntent(parsed.detectedType);
          setQueryText(parsed.cleanedQuery || transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('GlobalSearch speech recognition error:', event.error);
        setIsListening(false);
        setInterimTranscript('');
        vibrate([40, 40, 40]);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        playSfx('success');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start notice:', err);
      setIsListening(false);
      setInterimTranscript('');
    }
  };

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as HTMLElement;
      // Do not close if clicking inside container or inside modal portal
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }
      if (target && target.closest('[data-search-modal]')) {
        return;
      }
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Keyboard shortcut (Ctrl+K, Cmd+K, Escape)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => {
          desktopInputRef.current?.focus();
          mobileInputRef.current?.focus();
        }, 50);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // When isOpen changes, auto focus inputs
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  // Live query filter
  useEffect(() => {
    if (!queryText.trim()) {
      setResults([]);
      return;
    }

    const q = queryText.toLowerCase().trim();
    const qStem = (q.length > 3 && q.endsWith('s')) ? q.slice(0, -1) : q;
    
    const textMatch = (str: string) => str.toLowerCase().includes(q) || str.toLowerCase().includes(qStem);
    const tagMatch = (tags: string[]) => tags.some(tag => tag.toLowerCase().includes(q) || tag.toLowerCase().includes(qStem));

    // 1. Filter Features
    const matchedFeatures = appFeatures.filter(f => 
      textMatch(f.name) ||
      textMatch(f.description) ||
      tagMatch(f.tags)
    ).slice(0, 5);

    // 2. Filter Herbs
    const matchedHerbs = medicinalHerbs.filter(h => 
      textMatch(h.name) ||
      textMatch(h.scientific) ||
      textMatch(h.description) ||
      tagMatch(h.tags)
    ).slice(0, 4);

    // 3. Filter Recipes/Ingredients
    const matchedRecipes = healthyRecipesAndIngredients.filter(r => 
      textMatch(r.name) ||
      textMatch(r.description) ||
      tagMatch(r.tags)
    ).slice(0, 5);

    setResults([
      ...matchedFeatures,
      ...matchedHerbs,
      ...matchedRecipes
    ]);
  }, [queryText]);

  const handleResultClick = (item: any) => {
    playSfx('tap');
    vibrate(12);
    setIsOpen(false);
    setQueryText('');

    if (item.category === "feature") {
      onNavigate(item.tab);
    } else if (item.category === "herb") {
      onNavigate("herbs");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('app:selectHerb', { 
          detail: { herbId: item.id } 
        }));
      }, 100);
    } else if (item.category === "recipe" || item.category === "ingredient") {
      onNavigate("generator");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('app:searchRecipeOrIngredient', { 
          detail: { 
            ingredients: item.ingredients || item.name,
            preferences: item.preferences || "" 
          } 
        }));
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleResultClick(results[0]);
    }
  };

  const isPt = activeLangCode.startsWith('pt');
  const showDesktop = variant === 'auto' || variant === 'desktop';
  const showMobile = variant === 'auto' || variant === 'mobile';

  return (
    <div className="relative" ref={dropdownRef} id="global-search-container">
      {/* Desktop Search Input */}
      {showDesktop && (
        <div className={`${variant === 'auto' ? 'hidden md:flex' : 'flex'} items-center w-[280px] lg:w-[360px] relative group`}>
          <button
            type="button"
            onClick={() => {
              desktopInputRef.current?.focus();
              setIsOpen(true);
            }}
            className="absolute left-3.5 text-slate-400 hover:text-emerald-500 transition-colors flex items-center cursor-pointer"
            title={isPt ? "Clique para pesquisar ou pressione Ctrl+K" : "Click to search or press Ctrl+K"}
          >
            {isListening ? (
              <VoiceWaveform barCount={5} />
            ) : (
              <Search className="w-4 h-4 text-emerald-500" />
            )}
          </button>
          <input
            ref={desktopInputRef}
            type="text"
            value={queryText}
            onChange={(e) => {
              setQueryText(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening 
                ? (isPt ? "Ouvindo... Diga receitas ou ingredientes!" : "Listening... Speak recipes or ingredients!") 
                : (isPt ? "Busque receitas, chás, recursos..." : "Search recipes, teas, features...")
            }
            className={`w-full pl-10 pr-20 py-2 rounded-full border bg-white/75 dark:bg-slate-900/60 backdrop-blur-md text-sm font-medium placeholder-slate-400 focus:outline-none transition-all duration-300 shadow-inner ${
              isListening
                ? 'border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-slate-200 dark:border-slate-800/80 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20'
            }`}
          />
          
          {/* Right side buttons: Clear & Microphone Trigger */}
          <div className="absolute right-2.5 flex items-center gap-1.5">
            {isListening && (
              <VoiceWaveform barCount={4} className="hidden lg:flex" />
            )}

            {queryText && (
              <button
                onClick={() => {
                  playSfx('tap');
                  setQueryText('');
                  desktopInputRef.current?.focus();
                }}
                className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                title={isPt ? "Limpar busca" : "Clear search"}
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleListening();
              }}
              className={`p-1.5 rounded-full transition-all duration-300 cursor-pointer relative ${
                isListening
                  ? 'bg-gradient-to-r from-[#16C784] to-[#D8B14A] text-slate-950 shadow-[0_0_15px_rgba(216,177,74,0.5)] scale-110 ring-2 ring-emerald-400'
                  : 'text-slate-400 hover:text-[#16C784] hover:bg-emerald-50 dark:hover:bg-slate-800/80'
              }`}
              title={
                isListening 
                  ? (isPt ? "Parar de ouvir" : "Stop listening") 
                  : (isPt ? "Comando de voz: Buscar receitas ou ingredientes (Microfone)" : "Voice Command: Search recipes or ingredients (Microphone)")
              }
              type="button"
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </motion.button>
          </div>
          
          {/* Descriptive Tooltip */}
          {!isOpen && !queryText && !isListening && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 p-2.5 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 delay-300 pointer-events-none z-50">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 dark:bg-slate-700 rotate-45 rounded-sm"></div>
              <p className="relative z-10 text-center font-medium leading-relaxed">
                {isPt 
                  ? "Dite ou busque receitas, ingredientes e recursos (Ctrl+K)."
                  : "Speak or search recipes, ingredients, and features (Ctrl+K)."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mobile Search & Mic Trigger Buttons */}
      {showMobile && (
        <div className={`${variant === 'auto' ? 'flex md:hidden' : 'flex'} items-center gap-1`}>
          {/* Search Icon Trigger */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              playSfx('tap');
              vibrate(15);
              setIsOpen(true);
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-slate-600 hover:text-emerald-500 hover:bg-emerald-50 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center cursor-pointer border border-transparent focus:border-emerald-500/30"
            title={isPt ? "Busque receitas, ingredientes ou recursos" : "Search recipes, ingredients or features"}
            id="mobile-search-trigger-btn"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          </motion.button>
        </div>
      )}

      {/* Desktop Dropdown Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="hidden md:block absolute top-[calc(100%+8px)] left-0 w-[420px] max-h-[480px] overflow-y-auto no-scrollbar bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-[0_15px_40px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] z-50 p-4"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 px-1">
              <span>{isPt ? "Resultados de Busca" : "Search Results"}</span>
              <span className="text-[10px] font-normal text-slate-400 lowercase italic">
                {isPt ? "Esc para fechar" : "Esc to close"}
              </span>
            </div>

            {/* Active Voice Listening Card */}
            {isListening && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-3 p-3.5 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-amber-500/10 border border-emerald-500/30 rounded-2xl space-y-2"
              >
                <div className="flex items-center justify-between gap-2.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span>
                      {isPt ? "Ouvindo comando de voz..." : "Listening to voice command..."}
                    </span>
                  </div>
                  <VoiceWaveform barCount={6} />
                </div>

                {lastMatch && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                    <span>
                      {isPt 
                        ? `Comando de voz reconhecido: Abrindo ${lastMatch.targetName}... 🚀`
                        : `Voice command recognized: Opening ${lastMatch.targetName}... 🚀`}
                    </span>
                  </motion.div>
                )}

                {interimTranscript && !lastMatch && (
                  <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-emerald-500/20 text-xs text-slate-700 dark:text-slate-200 font-medium">
                    <span className="text-emerald-500 font-bold mr-1.5">🗣️</span>
                    "{interimTranscript}"
                    {detectedVoiceIntent && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {detectedVoiceIntent === 'recipe' ? (isPt ? 'Receita' : 'Recipe') :
                         detectedVoiceIntent === 'ingredient' ? (isPt ? 'Ingrediente' : 'Ingredient') :
                         detectedVoiceIntent === 'herb' ? (isPt ? 'Chá' : 'Tea') :
                         detectedVoiceIntent === 'feature' ? (isPt ? 'Recurso' : 'Feature') : (isPt ? 'Busca' : 'Search')}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  {isPt 
                    ? "Comandos rápidos: 'Malu, ver cardápio semanal', 'Malu, abrir lista de compras', 'Receita com aveia'"
                    : "Quick commands: 'Malu, show my meal plan', 'Malu, open shopping list', 'Recipe with oats'"}
                </p>
              </motion.div>
            )}

            {!queryText.trim() ? (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="font-semibold text-slate-500 dark:text-slate-300">
                  {isPt ? "O que você está procurando?" : "What are you looking for?"}
                </p>
                <p className="text-xs px-4 max-w-xs leading-relaxed">
                  {isPt 
                    ? "Fale no microfone ou busque por receitas, ingredientes da despensa, chás e recursos."
                    : "Speak into the microphone or search recipes, pantry ingredients, teas, and features."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 px-2">
                  {["Panqueca Fit", "Chá de Alecrim", "Frango com Quinoa", "Pratos Rápidos", "Despensa"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQueryText(tag)}
                      className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center gap-1">
                <X className="w-6 h-6 text-rose-500 mb-1" />
                <p className="font-semibold text-slate-500 dark:text-slate-300">
                  {isPt ? "Nenhum resultado localizado" : "No results found"}
                </p>
                <p className="text-xs px-4">
                  {isPt 
                    ? "Verifique a grafia ou dite outros ingredientes como 'banana', 'aveia' ou 'chá'."
                    : "Check spelling or try speaking ingredients like 'banana', 'oats', or 'tea'."}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((item, idx) => {
                  const isFeature = item.category === "feature";
                  const isHerb = item.category === "herb";
                  return (
                    <button
                      key={`${item.tab || item.name}-${idx}`}
                      onClick={() => handleResultClick(item)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-3 group cursor-pointer"
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isFeature 
                          ? 'bg-blue-500/10 text-blue-500' 
                          : isHerb 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {isFeature ? <Sparkles className="w-4 h-4" /> : isHerb ? <Leaf className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors truncate">
                            {item.name}
                          </h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            isFeature 
                              ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' 
                              : isHerb 
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                          }`}>
                            {isFeature ? (isPt ? 'Recurso' : 'Feature') : isHerb ? (isPt ? 'Chá' : 'Tea') : item.category === 'ingredient' ? (isPt ? 'Ingrediente' : 'Ingredient') : (isPt ? 'Receita' : 'Recipe')}
                          </span>
                        </div>
                        {item.scientific && (
                          <p className="text-[10px] font-mono italic text-slate-400 leading-none mt-0.5">
                            {item.scientific}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Fullscreen Search Overlay Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div 
              data-search-modal="true" 
              className="md:hidden fixed inset-0 z-[999999] flex flex-col bg-slate-950/95 backdrop-blur-xl"
            >
              {/* Top input bar */}
              <div className="p-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  {isListening ? (
                    <VoiceWaveform barCount={5} className="shrink-0" />
                  ) : (
                    <Search className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                </div>
                
                <input
                  ref={mobileInputRef}
                  type="text"
                  autoFocus
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening 
                      ? (isPt ? "Ouvindo... Diga receitas ou ingredientes!" : "Listening... Speak recipes or ingredients!") 
                      : (isPt ? "Buscar receitas, chás, recursos..." : "Search recipes, teas, features...")
                  }
                  className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 text-base placeholder-slate-400 font-medium"
                />
                
                {queryText && (
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      setQueryText('');
                      mobileInputRef.current?.focus();
                    }}
                    className="p-2 rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Voice Search Button Mobile */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleListening();
                  }}
                  className={`p-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
                    isListening
                      ? 'bg-gradient-to-r from-[#16C784] to-[#D8B14A] text-slate-950 shadow-[0_0_15px_rgba(216,177,74,0.5)] scale-105 ring-2 ring-emerald-400'
                      : 'text-[#16C784] bg-emerald-500/10 border border-[#16C784]/30'
                  }`}
                  title={isListening ? (isPt ? "Parar de ouvir" : "Stop listening") : (isPt ? "Ditar por voz" : "Voice search")}
                >
                  {isListening ? <MicOff className="w-4 h-4 text-slate-950 animate-pulse" /> : <Mic className="w-4 h-4" />}
                </motion.button>

                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    setIsOpen(false);
                    setQueryText('');
                    if (isListening) toggleListening();
                  }}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable results */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                {/* Active Mobile Voice Indicator */}
                {isListening && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl space-y-2.5 text-emerald-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span>{isPt ? "Microfone ativo • Diga o que deseja" : "Microphone active • Speak your query"}</span>
                      </div>
                      <VoiceWaveform barCount={6} />
                    </div>

                    {lastMatch && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 rounded-xl bg-emerald-500/25 border border-emerald-400/60 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                        <span>
                          {isPt 
                            ? `Comando reconhecido: Abrindo ${lastMatch.targetName}... 🚀`
                            : `Command recognized: Opening ${lastMatch.targetName}... 🚀`}
                        </span>
                      </motion.div>
                    )}

                    {interimTranscript && !lastMatch && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-sm text-white font-medium">
                        <span className="text-emerald-400 font-bold mr-2">🗣️</span>
                        "{interimTranscript}"
                        {detectedVoiceIntent && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {detectedVoiceIntent === 'recipe' ? (isPt ? 'Receita' : 'Recipe') :
                             detectedVoiceIntent === 'ingredient' ? (isPt ? 'Ingrediente' : 'Ingredient') :
                             detectedVoiceIntent === 'herb' ? (isPt ? 'Chá' : 'Tea') :
                             detectedVoiceIntent === 'feature' ? (isPt ? 'Recurso' : 'Feature') : (isPt ? 'Busca' : 'Search')}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-300">
                      {isPt 
                        ? "Exemplos: 'Malu, show my meal plan', 'Malu, ver cardápio', 'Quero receita de panqueca', 'Ver compras'"
                        : "Examples: 'Malu, show my meal plan', 'Malu, open shopping list', 'Find banana pancake recipe'"}
                    </p>
                  </motion.div>
                )}

                {!queryText.trim() ? (
                  <div className="py-12 text-center text-slate-300 flex flex-col items-center justify-center gap-3">
                    <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 animate-pulse">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <p className="font-bold text-lg text-white">
                      {isPt ? "Como podemos ajudar?" : "How can we help?"}
                    </p>
                    <p className="text-sm px-6 max-w-xs text-slate-400 leading-relaxed">
                      {isPt 
                        ? "Dite receitas por voz, busque chás medicinais (alecrim, camomila), pratos rápidos ou ingredientes!"
                        : "Speak recipe voice commands, search herbal teas (rosemary, chamomile), quick dishes, or ingredients!"}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2 px-4 max-w-md">
                      {["Pratos Rápidos", "Chá de Alecrim", "Panqueca Fit", "Suco Verde", "Geladeira", "Despensa"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setQueryText(tag);
                          }}
                          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-emerald-400 hover:bg-white/10 transition-all cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-12 text-center text-slate-300 flex flex-col items-center justify-center gap-2">
                    <X className="w-8 h-8 text-rose-400 mb-1" />
                    <p className="font-bold text-lg text-white">
                      {isPt ? "Nenhum resultado localizado" : "No results found"}
                    </p>
                    <p className="text-sm px-6 text-slate-400">
                      {isPt 
                        ? "Verifique os termos ou busque outra receita ou ingrediente."
                        : "Check spelling or search for another recipe or ingredient."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      {isPt ? `Resultados Encontrados (${results.length})` : `Results Found (${results.length})`}
                    </div>
                    {results.map((item, idx) => {
                      const isFeature = item.category === "feature";
                      const isHerb = item.category === "herb";
                      return (
                        <button
                          key={`${item.tab || item.name}-${idx}`}
                          onClick={() => handleResultClick(item)}
                          className="w-full text-left p-3.5 rounded-2xl bg-white/5 border border-white/10 active:bg-white/10 transition-all flex items-start gap-3 cursor-pointer"
                        >
                          <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                            isFeature 
                              ? 'bg-blue-500/20 text-blue-300' 
                              : isHerb 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {isFeature ? <Sparkles className="w-5 h-5" /> : isHerb ? <Leaf className="w-5 h-5" /> : <ChefHat className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-bold text-white truncate">
                                {item.name}
                              </h4>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                isFeature 
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                  : isHerb 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {isFeature ? (isPt ? 'Recurso' : 'Feature') : isHerb ? (isPt ? 'Chá' : 'Tea') : item.category === 'ingredient' ? (isPt ? 'Ingrediente' : 'Ingredient') : (isPt ? 'Receita' : 'Recipe')}
                              </span>
                            </div>
                            {item.scientific && (
                              <p className="text-[11px] font-mono italic text-slate-400 leading-none mt-0.5">
                                {item.scientific}
                              </p>
                            )}
                            <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-500 self-center shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
