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
  element?: HTMLElement | string;
  position?: string;
}

/**
 * Inicializa e executa o Tour de Boas-Vindas interativo utilizando Intro.js
 */
export function startIntroJsTour(options: TourOptions = {}) {
  const { onNavigateTab, onComplete, onExit, forceStart = false } = options;

  if (!forceStart && hasCompletedTour()) {
    return null;
  }

  // Se o botão da despensa ou chef mágico não estiverem renderizados ainda, aguarda brevemente
  const intro = introJs();

  const steps: TourStepItem[] = [
    {
      title: '✨ Bem-vindo ao NutriAI!',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm font-medium leading-relaxed">
            Seu ecossistema completo de <strong>nutrição inteligente, culinária prática e saúde preventiva</strong> com Inteligência Artificial.
          </p>
          <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
            💡 Vamos fazer um tour rápido de 1 minuto para você conhecer os recursos mais poderosos do seu novo aplicativo!
          </div>
        </div>
      `
    },
    {
      element: (document.querySelector('#chef-magic-fab-btn') || document.querySelector('#nav-item-generator') || undefined) as HTMLElement | undefined,
      title: '👨‍🍳 Gerador de Receitas & Chef Mágico',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed">
            Toque no <strong>Chef Mágico</strong> a qualquer momento para ditar ou digitar os ingredientes que você tem em casa.
          </p>
          <ul class="text-xs space-y-1 text-slate-600 dark:text-slate-300">
            <li>• Refeições personalizadas por objetivo (emagrecimento, hipertrofia, etc.)</li>
            <li>• Cálculo preciso de calorias, proteínas e micronutrientes</li>
            <li>• Cronômetros de cozimento e passo a passo guiado</li>
          </ul>
        </div>
      `,
      position: 'auto'
    },
    {
      element: (document.querySelector('#nav-item-habits') || undefined) as HTMLElement | undefined,
      title: '📊 Rastreador de Hábitos & Metas',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed">
            Mantenha sua constância diária monitorando seus hábitos em tempo real:
          </p>
          <ul class="text-xs space-y-1 text-slate-600 dark:text-slate-300">
            <li>💧 <strong>Hidratação:</strong> registre seus copos e receba lembretes</li>
            <li>⚡ <strong>Jejum & Atividades:</strong> metas de sono, passos e queima calórica</li>
            <li>🔥 <strong>Streaks:</strong> acumule sequências para pontuar na comunidade</li>
          </ul>
        </div>
      `,
      position: 'auto'
    },
    {
      element: (document.querySelector('#nav-item-pantry') || undefined) as HTMLElement | undefined,
      title: '📦 Scanner de Despensa & Validades',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed">
            Aponte a câmera para o <strong>código de barras</strong> dos alimentos para cadastrá-los na despensa instantaneamente.
          </p>
          <p class="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Receba alertas de vencimento e gere receitas automáticas para evitar qualquer desperdício de comida!
          </p>
        </div>
      `,
      position: 'auto'
    },
    {
      element: (document.querySelector('#nav-item-fridge') || undefined) as HTMLElement | undefined,
      title: '🧊 Geladeira Inteligente com Câmera IA',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed">
            Tire uma foto das prateleiras da sua geladeira ou do seu <strong>prato pronto</strong>:
          </p>
          <p class="text-xs text-slate-600 dark:text-slate-300">
            A visão computacional reconhece os alimentos, calcula a distribuição de carboidratos, proteínas e gorduras em segundos.
          </p>
        </div>
      `,
      position: 'auto'
    },
    {
      element: (document.querySelector('#header-feedback-trigger-btn') || document.querySelector('#nav-item-assistant360') || undefined) as HTMLElement | undefined,
      title: '🎙️ Assistente Malu & Controle de Voz',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed">
            A <strong>Chef Malu</strong> possui voz brasileira humanizada (Aoede) para ditar instruções na cozinha sem você precisar tocar na tela.
          </p>
          <p class="text-xs text-slate-600 dark:text-slate-300">
            Você pode ajustar o volume da síntese de voz de forma independente ou pedir conselhos nutricionais completos a qualquer hora.
          </p>
        </div>
      `,
      position: 'bottom'
    },
    {
      element: (document.querySelector('#header-reading-mode-toggle-btn') || undefined) as HTMLElement | undefined,
      title: '📖 Modo de Leitura & Acessibilidade',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed">
            Ative fontes ampliadas, alto contraste e checklists táteis para seguir o preparo de receitas de longe na bancada com máximo conforto visual.
          </p>
        </div>
      `,
      position: 'bottom'
    },
    {
      element: (document.querySelector('#header-user-avatar-btn') || document.querySelector('#nav-item-profile') || undefined) as HTMLElement | undefined,
      title: '👤 Seu Perfil, Metas & Notificações',
      intro: `
        <div class="space-y-2 py-1">
          <p class="text-sm leading-relaxed">
            No seu perfil você personaliza seus objetivos (peso, alergias, restrições) e pode <strong>rever este tour interativo</strong> sempre que desejar!
          </p>
          <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center">
            🎉 Parabéns! Você está pronto para explorar o NutriAI!
          </div>
        </div>
      `,
      position: 'bottom'
    }
  ].filter(step => !step.element || step.element !== undefined);

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
    scrollPadding: 80,
    overlayOpacity: 0.8,
    disableInteraction: false,
    tooltipClass: 'nutri-intro-tooltip',
    highlightClass: 'nutri-intro-highlight',
    steps: steps as any
  });

  // Efeitos sonoros e táteis durante a navegação do tour
  intro.onbeforechange(async function() {
    playSfx('pop');
    vibrate(12);

    // Ajuste de aba se aplicável
    try {
      const stepIndex = intro.currentStep();
      if (typeof stepIndex === 'number' && onNavigateTab) {
        if (stepIndex === 1) onNavigateTab('generator');
        else if (stepIndex === 2) onNavigateTab('habits');
        else if (stepIndex === 3) onNavigateTab('pantry');
        else if (stepIndex === 4) onNavigateTab('fridge');
      }
    } catch {}
    return true;
  });

  intro.onchange(function(targetElement) {
    if (targetElement) {
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
