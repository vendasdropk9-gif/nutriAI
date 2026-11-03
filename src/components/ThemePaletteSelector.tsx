import React, { useState, useEffect } from 'react';
import { Palette, Check, Sparkles, Sun, Moon, Contrast, ShieldCheck, Eye, RefreshCw, Layers } from 'lucide-react';
import { COLOR_PALETTES, ThemePalette, getSavedThemePalette, applyThemePalette } from '../lib/themePalette';
import { playSfx, vibrate } from '../lib/sensory';

interface ThemePaletteSelectorProps {
  onPaletteChange?: (palette: ThemePalette) => void;
  className?: string;
}

export const ThemePaletteSelector: React.FC<ThemePaletteSelectorProps> = ({
  onPaletteChange,
  className = ''
}) => {
  const [activePalette, setActivePalette] = useState<ThemePalette>(() => getSavedThemePalette());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const handlePaletteEvent = (e: any) => {
      if (e.detail && e.detail.palette) {
        setActivePalette(e.detail.palette);
      }
    };
    window.addEventListener('nutri:palette-changed', handlePaletteEvent);
    return () => window.removeEventListener('nutri:palette-changed', handlePaletteEvent);
  }, []);

  const handleSelectPalette = (palette: ThemePalette) => {
    setActivePalette(palette);
    applyThemePalette(palette.id);
    playSfx('crystal');
    vibrate([20, 30, 20]);
    if (onPaletteChange) {
      onPaletteChange(palette);
    }
  };

  const handleToggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nutri-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nutri-theme', 'light');
    }
    playSfx('tap');
    vibrate(15);
  };

  return (
    <div
      className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-7 rounded-3xl shadow-lg transition-all duration-300 relative overflow-hidden ${className}`}
      id="theme-color-palette-selector-card"
    >
      {/* Background Glow matching selected theme */}
      <div
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all duration-500 opacity-20"
        style={{ backgroundColor: activePalette.primaryHex }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-700/80 relative z-10">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 transition-all duration-300"
            style={{
              backgroundColor: activePalette.primaryHex,
              boxShadow: `0 8px 20px ${activePalette.glowHex}`
            }}
          >
            <Palette className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
                Personalização de Cores e Tema
              </h3>
              <span
                className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1 transition-all"
                style={{
                  backgroundColor: activePalette.subtleHex,
                  color: activePalette.primaryHex,
                  borderColor: `${activePalette.primaryHex}40`
                }}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {activePalette.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Escolha a paleta de cores primárias (`--primary-color`) do aplicativo, refletida em botões, destaques, barras e gráficos.
            </p>
          </div>
        </div>

        {/* Light / Dark Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleToggleDarkMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !isDarkMode
                ? 'bg-white text-amber-600 shadow-sm font-black border border-slate-200'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Ativar Modo Claro"
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Claro</span>
          </button>

          <button
            type="button"
            onClick={handleToggleDarkMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isDarkMode
                ? 'bg-slate-800 text-indigo-300 shadow-sm font-black border border-slate-700'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Ativar Modo Escuro"
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>Escuro</span>
          </button>
        </div>
      </div>

      {/* Palette Selector Grid */}
      <div className="pt-5 space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Contrast className="w-3.5 h-3.5" style={{ color: activePalette.primaryHex }} />
            Selecione sua Paleta de Destaque Primário:
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Aplicações instantâneas via CSS Variables
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COLOR_PALETTES.map((palette) => {
            const isSelected = activePalette.id === palette.id;

            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => handleSelectPalette(palette)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between gap-2.5 relative group active:scale-95 ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-slate-900 border-2 shadow-xl ring-2'
                    : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/70'
                }`}
                style={{
                  borderColor: isSelected ? palette.primaryHex : undefined,
                  boxShadow: isSelected ? `0 10px 25px -5px ${palette.glowHex}` : undefined
                }}
              >
                {/* Active Check Mark Badge */}
                {isSelected && (
                  <span
                    className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-slate-950 font-black shadow-md animate-in zoom-in-50 duration-200"
                    style={{ backgroundColor: palette.primaryHex }}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}

                {/* Swatch Gradient Circle Preview */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${palette.swatchGradient} shadow-md shrink-0 ring-2 ring-white/20 group-hover:scale-110 transition-transform`}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black truncate leading-tight">
                      {palette.name}
                    </span>
                    <span className="text-[9px] font-mono opacity-60 uppercase tracking-widest mt-0.5">
                      {palette.primaryHex}
                    </span>
                  </div>
                </div>

                {/* Tagline */}
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-snug line-clamp-2">
                  {palette.tagline}
                </p>

                {/* Color Spectrum Preview Strip */}
                <div className="flex items-center gap-1 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/80">
                  <span className="w-full h-1.5 rounded-full" style={{ backgroundColor: palette.primaryHex }} />
                  <span className="w-full h-1.5 rounded-full" style={{ backgroundColor: palette.lightHex }} />
                  <span className="w-full h-1.5 rounded-full" style={{ backgroundColor: palette.hoverHex }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Interface Accent Sample Preview */}
        <div
          className="p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            backgroundColor: activePalette.subtleHex,
            borderColor: `${activePalette.primaryHex}35`
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl text-white font-black shadow-md shrink-0"
              style={{ backgroundColor: activePalette.primaryHex }}
            >
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Prévia da Cor Destaque em Tempo Real
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                O aplicativo substituiu dinamicamente a cor primária global por <strong style={{ color: activePalette.primaryHex }}>{activePalette.name}</strong> ({activePalette.primaryHex}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              style={{ backgroundColor: activePalette.primaryHex }}
              onClick={() => {
                playSfx('crystal');
                vibrate(15);
              }}
            >
              Botão Primário
            </button>

            <span
              className="px-2.5 py-1 rounded-xl font-mono text-[10px] font-bold border"
              style={{
                color: activePalette.primaryHex,
                borderColor: `${activePalette.primaryHex}50`,
                backgroundColor: activePalette.subtleHex
              }}
            >
              Badge Tema
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePaletteSelector;
