import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Utensils, ChefHat, ArrowRight, ArrowLeft,
  Check, X, Zap, Lightbulb, HeartPulse,
  Refrigerator, Activity, BookOpen, Volume2, ShieldCheck,
  Scan, Camera, Droplets, Dumbbell, ShoppingCart, HelpCircle,
  Clock, Flame, Apple, Brain, Smile, Package, ExternalLink,
  RotateCcw, TrendingDown, CheckCircle, MapPin, Scale
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { startIntroJsTour } from '../lib/introTour';

interface WelcomeTourProps {
  onFinish?: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface FeatureHighlight {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  tagColor?: string;
}

interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  targetSelector?: string;
  secondaryTargetSelector?: string;
  targetButtonName?: string;
  preferredArrowDirection?: 'up' | 'down' | 'left' | 'right' | 'auto';
  icon: React.ReactNode;
  badge: string;
  primaryActionLabel: string;
  suggestedTab?: string;
  highlights?: FeatureHighlight[];
  proTip?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao NutriAI!',
    subtitle: 'Seu ecossistema completo de nutrição, economia e culinária inteligente.',
    description: 'O NutriAI foi desenvolvido para simplificar sua alimentação diária com inteligência artificial de ponta, acompanhamento de saúde em tempo real, lista de compras inteligente e monitor de preços.',
    icon: <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />,
    badge: 'Visão Geral & Início Rápido',
    primaryActionLabel: 'Ver Lista de Compras',
    highlights: [
      {
        icon: <ShoppingCart className="w-4 h-4 text-emerald-500" />,
        title: 'Lista de Compras Inteligente',
        description: 'Organize itens por categorias, estime gastos e sincronize com ingredientes da despensa e receitas.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <TrendingDown className="w-4 h-4 text-teal-500" />,
        title: 'Monitor de Preços & Mercados',
        description: 'Compare valores entre redes locais, acompanhe ofertas de hortifrúti e receba trocas econômicas.',
        tagColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
      },
      {
        icon: <ChefHat className="w-4 h-4 text-amber-500" />,
        title: 'Chef IA & Gerador Mágico',
        description: 'Crie refeições saudáveis com o que você já tem em casa com cálculo preciso de calorias e macros.',
        tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      },
      {
        icon: <Package className="w-4 h-4 text-emerald-500" />,
        title: 'Scanner de Despensa & Validades',
        description: 'Cadastre alimentos por código de barras, controle validades e evite o desperdício com receitas inteligentes.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      }
    ],
    proTip: 'Dica: Neste tour, você pode navegar pelos tooltips interativos ou usar as setas luminosas direcionais.'
  },
  {
    id: 'shopping-list',
    title: 'Lista de Compras Inteligente',
    subtitle: 'Praticidade, estimativa de custos e zero itens esquecidos no mercado.',
    description: 'Observe a seta apontando para a aba Lista de Compras na barra de navegação. Aqui você organiza itens por corredores (hortifrúti, laticínios, carnes), sincroniza ingredientes de receitas e calcula o valor previsto do carrinho.',
    targetSelector: '#nav-item-shopping',
    secondaryTargetSelector: '#nav-item-shopping',
    targetButtonName: 'Aba Lista de Compras',
    preferredArrowDirection: 'up',
    suggestedTab: 'shopping',
    icon: <ShoppingCart className="w-6 h-6 text-emerald-500 animate-pulse" />,
    badge: 'Lista de Compras',
    primaryActionLabel: 'Ver Monitor de Preços',
    highlights: [
      {
        icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
        title: 'Sincronização com Receitas',
        description: 'Adicione todos os ingredientes que faltam para preparar uma receita com um único toque.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <TrendingDown className="w-4 h-4 text-teal-500" />,
        title: 'Previsão de Gastos',
        description: 'Acompanhe a estimativa do valor total da compra em tempo real conforme adiciona produtos.',
        tagColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
      },
      {
        icon: <CheckCircle className="w-4 h-4 text-sky-500" />,
        title: 'Modo Supermercado',
        description: 'Checklist interativo com toque rápido para marcar o que já colocou no carrinho físico.',
        tagColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      }
    ],
    proTip: 'Dica: Ao marcar um item como comprado, você pode transferi-lo diretamente para sua Despensa.'
  },
  {
    id: 'price-monitor',
    title: 'Monitor de Preços & Sacolões',
    subtitle: 'Economia garantida com comparador e ofertas locais.',
    description: 'Observe a seta apontando para a aba de Mercados e Preços. Acompanhe a cotação de itens da cesta básica, veja ofertas de feiras e sacolões próximos e encontre substituições mais baratas para economizar.',
    targetSelector: '#nav-item-market',
    secondaryTargetSelector: '#nav-item-comparer',
    targetButtonName: 'Aba Monitor de Preços / Mercados',
    preferredArrowDirection: 'up',
    suggestedTab: 'market',
    icon: <TrendingDown className="w-6 h-6 text-teal-500 animate-pulse" />,
    badge: 'Monitor de Preços',
    primaryActionLabel: 'Ver Gerador de Receitas',
    highlights: [
      {
        icon: <TrendingDown className="w-4 h-4 text-teal-500" />,
        title: 'Economizômetro',
        description: 'Descubra quanto você economiza ao substituir marcas ou escolher redes mais em conta.',
        tagColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
      },
      {
        icon: <MapPin className="w-4 h-4 text-emerald-500" />,
        title: 'Ofertas da Sua Região',
        description: 'Mapeamento de feiras livres, quitandas e supermercados com os melhores preços.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <Scale className="w-4 h-4 text-amber-500" />,
        title: 'Custo por Nutriente',
        description: 'Compare fontes proteicas e vegetais pelo melhor custo-benefício por porção.',
        tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      }
    ],
    proTip: 'Consulte o monitor antes de montar a lista de compras para aproveitar as promoções do dia.'
  },
  {
    id: 'chef-recipes',
    title: 'Gerador de Refeições & Chef Mágico IA',
    subtitle: 'Receitas criadas em segundos com o que você tem na cozinha.',
    description: 'Observe a seta apontando para o botão flutuante com o chapéu de chef no canto inferior direito e para a aba de Receitas no menu. Basta tocar para ditar ou digitar seus ingredientes e receber refeições balanceadas instantaneamente.',
    targetSelector: '#chef-magic-fab-btn',
    secondaryTargetSelector: '#nav-item-generator',
    targetButtonName: 'Botão Chef Mágico (Flutuante)',
    preferredArrowDirection: 'right',
    suggestedTab: 'generator',
    icon: <ChefHat className="w-6 h-6 text-amber-500 animate-pulse" />,
    badge: 'Gerador de Refeições',
    primaryActionLabel: 'Ver Rastreador de Hábitos',
    highlights: [
      {
        icon: <Apple className="w-4 h-4 text-emerald-500" />,
        title: 'Filtros por Objetivo',
        description: 'Emagrecimento, Hipertrofia, Diabéticos, Low Carb, Vegetariano, Sem Glúten e Detox.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <Clock className="w-4 h-4 text-sky-500" />,
        title: 'Timers de Cozimento Integrados',
        description: 'Cada etapa possui cronômetros automáticos para você nunca queimar um prato.',
        tagColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      },
      {
        icon: <Volume2 className="w-4 h-4 text-amber-500" />,
        title: 'Comandos de Voz Mãos-Livres',
        description: 'Peça para a Malu avançar passos enquanto você cozinha sem precisar tocar na tela.',
        tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      },
      {
        icon: <Flame className="w-4 h-4 text-rose-500" />,
        title: 'Tabela Nutricional Completa',
        description: 'Calorias, proteínas, carboidratos, gorduras, fibras e micronutrientes calculados na hora.',
        tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      }
    ],
    proTip: 'Você pode tocar no botão flutuante a qualquer momento, em qualquer tela, para gerar uma receita de emergência.'
  },
  {
    id: 'habits-tracker',
    title: 'Rastreador de Hábitos & Metas Diárias',
    subtitle: 'Hidratação, sono, passos, queima calórica e streaks de constância.',
    description: 'Observe a seta apontando para a aba de Hábitos na barra de navegação. Aqui você registra seu consumo de água copo a copo, acompanha seu jejum intermitente e monitora sua evolução diária com gráficos interativos.',
    targetSelector: '#nav-item-habits',
    secondaryTargetSelector: '#nav-item-habits',
    targetButtonName: 'Aba Rastreador de Hábitos',
    preferredArrowDirection: 'up',
    suggestedTab: 'habits',
    icon: <Activity className="w-6 h-6 text-rose-500 animate-pulse" />,
    badge: 'Rastreador de Hábitos',
    primaryActionLabel: 'Ver Scanner de Despensa',
    highlights: [
      {
        icon: <Droplets className="w-4 h-4 text-sky-500" />,
        title: 'Meta de Água & Lembretes',
        description: 'Controle em tempo real de hidratação com progresso e notificações push.',
        tagColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      },
      {
        icon: <Flame className="w-4 h-4 text-orange-500" />,
        title: 'Streaks & Dias Consecutivos',
        description: 'Mantenha sua disciplina e acumule pontos no ranking da comunidade.',
        tagColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
      },
      {
        icon: <HeartPulse className="w-4 h-4 text-rose-500" />,
        title: 'Sono & Atividade Física',
        description: 'Registre horas dormidas e gasto calórico para balancear sua alimentação.',
        tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      }
    ],
    proTip: 'Ative alertas push nos horários do seu perfil para ser lembrado automaticamente de beber água.'
  },
  {
    id: 'pantry-scanner',
    title: 'Scanner de Despensa & Validades',
    subtitle: 'Controle de estoque inteligente e zero desperdício de comida.',
    description: 'Observe a seta apontando para o botão da Despensa na barra de navegação. Aqui você lê códigos de barras de produtos com a câmera, registra datas de vencimento com alertas visuais e ganha sugestões de receitas para aproveitar itens que estão sobrando.',
    targetSelector: '#nav-item-pantry',
    secondaryTargetSelector: '#subtab-pantry-scanner-btn',
    targetButtonName: 'Botão Scanner de Despensa',
    preferredArrowDirection: 'up',
    suggestedTab: 'pantry',
    icon: <Package className="w-6 h-6 text-emerald-500 animate-pulse" />,
    badge: 'Scanner de Despensa',
    primaryActionLabel: 'Ver Geladeira Inteligente',
    highlights: [
      {
        icon: <Scan className="w-4 h-4 text-indigo-500" />,
        title: 'Leitor de Código de Barras',
        description: 'Aponte a câmera para a embalagem e a IA reconhece o produto, peso e nutrientes.',
        tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      },
      {
        icon: <Sparkles className="w-4 h-4 text-amber-500" />,
        title: 'Receitas Anti-Desperdício',
        description: 'Descubra pratos criativos usando prioritariamente os ingredientes mais próximos do vencimento.',
        tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      },
      {
        icon: <ShoppingCart className="w-4 h-4 text-emerald-500" />,
        title: 'Lista de Compras Automática',
        description: 'Envie itens em falta diretamente da despensa para a sua lista com apenas 1 clique.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <ChefHat className="w-4 h-4 text-teal-500" />,
        title: 'Chef Malu de Plantão',
        description: 'Tire dúvidas culinárias sobre ponto de cozimento, substituições de temperos e conservação.',
        tagColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
      }
    ],
    proTip: 'Toque em "Minha Despensa" para filtrar seus itens por categoria (grãos, laticínios, conservas, temperos).'
  },
  {
    id: 'fridge-camera',
    title: 'Geladeira Inteligente com Câmera IA',
    subtitle: 'Fotografe o interior da geladeira ou seu prato pronto.',
    description: 'Observe a seta apontando para a aba "Geladeira". A inteligência visual analisa fotos para inventariar o que você guardou, identifica sobras e calcula a densidade calórica e equilíbrio do seu prato em segundos.',
    targetSelector: '#nav-item-fridge',
    secondaryTargetSelector: '#nav-item-analyzer',
    targetButtonName: 'Botão Minha Geladeira',
    preferredArrowDirection: 'up',
    suggestedTab: 'fridge',
    icon: <Refrigerator className="w-6 h-6 text-sky-500 animate-pulse" />,
    badge: 'Geladeira & Visão IA',
    primaryActionLabel: 'Ver Assistente por Voz',
    highlights: [
      {
        icon: <Camera className="w-4 h-4 text-teal-500" />,
        title: 'Reconhecimento Visual Instantâneo',
        description: 'Basta uma foto rápida para a IA carregar os alimentos detectados sem precisar digitar nada.',
        tagColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
      },
      {
        icon: <Utensils className="w-4 h-4 text-emerald-500" />,
        title: 'Análise de Prato Pronto',
        description: 'Tire foto do seu almoço ou jantar e descubra a distribuição de carboidratos, proteínas e gorduras.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <Droplets className="w-4 h-4 text-blue-500" />,
        title: 'Controle de Frescor',
        description: 'Monitore quais vegetais e carnes precisam ser consumidos primeiro para preservar os nutrientes.',
        tagColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      }
    ],
    proTip: 'Dentro da aba Geladeira você encontra os botões "Escanear Alimentos" e "Receitas Sugeridas".'
  },
  {
    id: 'voice-assistant',
    title: 'Assistente Chef Malu & Controle de Áudio',
    subtitle: 'Voz natural Aoede em português e controle de volume independente.',
    description: 'Observe a seta apontando para o botão de Feedback e Som no cabeçalho superior. A assistente Malu fala naturalmente, lê receitas passo a passo e permite regular o volume da síntese de voz de forma separada do som geral do seu aparelho.',
    targetSelector: '#header-feedback-trigger-btn',
    secondaryTargetSelector: '#header-feedback-trigger-btn',
    targetButtonName: 'Voz da Malu & Feedback',
    preferredArrowDirection: 'up',
    suggestedTab: 'assistant360',
    icon: <Volume2 className="w-6 h-6 text-teal-500 animate-pulse" />,
    badge: 'Voz Real Aoede',
    primaryActionLabel: 'Ver Modo de Leitura',
    highlights: [
      {
        icon: <Volume2 className="w-4 h-4 text-emerald-500" />,
        title: 'Voz Brasileira Humanizada',
        description: 'Pronúncia clara, expressiva e acolhedora em todas as dicas e instruções de preparo.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <Zap className="w-4 h-4 text-indigo-500" />,
        title: 'Slider de Volume Independente',
        description: 'Ajuste a voz da IA de 0% (mudo) a 100% sem afetar vídeos ou músicas em segundo plano.',
        tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      },
      {
        icon: <Brain className="w-4 h-4 text-amber-500" />,
        title: 'Assistente 360°',
        description: 'Tire dúvidas nutricionais, peça planos de refeição rápidos ou solicite motivação para treinar.',
        tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      }
    ],
    proTip: 'No modal de feedback você pode clicar em "Testar" para ouvir uma frase de calibração sonora.'
  },
  {
    id: 'accessibility',
    title: 'Modo de Leitura & Acessibilidade',
    subtitle: 'Conforto visual, letras grandes e alto contraste.',
    description: 'Observe a seta apontando para o botão de livro no cabeçalho. Ative o Modo de Leitura para ampliar fontes (até 30px), aplicar fundo contrastante e usar checklists ampliados para seguir qualquer receita com tranquilidade.',
    targetSelector: '#header-reading-mode-toggle-btn',
    targetButtonName: 'Modo de Leitura (Livro)',
    preferredArrowDirection: 'up',
    icon: <BookOpen className="w-6 h-6 text-emerald-500 animate-pulse" />,
    badge: 'Inclusão & Acessibilidade',
    primaryActionLabel: 'Ver Perfil & Concluir',
    highlights: [
      {
        icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
        title: 'Letras Grandes & Nítidas',
        description: 'Ajuste a escala tipográfica para ler com facilidade mesmo de longe na bancada da cozinha.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <Check className="w-4 h-4 text-sky-500" />,
        title: 'Checklist com Toque Fácil',
        description: 'Marque ingredientes e passos concluídos em grandes botões táteis.',
        tagColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      },
      {
        icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
        title: 'Contrastes Preto & Branco ou Amarelo',
        description: 'Ideal para ambientes muito claros ou usuários com sensibilidade à luz.',
        tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      }
    ],
    proTip: 'O modo de leitura pode ser ativado e desativado com 1 toque no ícone de livro a qualquer hora.'
  },
  {
    id: 'user-profile',
    title: 'Perfil, Metas & Personalização',
    subtitle: 'Ajuste peso, objetivos, restrições e reveja este guia quando quiser.',
    description: 'Observe a seta apontando para o avatar de perfil no topo. No seu perfil você configura se o seu foco é perda de peso, hipertrofia, controle de glicemia, além de poder reiniciar este tour interativo a qualquer momento.',
    targetSelector: '#header-user-avatar-btn',
    secondaryTargetSelector: '#nav-item-profile',
    targetButtonName: 'Foto & Dados de Perfil',
    preferredArrowDirection: 'up',
    suggestedTab: 'profile',
    icon: <Smile className="w-6 h-6 text-amber-500 animate-bounce" />,
    badge: 'Seu Perfil & Metas',
    primaryActionLabel: 'Concluir Tour & Começar!',
    highlights: [
      {
        icon: <Activity className="w-4 h-4 text-rose-500" />,
        title: 'Metas Calóricas & Macros',
        description: 'A IA calcula automaticamente sua Taxa Metabólica Basal e gramas de proteína recomendadas.',
        tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      },
      {
        icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
        title: 'Restrições e Alergias',
        description: 'Cadastre intolerância a lactose, doença celíaca ou opções veganas para filtrar tudo.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <RotateCcw className="w-4 h-4 text-indigo-500" />,
        title: 'Reiniciar Guia Interativo',
        description: 'Dentro do perfil você encontra o botão para rever este tour com setas a qualquer momento.',
        tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      }
    ],
    proTip: 'Parabéns! Agora você conhece todos os principais atalhos do NutriAI para transformar sua saúde.'
  }
];

