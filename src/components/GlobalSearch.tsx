import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, Leaf, ChefHat, BookOpen, X, ChevronRight, Apple, Globe, Mic, MicOff, Heart, Flame, Zap, ShieldAlert, Scale, Brain, Camera, User, CalendarDays, ShoppingBasket, Image as ImageIcon, Trophy, Store, MapPin, Dumbbell, Activity, Crown } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

interface GlobalSearchProps {
  activeTab: string;
  onNavigate: (tab: any) => void;
  isDarkMode: boolean;
  variant?: 'auto' | 'desktop' | 'mobile';
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
    tags: ["receita", "gerador", "ia", "cozinhar", "comida", "almoço", "jantar", "criar receita", "chef", "cardapio"]
  },
  {
    name: "Plano Alimentar e Agenda",
    description: "Calendário semanal de alimentação recomendado pela nossa inteligência.",
    tab: "plan",
    icon: CalendarDays,
    category: "feature",
    tags: ["plano", "agenda", "calendario", "dieta", "refeições", "cronograma", "comer", "rotina", "plano semanal"]
  },
  {
    name: "Lista de Compras Inteligente",
    description: "Lista gerada automaticamente a partir do seu plano alimentar.",
    tab: "shopping",
    icon: ShoppingBasket,
    category: "feature",
    tags: ["compras", "lista", "mercado", "ingredientes", "sacola", "supermercado", "feira"]
  },
  {
    name: "Scanner de Pratos (Plate Analyzer)",
    description: "Analise o valor nutricional e calorias da sua refeição por foto.",
    tab: "analyzer",
    icon: Camera,
    category: "feature",
    tags: ["scanner", "foto prato", "analisar prato", "camera", "calorias", "nutrientes", "analyzer", "prato"]
  },
  {
    name: "Analisador Corporal Inteligente",
    description: "Registre peso, gordura corporal, massa magra e bioimpedância.",
    tab: "body",
    icon: User,
    category: "feature",
    tags: ["corpo", "composicao", "gordura", "massa magra", "imc", "peso", "bioimpedancia", "medidas"]
  },
  {
    name: "Evolução Fotográfica do Corpo",
    description: "Compare suas fotos de progresso de maneira segura e privativa.",
    tab: "evolution",
    icon: ImageIcon,
    category: "feature",
    tags: ["fotos", "evolucao", "antes e depois", "corpo", "progresso visual", "galeria", "seguro", "privacidade"]
  },
  {
    name: "Visualizador de Jornada e Simulador 3D",
    description: "Gráficos intuitivos do seu peso, sono e consumo de água diário.",
    tab: "journey",
    icon: Sparkles,
    category: "feature",
    tags: ["jornada", "grafico", "evolucao", "peso", "agua", "progresso", "historico", "dados", "estatisticas", "3d", "simulador"]
  },
  {
    name: "Detox & Gerador de Sucos",
    description: "Receitas de sucos funcionais, shots matinais e chás detox.",
    tab: "juice",
    icon: Leaf,
    category: "feature",
    tags: ["detox", "suco", "shot", "imunidade", "bebida", "saudavel", "limpeza", "liquidificador", "verde", "energia"]
  },
  {
    name: "Scanner de Código de Barras",
    description: "Veja o grau de processamento e aditivos de qualquer produto do mercado.",
    tab: "barcode",
    icon: Search,
    category: "feature",
    tags: ["codigo de barras", "scanner", "produto", "supermercado", "rotulo", "ingredientes", "quimicos", "comprar"]
  },
  {
    name: "Detector de Alérgenos Alimentares",
    description: "Verifique glúten, lactose, soja e outros riscos alimentares em segundos.",
    tab: "allergy",
    icon: ShieldAlert,
    category: "feature",
    tags: ["alergia", "gluten", "lactose", "alergenos", "intolerancia", "restricao", "segurança", "leite"]
  },
  {
    name: "Comparador de Alimentos e Rótulos",
    description: "Coloque dois rótulos frente a frente para escolher o melhor no mercado.",
    tab: "comparer",
    icon: Scale,
    category: "feature",
    tags: ["comparar", "produtos", "melhor opcao", "supermercado", "nutrientes", "escolha", "rotulos"]
  },
  {
    name: "Diário Emocional e Humor",
    description: "Mapeie fome emocional, ansiedade e gatilhos de compulsão alimentar.",
    tab: "emotional",
    icon: Brain,
    category: "feature",
    tags: ["emocional", "diario", "ansiedade", "humor", "compulsao", "sentimentos", "fome emocional", "mente", "psicologia"]
  },
  {
    name: "Rastreador de Hábitos (Habit Tracker)",
    description: "Registre seu sono, copos de água, treinos e passos dados no dia.",
    tab: "habits",
    icon: Activity,
    category: "feature",
    tags: ["habitos", "sono", "agua", "exercicio", "passos", "rotina", "rastreamento", "dia", "metas", "hidratacao"]
  },
  {
    name: "Controle de Glicemia",
    description: "Registre medições de glicose no sangue, jejum e pós-prandial.",
    tab: "glucose",
    icon: Activity,
    category: "feature",
    tags: ["glicemia", "glicose", "diabetes", "acucar", "insulina", "sangue", "hgt", "saude"]
  },
  {
    name: "Caderno de Anotações",
    description: "Escreva receitas, dicas, sintomas e notas de bem-estar.",
    tab: "notes",
    icon: BookOpen,
    category: "feature",
    tags: ["caderno", "anotacoes", "diario", "bloco de notas", "escrever", "ideias", "lembretes", "rascunho"]
  },
  {
    name: "Pressão Arterial e Frequência",
    description: "Controle batimentos cardíacos e métricas cardiovasculares.",
    tab: "bloodpressure",
    icon: Heart,
    category: "feature",
    tags: ["pressao", "arterial", "coracao", "cardio", "saude", "batimentos", "sistolica", "diastolica", "medico"]
  },
  {
    name: "Trocas Inteligentes (Smart Swaps)",
    description: "Encontre alternativas saudáveis para doces, refrigerantes e ultraprocessados.",
    tab: "swaps",
    icon: Apple,
    category: "feature",
    tags: ["trocas", "substituicoes", "ingredientes saudaveis", "ultraprocessado", "troca inteligente", "doce", "refrigerante"]
  },
  {
    name: "Guia Alimentar de Restaurantes (Comi Fora)",
    description: "Escolha opções saudáveis em pizzarias, rodízios, shoppings e cafeterias.",
    tab: "dining",
    icon: ChefHat,
    category: "feature",
    tags: ["restaurante", "comer fora", "social", "viagem", "cardapio", "dicas de prato", "jantar fora", "almoçar", "comi fora"]
  },
  {
    name: "Smart Plate & Guia de Restaurante",
    description: "Calcule escolhas ideais de self-service e pratos feitos.",
    tab: "smartplate",
    icon: ChefHat,
    category: "feature",
    tags: ["smart plate", "self service", "porcoes", "prato feito", "restaurante", "buffet"]
  },
  {
    name: "Desafio 21 Dias de Hábitos",
    description: "Participe de desafios diários com metas de água, treino e nutrição.",
    tab: "challenge",
    icon: Trophy,
    category: "feature",
    tags: ["desafio", "21 dias", "meta", "conquista", "desafio saudavel", "foco", "disciplina"]
  },
  {
    name: "Conquistas e Gamificação",
    description: "Dispute o pódio de hábitos saudáveis e ganhe medalhas de XP.",
    tab: "gamification",
    icon: Trophy,
    category: "feature",
    tags: ["ranking", "lideres", "pontos", "xp", "comunidade", "amigos", "competicao", "campeonato", "medalhas", "conquistas"]
  },
  {
    name: "Predição de Resultados com IA",
    description: "Simule em quantos dias alcançará suas metas alimentares.",
    tab: "prediction",
    icon: Sparkles,
    category: "feature",
    tags: ["predicao", "simulador", "peso ideal", "estimativa", "futuro", "meta", "ia", "tempo"]
  },
  {
    name: "Personal Trainer IA",
    description: "Rotinas personalizadas de musculação, alongamento e cardio para fazer em casa.",
    tab: "trainer",
    icon: Dumbbell,
    category: "feature",
    tags: ["treino", "exercicio", "personal", "academia", "casa", "musculacao", "cardio", "treinar", "atleta"]
  },
  {
    name: "Mercado Saudável & Sacolão",
    description: "Compre vegetais orgânicos locais com entrega expressa.",
    tab: "market",
    icon: Store,
    category: "feature",
    tags: ["mercado", "feira", "orgânicos", "comprar", "frutas", "verduras", "hortifruti", "sacolao", "delivery", "comida fresquinha"]
  },
  {
    name: "Mapa Frescor Orgânico",
    description: "Localize feiras orgânicas e produtores locais perto de você.",
    tab: "frescor",
    icon: MapPin,
    category: "feature",
    tags: ["mapa", "frescor", "feiras", "organico", "produtor", "onde comprar", "frutas", "bairro"]
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
    tags: ["alecrim", "digestao", "circulacao", "foco", "energia", "tonico", "dor de cabeca", "memoria"]
  },
  {
    id: "herb-capim-limao",
    name: "Chá de Capim-Limão",
    scientific: "Cymbopogon citratus",
    description: "Calmante suave, ansiolítico leve e relaxante para cólicas abdominais.",
    category: "herb",
    tags: ["capim limao", "capim cidreira", "capim santo", "calmante", "ansiedade", "dormir", "colica", "digestivo"]
  },
  {
    id: "herb-camomila",
    name: "Chá de Camomila",
    scientific: "Matricaria chamomilla",
    description: "Forte ação ansiolítica, calmante para insônia e relaxante muscular.",
    category: "herb",
    tags: ["camomila", "dormir", "calmante", "sono", "ansiedade", "estresse", "colica", "bebe", "chazinho"]
  },
  {
    id: "herb-gengibre",
    name: "Chá de Gengibre",
    scientific: "Zingiber officinale",
    description: "Poderoso termogênico, digestivo, combate náuseas e atua como anti-inflamatório.",
    category: "herb",
    tags: ["gengibre", "emagrecer", "termogenico", "inflamacao", "gripe", "tosse", "garganta", "enjoo", "digestao"]
  },
  {
    id: "herb-hortela",
    name: "Chá de Hortelã",
    scientific: "Mentha piperita",
    description: "Alivia gases intestinais, melhora a digestão pesada e acalma dores de cabeça irritantes.",
    category: "herb",
    tags: ["hortela", "gases", "digestao", "estomago", "refrescante", "halito", "respiracao", "sinusite"]
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
    tags: ["crepioca", "aveia", "ovo", "fit", "cafe da manha", "proteina", "rapido", "saudavel"]
  },
  {
    name: "Shake Funcional de Banana & Whey",
    description: "Excelente pós-treino com banana, whey protein, leite de amêndoas e canela.",
    ingredients: "banana, whey protein, leite de amêndoas, canela",
    preferences: "Pós-treino, Hipertrofia",
    category: "recipe",
    tags: ["shake", "vitamina", "whey", "banana", "leite vegetal", "pos-treino", "academia", "maromba"]
  },
  {
    name: "Salada Colorida de Quinoa & Frango",
    description: "Refeição equilibrada com peito de frango grelhado, quinoa cozida, pepino e hortelã.",
    ingredients: "peito de frango, quinoa, pepino, tomate cereja, hortelã",
    preferences: "Almoço Leve, Low Carb",
    category: "recipe",
    tags: ["salada", "quinoa", "frango", "almoço", "jantar", "leve", "low carb", "proteico"]
  },
  {
    name: "Sopa Termogênica de Abóbora & Gengibre",
    description: "Cremosa sopa desintoxicante de abóbora cabotiá temperada com raspas de gengibre.",
    ingredients: "abóbora cabotiá, gengibre, alho poró, azeite",
    preferences: "Jantar Detox, Termogênico",
    category: "recipe",
    tags: ["sopa", "caldo", "abobora", "gengibre", "jantar", "detox", "frio", "termogenico"]
  },
  {
    name: "Suco Verde Super Detox",
    description: "Suco prensado de couve, maçã fuji, limão siciliano e gengibre termogênico.",
    ingredients: "couve, limão, maçã, gengibre, hortelã",
    preferences: "Detox, Matinal",
    category: "recipe",
    tags: ["suco verde", "detox", "couve", "gengibre", "suco", "imunidade", "frescor", "emagrecer"]
  },
  {
    name: "Aveia em Flocos",
    description: "Super grão rico em beta-glucanas que regulam o intestino, controlam colesterol e dão saciedade.",
    ingredients: "aveia",
    preferences: "Ingrediente Rico em Fibras",
    category: "ingredient",
    tags: ["aveia", "fibra", "intestino", "colesterol", "saciedade", "carboidrato complexo", "mingau"]
  },
  {
    name: "Sementes de Chia",
    description: "Semente rica em ômega-3, magnésio e fibras solúveis, excelente para criar géis saudáveis.",
    ingredients: "chia",
    preferences: "Ingrediente Rico em Ômega-3",
    category: "ingredient",
    tags: ["chia", "semente", "omega 3", "anti-inflamatorio", "pudim", "saciedade", "fibras"]
  },
  {
    name: "Abacate Orgânico",
    description: "Excelente fonte de gorduras monoinsaturadas boas, beta-sitosterol e potássio.",
    ingredients: "abacate",
    preferences: "Gorduras Saudáveis",
    category: "ingredient",
    tags: ["abacate", "gordura boa", "coracao", "vitamina e", "salada", "creme", "guacamole"]
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
  const [queryText, setQueryText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Speech Recognition handler
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
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert('Seu navegador não possui suporte ao microfone. Tente utilizar o Google Chrome, Microsoft Edge ou Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'pt-BR';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setIsOpen(true);
        playSfx('tap');
        vibrate(25);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setQueryText(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        vibrate([40, 40, 40]);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      setIsListening(false);
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
    const tagMatch = (tags: string[]) => tags.some(tag => tag.includes(q) || tag.includes(qStem));

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
    ).slice(0, 4);

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
            title="Clique para pesquisar ou pressione Ctrl+K"
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
            placeholder={isListening ? "Ouvindo... Fale agora!" : "Busque receitas, chás, recursos..."}
            className={`w-full pl-10 pr-16 py-2 rounded-full border bg-white/75 dark:bg-slate-900/60 backdrop-blur-md text-sm font-medium placeholder-slate-400 focus:outline-none transition-all duration-300 shadow-inner ${
              isListening
                ? 'border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-slate-200 dark:border-slate-800/80 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20'
            }`}
          />
          
          {/* Right side buttons: Clear & Mic & Waveform */}
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
                title="Limpar busca"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleListening();
              }}
              className={`p-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                isListening
                  ? 'bg-gradient-to-r from-[#16C784] to-[#D8B14A] text-slate-950 shadow-[0_0_12px_rgba(216,177,74,0.4)] scale-110'
                  : 'text-slate-400 hover:text-[#16C784] hover:bg-emerald-50 dark:hover:bg-slate-800/80'
              }`}
              title={isListening ? "Parar de ouvir" : "Ditar busca por voz (Receitas/Ingredientes)"}
              type="button"
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>
          
          {/* Tooltip Descritivo */}
          {!isOpen && !queryText && !isListening && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 p-2.5 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 delay-300 pointer-events-none z-50">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 dark:bg-slate-700 rotate-45 rounded-sm"></div>
              <p className="relative z-10 text-center font-medium leading-relaxed">
                Busque ou dite receitas, ingredientes e recursos (Ctrl+K).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mobile Search Icon & Trigger Button */}
      {showMobile && (
        <div className={`${variant === 'auto' ? 'flex md:hidden' : 'flex'} items-center`}>
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
            title="Busque receitas, ingredientes ou dicas de saúde no NutriAI."
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
              <span>Resultados de Busca</span>
              <span className="text-[10px] font-normal text-slate-400 lowercase italic">Esc para fechar</span>
            </div>

            {/* Indicator if active listening */}
            {isListening && (
              <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-pulse">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-500 shrink-0 animate-bounce" />
                  <span>Ouvindo... Dite seus ingredientes ou receita agora!</span>
                </div>
                <VoiceWaveform barCount={6} />
              </div>
            )}

            {!queryText.trim() ? (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="font-semibold text-slate-500 dark:text-slate-300">O que você está procurando?</p>
                <p className="text-xs px-4 max-w-xs">Tente buscar por "receitas rápidas", "glicemia", "chás", "detox", "treino" ou ingredientes da sua despensa.</p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center gap-1">
                <X className="w-6 h-6 text-rose-500 mb-1" />
                <p className="font-semibold text-slate-500 dark:text-slate-300">Nenhum resultado localizado</p>
                <p className="text-xs px-4">Verifique a grafia ou tente buscar outros termos como "hábitos", "alecrim" ou "shake".</p>
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
                          ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-500' 
                          : isHerb 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' 
                          : 'bg-amber-50 dark:bg-amber-950/20 text-amber-500'
                      }`}>
                        {isFeature ? <Sparkles className="w-4 h-4" /> : isHerb ? <Leaf className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate transition-colors">
                            {item.name}
                          </h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 uppercase tracking-wider ${
                            isFeature 
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                              : isHerb 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {isFeature ? 'Recurso' : isHerb ? 'Chá' : item.category === 'ingredient' ? 'Ingrediente' : 'Receita'}
                          </span>
                        </div>
                        {item.scientific && (
                          <p className="text-[10px] font-mono italic text-slate-400 dark:text-slate-500 leading-none mb-1">
                            {item.scientific}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-400 line-clamp-1 mt-0.5">
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
                  placeholder={isListening ? "Ouvindo... Dite agora!" : "Buscar receitas, chás, recursos..."}
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleListening();
                  }}
                  className={`p-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
                    isListening
                      ? 'bg-gradient-to-r from-[#16C784] to-[#D8B14A] text-slate-950 shadow-[0_0_15px_rgba(216,177,74,0.5)] scale-105'
                      : 'text-[#16C784] bg-emerald-500/10 border border-[#16C784]/30'
                  }`}
                  title={isListening ? "Parar de ouvir" : "Ditar voz"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    setIsOpen(false);
                    setQueryText('');
                  }}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable results */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                {!queryText.trim() ? (
                  <div className="py-12 text-center text-slate-300 flex flex-col items-center justify-center gap-3">
                    <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 animate-pulse">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <p className="font-bold text-lg text-white">Como podemos ajudar?</p>
                    <p className="text-sm px-6 max-w-xs text-slate-400 leading-relaxed">
                      Busque chás medicinais (alecrim, camomila), pratos rápidos, scanner de prato, glicemia ou receitas!
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2 px-4 max-w-md">
                      {["Pratos Rápidos", "Chá de Alecrim", "Glicemia", "Detox", "Suco Verde", "Geladeira"].map((tag) => (
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
                    <p className="font-bold text-lg text-white">Nenhum resultado localizado</p>
                    <p className="text-sm px-6 text-slate-400">Verifique os termos ou busque outra funcionalidade.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      Resultados Encontrados ({results.length})
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
                                {isFeature ? 'Recurso' : isHerb ? 'Chá' : item.category === 'ingredient' ? 'Ingrediente' : 'Receita'}
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
