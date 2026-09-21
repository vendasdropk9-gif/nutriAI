import introJs from 'intro.js';
import 'intro.js/introjs.css';
import { playSfx, vibrate } from './sensory';

export interface TourOptions {
  onNavigateTab?: (tab: string) => void;
  onComplete?: () => void;
  onExit?: () => void;
  forceStart?: boolean;
}

export const TOUR_STORAGE_KEY = 'nutri-welcome-tour-completed';

export function hasCompletedTour(): boolean {
  try {
    return !!window.localStorage.getItem(TOUR_STORAGE_KEY);
  } catch {
    return false;
  }
}

export function markTourCompleted(): void {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  } catch {}
}

export function resetTourStatus(): void {
  try {
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch {}
}

export interface TourStepItem {
  title?: string;
  intro: string;
  element?: HTMLElement | string | (() => HTMLElement | null | undefined);
  position?: string;
  tabKey?: string;
}

/**
 * Rola suavemente o elemento do menu horizontal para o centro antes de exibir a tooltip
 */
function ensureNavElementVisible(el: HTMLElement | null | undefined) {
  if (!el) return;
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    const navScrollContainer = el.closest('.overflow-x-auto') as HTMLElement | null;
    if (navScrollContainer) {
      const containerRect = navScrollContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = (elRect.left + elRect.width / 2) - (containerRect.left + containerRect.width / 2);
      navScrollContainer.scrollBy({ left: offset, behavior: 'smooth' });
    }
  } catch {}
}

interface StepConfig {
  title: string;
  intro: string;
  element?: (() => HTMLElement | undefined) | string;
  position?: string;
  tabKey?: string;
}

/**
 * Inicializa e executa o Tour de Boas-Vindas interativo utilizando Intro.js
 */
