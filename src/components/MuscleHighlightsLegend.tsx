import React from 'react';
import { Target } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export interface MuscleHighlightsLegendProps {
  /** Primary recruited muscles list */
  primaryMuscles?: string[];
  /** Secondary synergist muscles list */
  secondaryMuscles?: string[];
  /** Primary color override */
  primaryColor?: string;
  /** Secondary color override */
  secondaryColor?: string;
  /** Optional section title */
  title?: string;
  /** Optional container className */
  className?: string;
  /** Optional callback when clicking a muscle badge */
  onMuscleClick?: (muscle: string, type: 'primary' | 'secondary') => void;
}

export function MuscleHighlightsLegend({
  primaryMuscles = [],
  secondaryMuscles = [],
  primaryColor = '#ff0033',
  secondaryColor = '#ff6a00',
  title = 'Mapeamento Biomecânico de Esforço',
  className = '',
  onMuscleClick,
}: MuscleHighlightsLegendProps) {
  const { t } = useTranslation();
  const hasPrimary = primaryMuscles && primaryMuscles.length > 0;
  const hasSecondary = secondaryMuscles && secondaryMuscles.length > 0;

  if (!hasPrimary && !hasSecondary) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Legenda de Músculos Ativados"
      className={`w-full rounded-2xl p-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 shadow-xl text-white transition-all duration-300 ${className}`}
      style={{
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Title / Header */}
      {title && (
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Target className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t(title)}
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
            Shader Dinâmico R3F
          </span>
        </div>
      )}

      {/* Legend Rows Container */}
      <div className="space-y-3">
        {/* Primary Muscles Row */}
        {hasPrimary && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2.5 min-w-[150px]">
              {/* Red Indicator Circle */}
              <div
                className="relative w-4 h-4 rounded-full flex-shrink-0 shadow-md animate-pulse"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${primaryColor}80 0%, ${primaryColor} 60%, #b91c1c 100%)`,
                  boxShadow: `0 0 12px ${primaryColor}B3`,
                }}
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-bold text-slate-200 leading-tight">{t('Primário (Alvo)')}</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">{t('Esforço máximo & contração')}</p>
              </div>
            </div>

            {/* Muscle Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {primaryMuscles.map((muscle, index) => (
                <button
                  key={`prim-${index}-${muscle}`}
                  type="button"
                  onClick={() => onMuscleClick && onMuscleClick(muscle, 'primary')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-950/60 border border-red-500/40 text-red-200 shadow-sm transition-all ${
                    onMuscleClick ? 'hover:bg-red-900/80 hover:border-red-400 cursor-pointer active:scale-95' : ''
                  }`}
                  title={`${t('Músculo primário')}: ${muscle}`}
                >
                  {t(muscle)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Muscles Row */}
        {hasSecondary && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2.5 min-w-[150px]">
              {/* Orange / Amber Indicator Circle */}
              <div
                className="relative w-4 h-4 rounded-full flex-shrink-0 shadow-md"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${secondaryColor}80 0%, ${secondaryColor} 60%, #c2410c 100%)`,
                  boxShadow: `0 0 12px ${secondaryColor}B3`,
                }}
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-bold text-slate-200 leading-tight">{t('Secundário (Sinergista)')}</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">{t('Estabilização & suporte')}</p>
              </div>
            </div>

            {/* Muscle Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {secondaryMuscles.map((muscle, index) => (
                <button
                  key={`sec-${index}-${muscle}`}
                  type="button"
                  onClick={() => onMuscleClick && onMuscleClick(muscle, 'secondary')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-950/60 border border-orange-500/40 text-orange-200 shadow-sm transition-all ${
                    onMuscleClick ? 'hover:bg-orange-900/80 hover:border-orange-400 cursor-pointer active:scale-95' : ''
                  }`}
                  title={`${t('Músculo secundário / sinergista')}: ${muscle}`}
                >
                  {t(muscle)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MuscleHighlightsLegend;
