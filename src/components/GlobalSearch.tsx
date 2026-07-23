import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, Leaf, ChefHat, BookOpen, X, ChevronRight, Apple, Globe, Mic, MicOff } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

interface GlobalSearchProps {
  activeTab: string;
  onNavigate: (tab: any) => void;
  isDarkMode: boolean;
}

// 1. App Features/Modules definition with keywords and description
const appFeatures = [
  {
    name: "Assistente de Saúde 360",
    description: "Visão geral de metas, inteligência artificial e assistente inteligente.",
    tab: "assistant360",
    icon: Globe,
    category: "feature",
    tags: ["inicio", "home", "chat", "assistente", "malu", "dashboard", "geral", "nutriai", "dia", "rotina"]
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
    icon: ChefHat,
    category: "feature",
    tags: ["plano", "agenda", "calendario", "dieta", "refeições", "cronograma", "comer", "rotina", "plano semanal"]
  },
  {
    name: "Lista de Compras Inteligente",
    description: "Lista gerada automaticamente a partir do seu plano alimentar.",
    tab: "shopping",
    icon: Apple,
    category: "feature",
    tags: ["compras", "lista", "mercado", "ingredientes", "sacola", "supermercado", "feira"]
  },
  {
    name: "Scanner de Pratos (Plate Analyzer)",
    description: "Analise o valor nutricional e calorias da sua refeição por foto.",
    tab: "analyzer",
    icon: Search,
    category: "feature",
    tags: ["scanner", "foto prato", "analisar prato", "camera", "calorias", "nutrientes", "analyzer", "prato"]
  },
  {
    name: "Analisador Corporal Inteligente",
    description: "Registre peso, gordura corporal, massa magra e bioimpedância.",
    tab: "body",
    icon: Sparkles,
    category: "feature",
    tags: ["corpo", "composicao", "gordura", "massa magra", "imc", "peso", "bioimpedancia", "medidas"]
  },
  {
    name: "Evolução Fotográfica do Corpo",
    description: "Compare suas fotos de progresso de maneira segura e privativa.",
    tab: "evolution",
    icon: Search,
    category: "feature",
    tags: ["fotos", "evolucao", "antes e depois", "corpo", "progresso visual", "galeria", "seguro", "privacidade"]
  },
  {
    name: "Visualizador de Jornada",
    description: "Gráficos intuitivos do seu peso, sono e consumo de água diário.",
    tab: "journey",
    icon: Sparkles,
    category: "feature",
    tags: ["jornada", "grafico", "evolucao", "peso", "agua", "progresso", "historico", "dados", "estatisticas"]
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
    icon: Leaf,
    category: "feature",
    tags: ["alergia", "gluten", "lactose", "alergenos", "intolerancia", "restricao", "segurança", "leite"]
  },
  {
    name: "Comparador de Alimentos",
    description: "Coloque dois rótulos frente a frente para escolher o melhor no mercado.",
    tab: "comparer",
    icon: Search,
    category: "feature",
    tags: ["comparar", "produtos", "melhor opcao", "supermercado", "nutrientes", "escolha", "rotulos"]
  },
  {
    name: "Diário Emocional e Humor",
    description: "Mapeie fome emocional, ansiedade e gatilhos de compulsão alimentar.",
    tab: "emotional",
    icon: Sparkles,
    category: "feature",
    tags: ["emocional", "diario", "ansiedade", "humor", "compulsao", "sentimentos", "fome emocional", "mente", "psicologia"]
  },
  {
    name: "Rastreador de Hábitos (Habit Tracker)",
    description: "Registre seu sono, copos de água, treinos e passos dados no dia.",
    tab: "habits",
    icon: Sparkles,
    category: "feature",
    tags: ["habitos", "sono", "agua", "exercicio", "passos", "rotina", "rastreamento", "dia", "metas"]
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
    icon: Sparkles,
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
    name: "Guia Alimentar de Restaurantes",
    description: "Escolha opções saudáveis em pizzarias, rodízios, shoppings e cafeterias.",
    tab: "dining",
    icon: ChefHat,
    category: "feature",
    tags: ["restaurante", "comer fora", "social", "viagem", "cardapio", "dicas de prato", "jantar fora", "almoçar"]
  },
  {
    name: "Ranking da Comunidade (Líderes)",
    description: "Dispute o pódio de hábitos saudáveis e ganhe medalhas de XP.",
    tab: "ranking",
    icon: Sparkles,
    category: "feature",
    tags: ["ranking", "lideres", "pontos", "xp", "comunidade", "amigos", "competicao", "campeonato"]
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
    icon: Sparkles,
    category: "feature",
    tags: ["treino", "exercicio", "personal", "academia", "casa", "musculacao", "cardio", "treinar", "atleta"]
  },
  {
    name: "Mercado Saudável & Sacolão",
    description: "Compre vegetais orgânicos locais com entrega expressa.",
    tab: "market",
    icon: Apple,
    category: "feature",
    tags: ["mercado", "feira", "orgânicos", "comprar", "frutas", "verduras", "hortifruti", "sacolao", "delivery", "comida fresquinha"]
  },
  {
    name: "Planos Premium e Preços",
    description: "Veja os benefícios do NutriAI Pro e inteligência artificial ilimitada.",
    tab: "pricing",
    icon: Sparkles,
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
    icon: Leaf,
    category: "feature",
    tags: ["wellness", "bem-estar", "meditacao", "respiracao", "relaxar", "som", "ansiedade", "foco", "calma", "solfejo"]
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
  // Ingredients info
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

// Helper component for real-time speech waveform feedback animation
const VoiceWaveform = ({ barCount = 5, className = "" }: { barCount?: number; className?: string }) => {
  return (
    <div className={`flex items-center gap-0.5 h-4 px-0.5 ${className}`}>
      {Array.from({ length: barCount }).map((_, idx) => (
        <motion.span
          key={idx}
          className="w-0.5 bg-gradient-to-t from-emerald-500 via-teal-400 to-emerald-300 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-200 rounded-full"
          animate={{
            height: ['20%', '100%', '40%', '85%', '25%'],
            opacity: [0.6, 1, 0.7, 1, 0.6],
          }}
          transition={{
            repeat: Infinity,
            repeatType: 'reverse',
            duration: 0.5 + (idx % 4) * 0.12,
            ease: "easeInOut",
            delay: idx * 0.07,
          }}
        />
      ))}
    </div>
  );
};

export function GlobalSearch({ activeTab, onNavigate, isDarkMode }: GlobalSearchProps) {
  const [queryText, setQueryText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key closes search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    ).slice(0, 4);

    // 2. Filter Herbs
    const matchedHerbs = medicinalHerbs.filter(h => 
      textMatch(h.name) ||
      textMatch(h.scientific) ||
      textMatch(h.description) ||
      tagMatch(h.tags)
    ).slice(0, 3);

    // 3. Filter Recipes/Ingredients
    const matchedRecipes = healthyRecipesAndIngredients.filter(r => 
      textMatch(r.name) ||
      textMatch(r.description) ||
      tagMatch(r.tags)
    ).slice(0, 3);

    setResults([
      ...matchedFeatures,
      ...matchedHerbs,
      ...matchedRecipes
    ]);
  }, [queryText]);

  console.log("GlobalSearch render state:", {isOpen, queryText, resultsLength: results.length});
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

  return (
    <div className="relative" ref={dropdownRef} id="global-search-container">
      {/* Desktop Search Input */}
      <div className="hidden md:flex items-center w-[280px] lg:w-[360px] relative group">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
          {isListening ? (
            <VoiceWaveform barCount={5} />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
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
              }}
              className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
              title="Limpar busca"
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
                ? 'bg-emerald-500 text-white animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-110'
                : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-800/80'
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
              Busque ou dite receitas, ingredientes e dicas de saúde por voz.
            </p>
          </div>
        )}
      </div>

      {/* Mobile Search Icon & Mic Trigger Buttons */}
      <div className="flex md:hidden items-center gap-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            playSfx('tap');
            vibrate(15);
            setIsOpen(true);
          }}
          className="p-2.5 rounded-full text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center"
          title="Busque receitas, ingredientes ou dicas de saúde no NutriAI."
          id="mobile-search-trigger-btn"
        >
          <Search className="w-5 h-5 text-emerald-500" />
        </motion.button>
      </div>

      {/* Dropdown Results (Desktop) & Overlay Dialog (Mobile) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Desktop Dropdown Box */}
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
                  <p className="text-xs px-4 max-w-xs">Tente digitar ou ditar "alecrim", "sucos detox", "receitas low carb" ou ingredientes da sua geladeira.</p>
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center gap-1">
                  <X className="w-6 h-6 text-rose-500 mb-1" />
                  <p className="font-semibold text-slate-500 dark:text-slate-300">Nenhum resultado localizado</p>
                  <p className="text-xs px-4">Verifique a grafia ou tente buscar outros termos como "hábitos" ou "hortifruti".</p>
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
                              {isFeature ? 'App' : isHerb ? 'Chá' : item.category === 'ingredient' ? 'Ingrediente' : 'Receita'}
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

            {/* Mobile Fullscreen Search Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md z-50 flex flex-col"
            >
              {/* Top input zone */}
              <div className="p-4 border-b border-slate-200/10 bg-white/10 dark:bg-slate-900/10 backdrop-blur-lg flex items-center gap-2">
                {isListening ? (
                  <VoiceWaveform barCount={5} className="shrink-0" />
                ) : (
                  <Search className="w-5 h-5 text-slate-300 shrink-0" />
                )}
                <input
                  type="text"
                  autoFocus
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Ouvindo... Fale agora!" : "Pesquise chás, receitas, recursos..."}
                  className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 text-base placeholder-slate-400"
                />
                
                {queryText && (
                  <button
                    onClick={() => {
                      playSfx('tap');
                      setQueryText('');
                    }}
                    className="p-1.5 rounded-full text-slate-300 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Voice Search Button Mobile */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleListening();
                  }}
                  className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${
                    isListening
                      ? 'bg-emerald-500 text-white animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                      : 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30'
                  }`}
                  title={isListening ? "Parar de ouvir" : "Ditar voz"}
                  type="button"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    playSfx('tap');
                    setIsOpen(false);
                    setQueryText('');
                  }}
                  className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable results */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
                {!queryText.trim() ? (
                  <div className="py-12 text-center text-slate-300 flex flex-col items-center justify-center gap-3">
                    <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 animate-pulse">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-lg text-white">Como podemos ajudar?</p>
                    <p className="text-sm px-6 max-w-xs text-slate-400 leading-relaxed">
                      Busque chás medicinais (alecrim, camomila), gerador de receitas, scanner de prato ou horta em casa!
                    </p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-12 text-center text-slate-300 flex flex-col items-center justify-center gap-2">
                    <X className="w-8 h-8 text-rose-400 mb-1" />
                    <p className="font-bold text-lg text-white">Nenhum resultado localizado</p>
                    <p className="text-sm px-6 text-slate-400">Verifique os termos ou busque outra funcionalidade.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Resultados Encontrados ({results.length})
                    </div>
                    {results.map((item, idx) => {
                      const isFeature = item.category === "feature";
                      const isHerb = item.category === "herb";
                      return (
                        <button
                          key={`${item.tab || item.name}-${idx}`}
                          onClick={() => handleResultClick(item)}
                          className="w-full text-left p-3.5 rounded-xl bg-white/5 border border-white/5 active:bg-white/10 transition-all flex items-start gap-3 cursor-pointer"
                        >
                          <div className={`p-2.5 rounded-lg shrink-0 ${
                            isFeature 
                              ? 'bg-blue-500/20 text-blue-300' 
                              : isHerb 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {isFeature ? <Sparkles className="w-4 h-4" /> : isHerb ? <Leaf className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-bold text-white truncate">
                                {item.name}
                              </h4>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                isFeature 
                                  ? 'bg-blue-500/20 text-blue-300' 
                                  : isHerb 
                                  ? 'bg-emerald-500/20 text-emerald-300' 
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {isFeature ? 'App' : isHerb ? 'Chá' : item.category === 'ingredient' ? 'Ingrediente' : 'Receita'}
                              </span>
                            </div>
                            {item.scientific && (
                              <p className="text-[10px] font-mono italic text-slate-400 leading-none mt-0.5">
                                {item.scientific}
                              </p>
                            )}
                            <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-normal">
                              {item.description}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 self-center shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
