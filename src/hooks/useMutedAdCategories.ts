import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { db, auth, doc, setDoc } from '../lib/firebase';

export interface AdCategoryDefinition {
  key: string;
  name: string;
  emoji: string;
  description: string;
  healthContext: string;
}

export const KNOWN_AD_CATEGORIES: AdCategoryDefinition[] = [
  {
    key: 'fast_food',
    name: 'Fast Food & Ultraprocessados',
    emoji: '🍔',
    description: 'Lanches rápidos, frituras, refrigerantes e combos hipercalóricos.',
    healthContext: 'Recomendado silenciar se sua meta for perda de peso, redução de gordura corporal ou reeducação alimentar.'
  },
  {
    key: 'supplements',
    name: 'Suplementos',
    emoji: '💊',
    description: 'Whey protein, creatina, pré-treinos e termogênicos.',
    healthContext: 'Recomendado silenciar se seu plano priorizar alimentação 100% natural com alimentos integrais sem suplementação.'
  },
  {
    key: 'fitness',
    name: 'Fitness & Equipamentos',
    emoji: '🏋️',
    description: 'Halteres, roupas esportivas, esteiras e acessórios de treino.',
    healthContext: 'Equipamentos esportivos e itens de musculação, corrida e mobilidade articular.'
  },
  {
    key: 'organic',
    name: 'Orgânicos & Naturais',
    emoji: '🥗',
    description: 'Cestas de feira fresca, hortifrúti sem agrotóxicos e comida limpa.',
    healthContext: 'Opções sustentáveis de produtores familiares e alimentos orgânicos certificados.'
  },
  {
    key: 'nutrition',
    name: 'Nutrição & Hidratação',
    emoji: '💧',
    description: 'Garrafas inteligentes, chás funcionais e produtos de bem-estar.',
    healthContext: 'Foco em hidratação diária, ingestão hídrica e equilíbrio metabólico.'
  }
];

export function getCategoryLabel(categoryKey: string): string {
  const found = KNOWN_AD_CATEGORIES.find(c => c.key === categoryKey);
  if (found) return found.name;
  if (categoryKey === 'fast_food') return 'Fast Food';
  if (categoryKey === 'supplements') return 'Suplementos';
  return categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
}

export function getCategoryEmoji(categoryKey: string): string {
  const found = KNOWN_AD_CATEGORIES.find(c => c.key === categoryKey);
  return found?.emoji || '🏷️';
}

export const useMutedAdCategories = (profile: UserProfile | null | undefined) => {
  const resolveInitialMuted = useCallback((): string[] => {
    if (Array.isArray(profile?.mutedAdCategories) && profile.mutedAdCategories.length > 0) {
      return profile.mutedAdCategories;
    }
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nutri_ad_muted_categories');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.filter((item): item is string => typeof item === 'string');
          }
        }
      }
    } catch {
      // Ignore localStorage parse errors in private/restricted environments
    }
    return [];
  }, [profile?.mutedAdCategories]);

  const [mutedCategories, setMutedCategories] = useState<string[]>(resolveInitialMuted);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setMutedCategories(resolveInitialMuted());
    setInitialized(true);
  }, [resolveInitialMuted]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMutedCategoriesChange = (e: Event) => {
      const updated = (e as CustomEvent)?.detail?.mutedCategories;
      if (Array.isArray(updated)) {
        setMutedCategories(updated);
      }
    };

    window.addEventListener('nutri-ad-muted-categories-changed', handleMutedCategoriesChange);
    return () => {
      window.removeEventListener('nutri-ad-muted-categories-changed', handleMutedCategoriesChange);
    };
  }, []);

  const persistMuted = useCallback((categories: string[]) => {
    setMutedCategories(categories);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nutri_ad_muted_categories', JSON.stringify(categories));
        window.dispatchEvent(
          new CustomEvent('nutri-ad-muted-categories-changed', {
            detail: { mutedCategories: categories }
          })
        );
      }
      const uid = auth?.currentUser?.uid || profile?.id;
      if (uid && typeof setDoc === 'function') {
        setDoc(doc(db, 'users', uid), { mutedAdCategories: categories }, { merge: true }).catch(() => {});
      }
    } catch (err) {
      console.warn('Erro ao salvar categorias de anúncios silenciadas:', err);
    }
  }, [profile?.id]);

  const toggleMuteCategory = useCallback((categoryKey: string) => {
    const isMuted = mutedCategories.includes(categoryKey);
    const updated = isMuted 
      ? mutedCategories.filter(c => c !== categoryKey)
      : [...mutedCategories, categoryKey];
    persistMuted(updated);
  }, [mutedCategories, persistMuted]);

  const muteCategory = useCallback((categoryKey: string) => {
    if (!mutedCategories.includes(categoryKey)) {
      persistMuted([...mutedCategories, categoryKey]);
    }
  }, [mutedCategories, persistMuted]);

  const unmuteCategory = useCallback((categoryKey: string) => {
    if (mutedCategories.includes(categoryKey)) {
      persistMuted(mutedCategories.filter(c => c !== categoryKey));
    }
  }, [mutedCategories, persistMuted]);

  const resetMutedCategories = useCallback(() => {
    persistMuted([]);
  }, [persistMuted]);

  const isCategoryMuted = useCallback((categoryKey: string) => {
    return mutedCategories.includes(categoryKey);
  }, [mutedCategories]);

  return {
    mutedCategories,
    toggleMuteCategory,
    muteCategory,
    unmuteCategory,
    resetMutedCategories,
    isCategoryMuted,
    initialized,
    knownCategories: KNOWN_AD_CATEGORIES
  };
};