export function startIntroJsTour(options: TourOptions = {}) {
  const { onNavigateTab, onComplete, onExit, forceStart = false } = options;

  if (!forceStart && hasCompletedTour()) {
    return null;
  }

  const intro = introJs();

  // Helper para buscar elementos no DOM com fallbacks
  const getEl = (selector: string, fallbackSelector?: string): HTMLElement | undefined => {
    if (typeof document === 'undefined') return undefined;
    const found = document.querySelector(selector) as HTMLElement | null;
    if (found) return found;
    if (fallbackSelector) {
      return (document.querySelector(fallbackSelector) as HTMLElement | null) || undefined;
    }
    return undefined;
  };

  const stepsConfig: StepConfig[] = [
    {
      title: '✨ Bem-vindo ao NutriAI!',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
            Seu ecossistema completo de <strong>nutrição inteligente, culinária prática, economia e saúde</strong> com Inteligência Artificial.
          </p>
          <div class="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300">
            💡 <strong>Tour Rápido de 1 Minuto:</strong> Vamos apresentar as ferramentas essenciais, incluindo a <em>Lista de Compras Inteligente</em> e o <em>Monitor de Preços</em> para você economizar e se alimentar melhor!
          </div>
        </div>
      `,
      tabKey: undefined
    },
    {
      element: () => getEl('#nav-item-shopping'),
      title: '🛒 Lista de Compras Inteligente',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            Organize suas idas ao mercado com praticidade e <strong>zero esquecimento</strong>:
          </p>
          <ul class="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>✅ <strong>Sincronização Direta:</strong> adicione itens faltantes de receitas e da despensa com 1 toque.</li>
            <li>📂 <strong>Categorização por Corredores:</strong> alimentos separados por Hortifrúti, Carnes, Laticínios e Mercearia.</li>
            <li>💰 <strong>Estimativa de Gastos:</strong> calcule o total estimado do seu carrinho antes de sair de casa.</li>
            <li>🛍️ <strong>Modo Mercado Interativo:</strong> marque itens em tempo real com checklists táteis rápidos.</li>
          </ul>
        </div>
      `,
      position: 'auto',
      tabKey: 'shopping'
    },
    {
      element: () => getEl('#nav-item-market', '#nav-item-comparer'),
      title: '🏷️ Monitor de Preços, Sacolões & Mercados',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            Economize em todas as compras com o <strong>Economizômetro & Comparador</strong>:
          </p>
          <ul class="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>📈 <strong>Histórico de Preços:</strong> acompanhe a variação de valores de itens básicos e hortifrúti.</li>
            <li>🏪 <strong>Mercados & Feiras Locais:</strong> descubra sacolões e feiras livres com as melhores ofertas na sua região.</li>
            <li>🔄 <strong>Trocas Inteligentes:</strong> sugestões de ingredientes equivalentes com menor custo por porção.</li>
            <li>⚖️ <strong>Comparador Nutri-Econômico:</strong> avalie qual produto oferece melhor custo por grama de proteína.</li>
          </ul>
        </div>
      `,
      position: 'auto',
      tabKey: 'market'
    },
    {
      element: () => getEl('#chef-magic-fab-btn', '#nav-item-generator'),
      title: '👨‍🍳 Gerador de Receitas & Chef Mágico IA',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            Crie refeições personalizadas em segundos com o que você já tem na cozinha:
          </p>
          <ul class="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>🎯 <strong>Filtros por Objetivo:</strong> emagrecimento, ganho de massa, low carb, diabéticos ou detox.</li>
            <li>🔥 <strong>Tabela Nutricional Exata:</strong> calorias, proteínas, carboidratos e fibras calculadas na hora.</li>
            <li>⏱️ <strong>Timers Integrados:</strong> cronômetros de cozimento em cada etapa para nunca queimar o prato.</li>
          </ul>
        </div>
      `,
      position: 'auto',
      tabKey: 'generator'
    },
    {
      element: () => getEl('#nav-item-pantry'),
      title: '📦 Scanner de Despensa & Validades',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            Controle de estoque inteligente e <strong>desperdício zero</strong>:
          </p>
          <ul class="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>📷 <strong>Leitor de Código de Barras:</strong> aponte a câmera da embalagem para cadastrar sem digitar.</li>
            <li>⏳ <strong>Alertas de Validade:</strong> saiba quais itens vão vencer primeiro para utilizá-los a tempo.</li>
            <li>✨ <strong>Receitas de Aproveitamento:</strong> a IA sugere pratos focados nos alimentos perto do vencimento.</li>
          </ul>
        </div>
      `,
      position: 'auto',
      tabKey: 'pantry'
    },
    {
      element: () => getEl('#nav-item-fridge', '#nav-item-analyzer'),
      title: '🧊 Geladeira Inteligente com Câmera IA',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            Tire uma foto das prateleiras ou do seu <strong>prato pronto</strong>:
          </p>
          <ul class="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>🥗 <strong>Reconhecimento Visual Instantâneo:</strong> identifica alimentos e porções em segundos.</li>
            <li>🍽️ <strong>Análise de Prato:</strong> distribuição de macronutrientes da refeição direto pela foto.</li>
            <li>🌿 <strong>Controle de Frescor:</strong> acompanhe o estado dos vegetais e carnes armazenados.</li>
          </ul>
        </div>
      `,
      position: 'auto',
      tabKey: 'fridge'
    },
    {
      element: () => getEl('#nav-item-habits'),
      title: '📊 Rastreador de Hábitos & Metas Diárias',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            Mantenha a constância com lembretes e gráficos interativos:
          </p>
          <ul class="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>💧 <strong>Hidratação:</strong> registre cada copo de água e atinja sua meta diária com lembretes.</li>
            <li>⚡ <strong>Jejum & Atividades:</strong> cronômetro de jejum intermitente, horas de sono e calorias queimadas.</li>
            <li>🔥 <strong>Streaks & Conquistas:</strong> acumule dias consecutivos de disciplina e ganhe medalhas.</li>
          </ul>
        </div>
      `,
      position: 'auto',
      tabKey: 'habits'
    },
    {
      element: () => getEl('#header-feedback-trigger-btn', '#nav-item-assistant360'),
      title: '🎙️ Assistente Chef Malu & Voz Natural Aoede',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            Converse por voz natural com pronúncia brasileira humanizada:
          </p>
          <ul class="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>🗣️ <strong>Instruções de Mãos-Livres:</strong> a Malu dita o passo a passo da receita enquanto você cozinha.</li>
            <li>🔊 <strong>Controle de Volume Independente:</strong> ajuste o volume da voz da IA sem alterar outras mídias.</li>
            <li>💬 <strong>Consultoria Nutricional 24/7:</strong> tire dúvidas de calorias, trocas de temperos e preparos.</li>
          </ul>
        </div>
      `,
      position: 'bottom',
      tabKey: 'assistant360'
    },
    {
      element: () => getEl('#header-reading-mode-toggle-btn'),
      title: '📖 Modo de Leitura & Acessibilidade',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            Cozinhe com o máximo conforto visual:
          </p>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Ative fontes ampliadas (até 30px), alto contraste e checklists gigantes para ler receitas de longe na bancada sem cansar a vista.
          </p>
        </div>
      `,
      position: 'bottom',
      tabKey: undefined
    },
    {
      element: () => getEl('#header-user-avatar-btn', '#nav-item-profile'),
      title: '👤 Seu Perfil, Metas & Conclusão',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            No seu perfil você configura seu objetivo de peso, restrições alimentares e pode <strong>reabrir este tour a qualquer momento</strong>!
          </p>
          <div class="p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center">
            🎉 Tudo pronto! Aproveite ao máximo todas as ferramentas do NutriAI!
          </div>
        </div>
      `,
      position: 'bottom',
      tabKey: 'profile'
    }
  ];

  // Resolve os elementos dinamicamente
  const resolvedSteps = stepsConfig
    .map(step => {
      const el = typeof step.element === 'function' ? step.element() : (step.element ? getEl(step.element as string) : undefined);
      return {
        title: step.title,
        intro: step.intro,
        element: el,
        position: step.position || 'auto',
        tabKey: step.tabKey
      };
    })
    .filter(step => !step.element || step.element !== undefined);

  intro.setOptions({
    nextLabel: 'Próximo →',
    prevLabel: '← Voltar',
    skipLabel: 'Pular Tour',
    doneLabel: 'Concluir & Começar! 🚀',
    hidePrev: false,
    hideNext: false,
    showProgress: true,
    showBullets: true,
    showStepNumbers: true,
    exitOnEsc: true,
    exitOnOverlayClick: true,
    scrollToElement: true,
    scrollPadding: 90,
    overlayOpacity: 0.82,
    disableInteraction: false,
    tooltipClass: 'nutri-intro-tooltip',
    highlightClass: 'nutri-intro-highlight',
    steps: resolvedSteps as any
  });

  // Eventos de navegação com áudio, vibração e transição de aba
  intro.onbeforechange(async function() {
    playSfx('pop');
    vibrate(12);

    try {
      const stepIndex = intro.currentStep();
      if (typeof stepIndex === 'number' && stepIndex >= 0 && stepIndex < resolvedSteps.length) {
        const currentStep = resolvedSteps[stepIndex];
        
        // Se a etapa estiver associada a uma aba e houver callback, sincroniza
        if (currentStep?.tabKey && onNavigateTab) {
          onNavigateTab(currentStep.tabKey);
        }

        // Rola suavemente o botão do menu para ficar visível
        if (currentStep?.element) {
          ensureNavElementVisible(currentStep.element as HTMLElement);
        }
      }
    } catch (e) {
      console.warn('[Intro.js] Erro ao sincronizar etapa:', e);
    }
    return true;
  });

  intro.onchange(function(targetElement) {
    if (targetElement) {
      ensureNavElementVisible(targetElement);
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  });

  intro.oncomplete(function() {
    markTourCompleted();
    playSfx('success');
    vibrate([30, 40, 50]);
    if (onComplete) onComplete();
  });

  intro.onexit(function() {
    markTourCompleted();
    playSfx('tap');
    if (onExit) onExit();
  });

  try {
    intro.start();
    return intro;
  } catch (err) {
    console.warn('[Intro.js] Erro ao iniciar tour:', err);
    return null;
  }
}

