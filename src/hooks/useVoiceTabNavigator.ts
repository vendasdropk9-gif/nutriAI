export function useVoiceTabNavigator(options?: { onNavigate?: (tab: string) => void; lang?: string }) {
  return {
    navigateTab: (tab: string) => {
      window.dispatchEvent(new CustomEvent('app:navigate', { detail: tab }));
      if (options?.onNavigate) options.onNavigate(tab);
    },
    processVoiceCommand: (cmd?: string): { targetName: string } | null => {
      if (!cmd) return null;
      const lower = cmd.toLowerCase();
      if (lower.includes('plano') || lower.includes('meal plan')) {
        if (options?.onNavigate) options.onNavigate('plan');
        return { targetName: 'Plano Alimentar' };
      }
      if (lower.includes('compras') || lower.includes('shopping')) {
        if (options?.onNavigate) options.onNavigate('shopping');
        return { targetName: 'Lista de Compras' };
      }
      if (lower.includes('receita') || lower.includes('generator')) {
        if (options?.onNavigate) options.onNavigate('generator');
        return { targetName: 'Gerador de Receitas' };
      }
      return null;
    },
    lastMatch: null,
    isNavigating: false
  };
}
