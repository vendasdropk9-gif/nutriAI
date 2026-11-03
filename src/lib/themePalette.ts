export interface ThemePalette {
  id: string;
  name: string;
  tagline: string;
  primaryHex: string;
  hoverHex: string;
  lightHex: string;
  subtleHex: string;
  glowHex: string;
  gradient: string;
  swatchGradient: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const COLOR_PALETTES: ThemePalette[] = [
  {
    id: 'emerald',
    name: 'Esmeralda NutriAI',
    tagline: 'Verde vitalidade, saúde e nutrição (Padrão)',
    primaryHex: '#10B981',
    hoverHex: '#059669',
    lightHex: '#34D399',
    subtleHex: 'rgba(16, 185, 129, 0.15)',
    glowHex: 'rgba(16, 185, 129, 0.4)',
    gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
    swatchGradient: 'from-emerald-400 to-teal-600',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500'
  },
  {
    id: 'sapphire',
    name: 'Safira Elétrica',
    tagline: 'Azul vibrante, tecnologia e foco mentais',
    primaryHex: '#2563EB',
    hoverHex: '#1D4ED8',
    lightHex: '#60A5FA',
    subtleHex: 'rgba(37, 99, 235, 0.15)',
    glowHex: 'rgba(37, 99, 235, 0.4)',
    gradient: 'from-blue-600 via-indigo-600 to-blue-700',
    swatchGradient: 'from-blue-400 to-indigo-600',
    bgClass: 'bg-blue-600',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500'
  },
  {
    id: 'amethyst',
    name: 'Ametista Neon',
    tagline: 'Roxo futurista, intuição e alta performance',
    primaryHex: '#8B5CF6',
    hoverHex: '#7C3AED',
    lightHex: '#A78BFA',
    subtleHex: 'rgba(139, 92, 246, 0.15)',
    glowHex: 'rgba(139, 92, 246, 0.4)',
    gradient: 'from-violet-500 via-purple-600 to-indigo-600',
    swatchGradient: 'from-purple-400 to-violet-600',
    bgClass: 'bg-purple-600',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500'
  },
  {
    id: 'amber',
    name: 'Âmbar Cozinha',
    tagline: 'Laranja energia, apetite e fogo criativo',
    primaryHex: '#F59E0B',
    hoverHex: '#D97706',
    lightHex: '#FBBF24',
    subtleHex: 'rgba(245, 158, 11, 0.15)',
    glowHex: 'rgba(245, 158, 11, 0.4)',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    swatchGradient: 'from-amber-400 to-orange-600',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500'
  },
  {
    id: 'ruby',
    name: 'Rubi Magenta',
    tagline: 'Rosa choque, paixão, força e motivação',
    primaryHex: '#EC4899',
    hoverHex: '#DB2777',
    lightHex: '#F472B6',
    subtleHex: 'rgba(236, 72, 153, 0.15)',
    glowHex: 'rgba(236, 72, 153, 0.4)',
    gradient: 'from-pink-500 via-rose-500 to-pink-600',
    swatchGradient: 'from-pink-400 to-rose-600',
    bgClass: 'bg-pink-500',
    textClass: 'text-pink-400',
    borderClass: 'border-pink-500'
  },
  {
    id: 'cyan',
    name: 'Ciano Mente Zen',
    tagline: 'Turquesa suave, hidratação e equilíbrio',
    primaryHex: '#06B6D4',
    hoverHex: '#0891B2',
    lightHex: '#22D3EE',
    subtleHex: 'rgba(6, 182, 212, 0.15)',
    glowHex: 'rgba(6, 182, 212, 0.4)',
    gradient: 'from-cyan-500 via-teal-500 to-cyan-600',
    swatchGradient: 'from-cyan-400 to-teal-500',
    bgClass: 'bg-cyan-500',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500'
  },
  {
    id: 'gold',
    name: 'Dourado Imperial',
    tagline: 'Ouro luxuoso, conquista e hábitos elite',
    primaryHex: '#D4AF37',
    hoverHex: '#B59227',
    lightHex: '#E5C258',
    subtleHex: 'rgba(212, 175, 55, 0.15)',
    glowHex: 'rgba(212, 175, 55, 0.4)',
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    swatchGradient: 'from-yellow-300 to-amber-500',
    bgClass: 'bg-amber-400',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400'
  },
  {
    id: 'crimson',
    name: 'Carmim Ativo',
    tagline: 'Vermelho intenso, intensidade e treino forte',
    primaryHex: '#EF4444',
    hoverHex: '#DC2626',
    lightHex: '#F87171',
    subtleHex: 'rgba(239, 68, 68, 0.15)',
    glowHex: 'rgba(239, 68, 68, 0.4)',
    gradient: 'from-red-500 via-rose-600 to-red-700',
    swatchGradient: 'from-red-400 to-rose-600',
    bgClass: 'bg-red-500',
    textClass: 'text-red-400',
    borderClass: 'border-red-500'
  }
];

export const getSavedThemePalette = (): ThemePalette => {
  if (typeof window === 'undefined') return COLOR_PALETTES[0];
  try {
    const savedId = localStorage.getItem('nutri_theme_palette');
    const found = COLOR_PALETTES.find((p) => p.id === savedId);
    return found || COLOR_PALETTES[0];
  } catch {
    return COLOR_PALETTES[0];
  }
};

export const applyThemePalette = (paletteId: string): ThemePalette => {
  const palette = COLOR_PALETTES.find((p) => p.id === paletteId) || COLOR_PALETTES[0];

  if (typeof window !== 'undefined' && document && document.documentElement) {
    const root = document.documentElement;
    // Set custom CSS variables
    root.style.setProperty('--primary-color', palette.primaryHex);
    root.style.setProperty('--primary-color-hover', palette.hoverHex);
    root.style.setProperty('--primary-color-light', palette.lightHex);
    root.style.setProperty('--primary-color-subtle', palette.subtleHex);
    root.style.setProperty('--primary-glow', palette.glowHex);

    // Dynamic Tailwind color overrides for total interface reflection
    root.style.setProperty('--color-emerald-500', palette.primaryHex);
    root.style.setProperty('--color-emerald-400', palette.lightHex);
    root.style.setProperty('--color-emerald-600', palette.hoverHex);
    root.style.setProperty('--color-emerald-300', palette.lightHex);
    root.style.setProperty('--color-emerald-700', palette.hoverHex);

    // Save to localStorage
    try {
      localStorage.setItem('nutri_theme_palette', palette.id);
    } catch (e) {}

    // Dispatch custom event for real-time listener updates
    window.dispatchEvent(
      new CustomEvent('nutri:palette-changed', {
        detail: { palette }
      })
    );
  }

  return palette;
};

export const initThemePalette = (): ThemePalette => {
  const current = getSavedThemePalette();
  return applyThemePalette(current.id);
};