const STORAGE_KEY = 'nutri-welcome-tour-completed';

export function WelcomeTour({ onFinish, onNavigateTab }: WelcomeTourProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetFound, setTargetFound] = useState<boolean>(false);
  const [activeArrowDirection, setActiveArrowDirection] = useState<'up' | 'down' | 'left' | 'right' | 'none'>('none');
  const [arrowPosition, setArrowPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [popoverPositionStyle, setPopoverPositionStyle] = useState<React.CSSProperties>({});
  
  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Auto show tour for new users using Intro.js interactive tooltips
  useEffect(() => {
    try {
      const isCompleted = window.localStorage.getItem(STORAGE_KEY);
      if (!isCompleted) {
        const timer = setTimeout(() => {
          startIntroJsTour({
            forceStart: false,
            onNavigateTab,
            onComplete: () => {
              if (onFinish) onFinish();
            }
          });
        }, 1100);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.warn('Could not check tour status:', err);
    }
  }, [onNavigateTab, onFinish]);

  // Allow reopening tour via custom event 'app:openWelcomeTour'
  useEffect(() => {
    const handleReopenTour = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: 'introjs' | 'spotlight' }>;
      if (customEvent.detail?.mode === 'introjs') {
        setIsOpen(false);
        setTimeout(() => {
          startIntroJsTour({
            forceStart: true,
            onNavigateTab,
            onComplete: onFinish
          });
        }, 80);
      } else {
        setCurrentStepIndex(0);
        setIsOpen(true);
        playSfx('pop');
        vibrate(20);
      }
    };
    window.addEventListener('app:openWelcomeTour', handleReopenTour as EventListener);
    return () => window.removeEventListener('app:openWelcomeTour', handleReopenTour as EventListener);
  }, [onNavigateTab, onFinish]);

  // Keyboard navigation (Escape to close, Arrow keys to navigate)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose(true);
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  // Dynamic positioning & target calculation
  const recalculateTargetPosition = useCallback(() => {
    if (!isOpen) return;

    const current = TOUR_STEPS[currentStepIndex];
    if (!current || !current.targetSelector) {
      setTargetRect(null);
      setTargetFound(false);
      setActiveArrowDirection('none');
      setPopoverPositionStyle({});
      return;
    }

    // Try primary selector, then fallback to secondary selector
    let el = document.querySelector(current.targetSelector) as HTMLElement | null;
    if (!el && current.secondaryTargetSelector) {
      el = document.querySelector(current.secondaryTargetSelector) as HTMLElement | null;
    }

    if (!el) {
      setTargetRect(null);
      setTargetFound(false);
      setActiveArrowDirection('none');
      setPopoverPositionStyle({});
      return;
    }

    // Measure target bounding rect
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    setTargetFound(true);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 768;

    // Determine optimal direction and coordinates
    const targetCenterX = rect.left + rect.width / 2;
    const targetCenterY = rect.top + rect.height / 2;

    // Case 1: FAB Button (Bottom Right)
    if (current.targetSelector === '#chef-magic-fab-btn' || (rect.bottom > vh - 130 && rect.right > vw - 140)) {
      if (isMobile) {
        // Position above the FAB button on mobile
        setActiveArrowDirection('down');
        const popoverBottom = Math.max(16, vh - rect.top + 18);
        setPopoverPositionStyle({
          position: 'fixed',
          left: 16,
          right: 16,
          bottom: `${popoverBottom}px`,
          maxWidth: 'calc(100vw - 32px)',
          margin: '0 auto',
        });
        // Arrow aligned with target horizontally, constrained inside popover
        const clampedArrowX = Math.min(Math.max(36, targetCenterX - 16), vw - 60);
        setArrowPosition({ x: clampedArrowX, y: 0 });
      } else {
        // Position to the left of the FAB button on desktop
        setActiveArrowDirection('right');
        const popoverRight = Math.max(16, vw - rect.left + 24);
        const popoverBottom = Math.max(20, vh - rect.bottom - 10);
        setPopoverPositionStyle({
          position: 'fixed',
          right: `${popoverRight}px`,
          bottom: `${popoverBottom}px`,
          maxWidth: '520px',
        });
        setArrowPosition({ x: 0, y: Math.min(Math.max(40, targetCenterY), vh - 120) });
      }
      return;
    }

    // Case 2: Header Buttons or Top Navigation Items (Top area of screen)
    if (rect.top < vh * 0.45) {
      setActiveArrowDirection('up');
      const popoverTop = Math.min(vh - 280, Math.max(70, rect.bottom + 20));

      if (isMobile) {
        setPopoverPositionStyle({
          position: 'fixed',
          left: 16,
          right: 16,
          top: `${popoverTop}px`,
          maxWidth: 'calc(100vw - 32px)',
          margin: '0 auto',
        });
        const clampedArrowX = Math.min(Math.max(36, targetCenterX - 16), vw - 50);
        setArrowPosition({ x: clampedArrowX, y: 0 });
      } else {
        const popoverWidth = Math.min(540, vw - 40);
        const idealLeft = targetCenterX - popoverWidth / 2;
        const clampedLeft = Math.min(Math.max(20, idealLeft), vw - popoverWidth - 20);

        setPopoverPositionStyle({
          position: 'fixed',
          left: `${clampedLeft}px`,
          top: `${popoverTop}px`,
          maxWidth: `${popoverWidth}px`,
        });
        const relativeArrowX = Math.min(Math.max(36, targetCenterX - clampedLeft), popoverWidth - 36);
        setArrowPosition({ x: relativeArrowX, y: 0 });
      }
      return;
    }

    // Case 3: Middle or Lower Area (Position Above Target)
    setActiveArrowDirection('down');
    const popoverBottom = Math.max(16, vh - rect.top + 20);

    if (isMobile) {
      setPopoverPositionStyle({
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: `${popoverBottom}px`,
        maxWidth: 'calc(100vw - 32px)',
        margin: '0 auto',
      });
      const clampedArrowX = Math.min(Math.max(36, targetCenterX - 16), vw - 50);
      setArrowPosition({ x: clampedArrowX, y: 0 });
    } else {
      const popoverWidth = Math.min(540, vw - 40);
      const idealLeft = targetCenterX - popoverWidth / 2;
      const clampedLeft = Math.min(Math.max(20, idealLeft), vw - popoverWidth - 20);

      setPopoverPositionStyle({
        position: 'fixed',
        left: `${clampedLeft}px`,
        bottom: `${popoverBottom}px`,
        maxWidth: `${popoverWidth}px`,
      });
      const relativeArrowX = Math.min(Math.max(36, targetCenterX - clampedLeft), popoverWidth - 36);
      setArrowPosition({ x: relativeArrowX, y: 0 });
    }
  }, [isOpen, currentStepIndex]);

  // Recalculate position on resize, scroll, and step change
  useEffect(() => {
    if (!isOpen) return;

    recalculateTargetPosition();

    // Re-check after animations and tab transitions settle
    const t1 = setTimeout(recalculateTargetPosition, 60);
    const t2 = setTimeout(recalculateTargetPosition, 200);
    const t3 = setTimeout(recalculateTargetPosition, 450);

    window.addEventListener('resize', recalculateTargetPosition);
    window.addEventListener('scroll', recalculateTargetPosition, { capture: true, passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', recalculateTargetPosition);
      window.removeEventListener('scroll', recalculateTargetPosition, { capture: true });
    };
  }, [isOpen, currentStepIndex, recalculateTargetPosition]);

  const handleClose = (markCompleted = true) => {
    if (markCompleted) {
      try {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      } catch (e) {}
    }
    setIsOpen(false);
    playSfx('tap');
    vibrate(10);
    if (onFinish) onFinish();
  };

  const handleStepTransition = (nextIndex: number) => {
    setCurrentStepIndex(nextIndex);
    const nextStep = TOUR_STEPS[nextIndex];

    // Navigate to suggested tab so target button appears
    if (nextStep?.suggestedTab && onNavigateTab) {
      onNavigateTab(nextStep.suggestedTab);
    }

    // Scroll element smoothly if it exists
    setTimeout(() => {
      if (nextStep?.targetSelector) {
        const el = document.querySelector(nextStep.targetSelector) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }, 80);
  };

  const handleNext = () => {
    playSfx('tap');
    vibrate(15);
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      handleStepTransition(currentStepIndex + 1);
    } else {
      // Completed last step
      handleClose(true);
      playSfx('success');
      vibrate([30, 40, 50]);
    }
  };

  const handlePrev = () => {
    playSfx('tap');
    vibrate(10);
    if (currentStepIndex > 0) {
      handleStepTransition(currentStepIndex - 1);
    }
  };

  // Allow clicking "Testar Botão / Abrir Recurso"
  const handleTestTargetButton = () => {
    playSfx('crystal');
    vibrate(20);
    if (step.suggestedTab && onNavigateTab) {
      onNavigateTab(step.suggestedTab);
    }
    if (step.targetSelector) {
      const el = document.querySelector(step.targetSelector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        // Visual feedback ping
        el.classList.add('ring-4', 'ring-amber-400');
        setTimeout(() => el.classList.remove('ring-4', 'ring-amber-400'), 1200);
      }
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          id="welcome-tour-container"
          className="fixed inset-0 z-[99999] overflow-hidden select-none"
        >
          {/* Backdrop with dynamic spotlight cut-out */}
          {targetRect && targetFound ? (
            <svg 
              className="fixed inset-0 w-full h-full pointer-events-none z-[99996]"
              aria-hidden="true"
            >
              <defs>
                <mask id="welcome-tour-spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={targetRect.left - 7}
                    y={targetRect.top - 7}
                    width={targetRect.width + 14}
                    height={targetRect.height + 14}
                    rx={targetRect.width === targetRect.height ? 9999 : 18}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(11, 17, 29, 0.82)"
                mask="url(#welcome-tour-spotlight-mask)"
                className="pointer-events-auto cursor-pointer backdrop-blur-[2px]"
                onClick={() => handleClose(true)}
              />
            </svg>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => handleClose(true)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer transition-opacity z-[99996]"
            />
          )}

          {/* Glowing halo & locator tag around the live targeted button */}
          {targetRect && targetFound && (
            <div
              style={{
                position: 'fixed',
                top: targetRect.top - 7,
                left: targetRect.left - 7,
                width: targetRect.width + 14,
                height: targetRect.height + 14,
                borderRadius: targetRect.width === targetRect.height ? '9999px' : '18px',
              }}
              className="pointer-events-none z-[99997] border-2 border-amber-400 dark:border-emerald-400 shadow-[0_0_35px_rgba(245,158,11,0.85)] dark:shadow-[0_0_35px_rgba(16,185,129,0.85)] transition-all duration-300"
            >
              {/* Outer pulsing ring */}
              <div className="absolute -inset-2 rounded-[inherit] border border-amber-400/80 dark:border-emerald-400/80 animate-ping opacity-75" />
              
              {/* Mini locator tag right over the button */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-lg whitespace-nowrap flex items-center gap-1 animate-bounce">
                <Sparkles className="w-2.5 h-2.5" />
                <span>{step.targetButtonName || 'Botão Aqui'}</span>
              </div>
            </div>
          )}

          {/* Modal Popover Card */}
          <div 
            className={`fixed inset-0 z-[99998] pointer-events-none ${
              !targetRect || !targetFound ? 'flex items-center justify-center p-4 sm:p-6' : ''
            }`}
          >
            <motion.div
              key={step.id}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ 
                type: 'spring', 
                damping: 27, 
                stiffness: 300, 
                mass: 0.8 
              }}
              style={targetRect && targetFound ? popoverPositionStyle : { maxWidth: '580px', width: '100%' }}
              className="relative pointer-events-auto flex flex-col bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 z-[99998] overflow-visible max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
              id="welcome-tour-popover-card"
            >
              {/* Ambient Glows */}
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-tr from-amber-500/15 via-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

              {/* Dynamic Pointing Arrows with Oscillation & High-Contrast Glowing Styling */}
              {targetRect && targetFound && activeArrowDirection === 'up' && (
                <motion.div
                  style={{ left: arrowPosition.x }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="absolute -top-12 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30"
                  id="tour-pointing-arrow-up"
                >
                  <div className="px-2 py-0.5 mb-1 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg whitespace-nowrap">
                    Olhe o Botão Acima
                  </div>
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" className="text-emerald-400 drop-shadow-[0_0_14px_rgba(16,185,129,0.95)]">
                    <path d="M17 30V4M17 4L6 15M17 4L28 15" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              )}

              {targetRect && targetFound && activeArrowDirection === 'down' && (
                <motion.div
                  style={{ left: arrowPosition.x }}
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="absolute -bottom-12 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30"
                  id="tour-pointing-arrow-down"
                >
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" className="text-amber-400 drop-shadow-[0_0_14px_rgba(245,158,11,0.95)]">
                    <path d="M17 4V30M17 30L6 19M17 30L28 19" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="px-2 py-0.5 mt-1 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg whitespace-nowrap">
                    Olhe o Botão Abaixo
                  </div>
                </motion.div>
              )}

              {targetRect && targetFound && activeArrowDirection === 'right' && (
                <motion.div
                  animate={{ x: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="absolute -right-16 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-30"
                  id="tour-pointing-arrow-right"
                >
                  <div className="hidden sm:inline-block px-2.5 py-1 mr-1 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg whitespace-nowrap">
                    Botão Aqui
                  </div>
                  <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="text-amber-400 drop-shadow-[0_0_14px_rgba(245,158,11,0.95)]">
                    <path d="M4 19H34M34 19L19 4M34 19L19 34" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              )}

              {/* Header Bar */}
              <div className="flex items-center justify-between gap-3 mb-3.5 shrink-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs">
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{step.badge}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {currentStepIndex + 1} de {TOUR_STEPS.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleClose(true)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Fechar Guia"
                    id="btn-close-welcome-tour"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="overflow-y-auto max-h-[58vh] pr-1 space-y-3.5 custom-scrollbar">
                {/* Title & Icon Header */}
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/90 dark:to-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 shadow-xs shrink-0">
                    {step.icon}
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold font-serif text-slate-900 dark:text-white leading-tight">
                      {step.title}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {step.description}
                </p>

                {/* Target Button Quick Action Bar */}
                {step.targetButtonName && (
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                        Alvo: <span className="underline decoration-amber-400 font-extrabold">{step.targetButtonName}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestTargetButton}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-[11px] transition shadow-xs cursor-pointer shrink-0 flex items-center gap-1"
                      title="Destacar e focar no botão agora"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Focar no Botão</span>
                    </button>
                  </div>
                )}

                {/* Feature Highlights Grid */}
                {step.highlights && step.highlights.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Principais Vantagens:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {step.highlights.map((h, i) => (
                        <div 
                          key={i} 
                          className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-start gap-2"
                        >
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-xs shrink-0 mt-0.5">
                            {h.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                              {h.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                              {h.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pro Tip Box */}
                {step.proTip && (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-2 text-xs">
                    <Zap className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium text-[11px] sm:text-xs">{step.proTip}</span>
                  </div>
                )}
              </div>

              {/* Footer Controls & Navigation */}
              <div className="flex items-center justify-between pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                {/* Step Indicators & Intro.js switch */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {TOUR_STEPS.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          playSfx('tap');
                          handleStepTransition(idx);
                        }}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          idx === currentStepIndex
                            ? 'w-6 bg-emerald-500 dark:bg-emerald-400 shadow-xs'
                            : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                        aria-label={`Ir para passo ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleClose(false);
                      setTimeout(() => {
                        startIntroJsTour({
                          forceStart: true,
                          onNavigateTab,
                          onComplete: onFinish
                        });
                      }, 100);
                    }}
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                    title="Alternar para o modo Intro.js"
                    id="btn-switch-to-introjs-tour"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Modo Intro.js</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {currentStepIndex > 0 && (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Voltar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleNext}
                    id="btn-next-welcome-tour-step"
                    className="inline-flex items-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer select-none"
                  >
                    <span>{step.primaryActionLabel}</span>
                    {isLastStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
