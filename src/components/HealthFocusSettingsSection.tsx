import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  EyeOff,
  Check,
  Sparkles,
  RefreshCw,
  Sliders,
  X,
  RotateCcw,
  HeartPulse
} from 'lucide-react';
import { HealthFocusProfile, UserProfile } from '../types';
import { useMutedAdCategories, getCategoryLabel, getCategoryEmoji } from '../hooks/useMutedAdCategories';
import {
  loadLocalHealthFocusProfile,
  saveManualHealthFocusUpdate,
  relaxHealthFocusRestrictions,
  recordHiddenAdCategoryEvent
} from '../lib/healthFocusEngine';
import { playSfx, vibrate } from '../lib/sensory';

interface HealthFocusSettingsSectionProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
  onShowToast?: (title: string, desc: string, icon?: 'bell' | 'face' | 'fingerprint' | 'check') => void;
}

export const HealthFocusSettingsSection: React.FC<HealthFocusSettingsSectionProps> = ({
  profile,
  onSaveProfile,
  onShowToast
}) => {
  const {
    mutedCategories,
    toggleMuteCategory,
    resetMutedCategories,
    isCategoryMuted,
    knownCategories
  } = useMutedAdCategories(profile);

  const [healthFocus, setHealthFocus] = useState<HealthFocusProfile>(() =>
    loadLocalHealthFocusProfile(profile)
  );
  const [customFocusLabel, setCustomFocusLabel] = useState<string>(
    () => loadLocalHealthFocusProfile(profile).focusLabel || profile?.goals || ''
  );

  useEffect(() => {
    const loaded = loadLocalHealthFocusProfile(profile);
    setHealthFocus(loaded);
    setCustomFocusLabel(loaded.focusLabel || profile?.goals || '');
  }, [profile?.healthFocus, profile?.goals, profile?.mutedAdCategories]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFocusUpdate = (e: Event) => {
      const updated = (e as CustomEvent)?.detail?.healthFocus as HealthFocusProfile | undefined;
      if (updated) {
        setHealthFocus(updated);
        if (updated.focusLabel) {
          setCustomFocusLabel(updated.focusLabel);
        }
      }
    };
    window.addEventListener('nutri-health-focus-updated', handleFocusUpdate);
    return () => window.removeEventListener('nutri-health-focus-updated', handleFocusUpdate);
  }, []);

  const effectiveProfile: UserProfile | null = profile
    ? { ...profile, healthFocus, mutedAdCategories: mutedCategories }
    : null;

  const persistProfileChanges = (nextFocus: HealthFocusProfile, nextMuted: string[]) => {
    if (profile) {
      onSaveProfile({
        ...profile,
        mutedAdCategories: nextMuted,
        healthFocus: nextFocus,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleToggleAdCategory = async (categoryKey: string) => {
    const currentlyMuted = isCategoryMuted(categoryKey);
    toggleMuteCategory(categoryKey);
    playSfx(currentlyMuted ? 'crystal' : 'tap');
    vibrate(15);

    const nextMuted = currentlyMuted
      ? mutedCategories.filter((c) => c !== categoryKey)
      : [...mutedCategories, categoryKey];

    const updatedFocus = await recordHiddenAdCategoryEvent({
      category: categoryKey,
      action: currentlyMuted ? 'unmute' : 'mute',
      placementId: 'profile-health-focus-settings',
      profile: effectiveProfile
    });

    setHealthFocus(updatedFocus);
    persistProfileChanges(updatedFocus, nextMuted);

    onShowToast?.(
      currentlyMuted ? 'Categoria Reativada' : 'Categoria Silenciada',
      currentlyMuted
        ? `${getCategoryLabel(categoryKey)} voltará a aparecer com prioridade normal.`
        : `${getCategoryLabel(categoryKey)} foi silenciada para proteger seu Foco em Saúde.`,
      'check'
    );
  };

  const handleResetAllMuted = () => {
    resetMutedCategories();
    playSfx('crystal');
    vibrate(20);
    const { healthFocus: relaxedFocus } = relaxHealthFocusRestrictions(effectiveProfile, {
      clearExplicitMutes: true
    });
    setHealthFocus(relaxedFocus);
    setCustomFocusLabel(relaxedFocus.focusLabel || profile?.goals || '');
    persistProfileChanges(relaxedFocus, []);
    onShowToast?.(
      'Todas as Categorias Reativadas',
      'As restrições de anúncios e o histórico de bloqueios da IA foram limpos.',
      'check'
    );
  };

  const handleChangeStrictness = (mode: 'flexible' | 'balanced' | 'strict') => {
    playSfx('tap');
    vibrate(15);
    const updatedFocus = saveManualHealthFocusUpdate(effectiveProfile, {
      strictnessMode: mode
    });
    setHealthFocus(updatedFocus);
    persistProfileChanges(updatedFocus, mutedCategories);
    onShowToast?.(
      'Sensibilidade da IA Ajustada',
      mode === 'flexible'
        ? 'Modo Flexível ativado: a IA evitará apenas categorias explicitamente silenciadas.'
        : mode === 'strict'
          ? 'Modo Estrito ativado: filtragem rigorosa de categorias e termos semelhantes.'
          : 'Modo Equilibrado ativado para suas recomendações.',
      'check'
    );
  };

  const handleSaveCustomFocusLabel = () => {
    const trimmed = customFocusLabel.trim();
    if (!trimmed) return;
    playSfx('success');
    vibrate(20);
    const updatedFocus = saveManualHealthFocusUpdate(effectiveProfile, {
      focusLabel: trimmed
    });
    setHealthFocus(updatedFocus);
    persistProfileChanges(updatedFocus, mutedCategories);
    onShowToast?.(
      'Foco em Saúde Atualizado',
      'Seu foco personalizado foi salvo para orientar as próximas recomendações da IA.',
      'check'
    );
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    playSfx('tap');
    const nextKeywords = (healthFocus.deprioritizedKeywords || []).filter(
      (kw) => kw !== keywordToRemove
    );
    const updatedFocus = saveManualHealthFocusUpdate(effectiveProfile, {
      deprioritizedKeywords: nextKeywords
    });
    setHealthFocus(updatedFocus);
    persistProfileChanges(updatedFocus, mutedCategories);
  };

  const handleRestoreCategoryPriority = (categoryKey: string) => {
    playSfx('crystal');
    vibrate(15);
    const nextWeights = { ...(healthFocus.categoryWeights || {}), [categoryKey]: 1.0 };
    const nextDeprioritized = (healthFocus.deprioritizedCategories || []).filter(
      (c) => c !== categoryKey
    );
    const nextMuted = mutedCategories.filter((c) => c !== categoryKey);
    if (isCategoryMuted(categoryKey)) {
      toggleMuteCategory(categoryKey);
    }

    const updatedFocus = saveManualHealthFocusUpdate(
      effectiveProfile,
      {
        categoryWeights: nextWeights,
        deprioritizedCategories: nextDeprioritized
      },
      nextMuted
    );
    setHealthFocus(updatedFocus);
    persistProfileChanges(updatedFocus, nextMuted);
    onShowToast?.(
      'Prioridade Restaurada',
      `${getCategoryLabel(categoryKey)} retornou para 100% de prioridade no seu perfil.`,
      'check'
    );
  };

  const handleRelaxAIRestrictions = () => {
    playSfx('crystal');
    vibrate([20, 30]);
    const { healthFocus: relaxedFocus, mutedAdCategories: nextMuted } =
      relaxHealthFocusRestrictions(effectiveProfile, { clearExplicitMutes: false });
    setHealthFocus(relaxedFocus);
    persistProfileChanges(relaxedFocus, nextMuted);
    onShowToast?.(
      'Restrições Automáticas Suavizadas',
      'Sinais ocultos de anúncios dispensados foram limpos e a IA voltou ao modo flexível.',
      'check'
    );
  };

  const downgradedWeightEntries = Object.entries(healthFocus.categoryWeights || {}).filter(
    ([catKey, weight]) =>
      typeof weight === 'number' &&
      weight < 1 &&
      !mutedCategories.includes(catKey)
  );

  const strictnessMode = healthFocus.strictnessMode || 'balanced';
  const deprioritizedKeywords = healthFocus.deprioritizedKeywords || [];
  const hasAnyRestriction =
    mutedCategories.length > 0 ||
    deprioritizedKeywords.length > 0 ||
    downgradedWeightEntries.length > 0 ||
    (healthFocus.deprioritizedCategories?.length || 0) > 0;

  return (
    <div
      className="space-y-4 w-full"
      data-testid="profile-health-focus-section"
      id="section-health-focus-preferences"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
          Foco em Saúde & Categorias de Anúncios Silenciadas
        </label>
        {hasAnyRestriction && (
          <span
            data-testid="profile-health-focus-active-badge"
            className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-500/30"
          >
            {mutedCategories.length} {mutedCategories.length === 1 ? 'categoria silenciada' : 'categorias silenciadas'}
          </span>
        )}
      </div>

      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm space-y-6">
        {/* Header Explanation & Quick Relax Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                Controle Manual de Foco em Saúde & IA
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                Revise categorias de anúncios que você silenciou ou ocultou e ajuste manualmente seu{' '}
                <strong>Foco em Saúde</strong> caso sinta que a IA está restringindo demais suas recomendações.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="profile-relax-ai-btn"
              onClick={handleRelaxAIRestrictions}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Suavizar restrições inferidas automaticamente pela IA"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Suavizar IA</span>
            </button>
            {mutedCategories.length > 0 && (
              <button
                type="button"
                data-testid="profile-unmute-all-btn"
                onClick={handleResetAllMuted}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reativar Todas</span>
              </button>
            )}
          </div>
        </div>

        {/* Manual Health Focus Customization & AI Strictness */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Editable Focus Label */}
            <div className="space-y-2">
              <label
                htmlFor="profile-health-focus-label-input"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Diretriz Atual de Foco em Saúde</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="profile-health-focus-label-input"
                  data-testid="profile-health-focus-label-input"
                  type="text"
                  value={customFocusLabel}
                  onChange={(e) => setCustomFocusLabel(e.target.value)}
                  placeholder="Ex: Alimentação equilibrada com variedade..."
                  className="flex-1 min-w-0 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  data-testid="profile-save-health-focus-btn"
                  onClick={handleSaveCustomFocusLabel}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shrink-0"
                >
                  Aplicar Foco
                </button>
              </div>
            </div>

            {/* AI Strictness Selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span>Nível de Restrição das Recomendações da IA</span>
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'flexible' as const,
                    label: 'Flexível',
                    desc: 'Menos restritivo'
                  },
                  {
                    id: 'balanced' as const,
                    label: 'Equilibrado',
                    desc: 'Padrão'
                  },
                  {
                    id: 'strict' as const,
                    label: 'Estrito',
                    desc: 'Filtro máximo'
                  }
                ].map((opt) => {
                  const active = strictnessMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`health-focus-strictness-${opt.id}`}
                      onClick={() => handleChangeStrictness(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        active
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{opt.label}</span>
                        {active && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <span className="block text-[10px] opacity-80 mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Muted Ad Categories Grid */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Categorias de Anúncios (Silenciar ou Reativar)</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Sincronizado automaticamente com os cards de anúncio
              </span>
            </div>

            <div
              data-testid="profile-muted-categories-grid"
              className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
            >
              {knownCategories.map((cat) => {
                const muted = isCategoryMuted(cat.key);
                const weight = healthFocus.categoryWeights?.[cat.key];
                const isSoftReduced = !muted && typeof weight === 'number' && weight < 1;

                return (
                  <div
                    key={cat.key}
                    data-testid={`profile-category-card-${cat.key}`}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      muted
                        ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                        : isSoftReduced
                          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300/70 dark:border-amber-800/50'
                          : 'bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">{cat.emoji}</span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {cat.name}
                        </span>
                        {isSoftReduced && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            Prioridade reduzida ({Math.round(weight * 100)}%)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        {cat.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSoftReduced && (
                        <button
                          type="button"
                          data-testid={`profile-restore-weight-${cat.key}`}
                          onClick={() => handleRestoreCategoryPriority(cat.key)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold transition cursor-pointer"
                          title="Restaurar prioridade para 100%"
                        >
                          100%
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`profile-toggle-category-${cat.key}`}
                        onClick={() => handleToggleAdCategory(cat.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          muted
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {muted ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Silenciado • Reativar</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Ativo</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Softened/Auto-Deprioritized Weights from Hidden Dismiss Tracking */}
          {downgradedWeightEntries.length > 0 && (
            <div
              data-testid="profile-soft-deprioritized-box"
              className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Categorias com prioridade reduzida por anúncios ocultados anteriormente
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {downgradedWeightEntries.map(([catKey, weight]) => (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => handleRestoreCategoryPriority(catKey)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition cursor-pointer"
                  >
                    <span>{getCategoryEmoji(catKey)}</span>
                    <span>
                      {getCategoryLabel(catKey)} ({Math.round(Number(weight) * 100)}%)
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 ml-1">Restaurar</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deprioritized AI Keywords Removal */}
          {deprioritizedKeywords.length > 0 && (
            <div
              data-testid="profile-deprioritized-keywords-box"
              className="pt-2 space-y-2"
            >
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Termos evitados pela IA (clique no X para liberar um termo manualmente):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {deprioritizedKeywords.map((kw) => (
                  <span
                    key={kw}
                    data-testid={`profile-deprioritized-kw-${kw}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      data-testid={`profile-remove-kw-${kw}`}
                      onClick={() => handleRemoveKeyword(kw)}
                      aria-label={`Remover restrição do termo ${kw}`}
                      className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
