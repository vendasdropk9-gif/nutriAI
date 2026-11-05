import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateTotalPoints,
  calculateLevelFromPoints,
  calculateLevelProgress,
  createPointsHistoryEntry,
  calculateActivityBonus,
} from '../lib/gamificationUtils';
import {
  normalizeToSupportedLocale,
} from '../i18n/index';
import {
  getLanguageBySubtag,
  searchLanguages,
  languagesList,
} from '../lib/languages';

describe('App Utilities - Points & Gamification Calculations', () => {
  describe('calculateTotalPoints', () => {
    it('correctly calculates point additions for valid numbers', () => {
      expect(calculateTotalPoints(100, 50)).toBe(150);
      expect(calculateTotalPoints(0, 100)).toBe(100);
      expect(calculateTotalPoints(750, 250)).toBe(1000);
    });

    it('handles null, undefined and NaN values safely defaulting to 0', () => {
      expect(calculateTotalPoints(null, 50)).toBe(50);
      expect(calculateTotalPoints(undefined, 80)).toBe(80);
      expect(calculateTotalPoints(NaN as any, 100)).toBe(100);
      expect(calculateTotalPoints(150, undefined as any)).toBe(150);
      expect(calculateTotalPoints(undefined, undefined as any)).toBe(0);
    });

    it('ensures points cannot become negative below 0', () => {
      expect(calculateTotalPoints(50, -100)).toBe(0);
      expect(calculateTotalPoints(0, -50)).toBe(0);
      expect(calculateTotalPoints(-20, 10)).toBe(0);
    });

    it('rounds fractional point values to integer XP', () => {
      expect(calculateTotalPoints(100, 49.6)).toBe(150);
      expect(calculateTotalPoints(100, 49.2)).toBe(149);
    });
  });

  describe('calculateLevelFromPoints', () => {
    it('returns Level 1 for points in range 0 - 499', () => {
      expect(calculateLevelFromPoints(0)).toBe(1);
      expect(calculateLevelFromPoints(150)).toBe(1);
      expect(calculateLevelFromPoints(499)).toBe(1);
    });

    it('returns Level 2 for points in range 500 - 999', () => {
      expect(calculateLevelFromPoints(500)).toBe(2);
      expect(calculateLevelFromPoints(750)).toBe(2);
      expect(calculateLevelFromPoints(999)).toBe(2);
    });

    it('returns Level 3 for points in range 1000 - 1499', () => {
      expect(calculateLevelFromPoints(1000)).toBe(3);
      expect(calculateLevelFromPoints(1499)).toBe(3);
    });

    it('handles high scores scaling appropriately', () => {
      expect(calculateLevelFromPoints(2500)).toBe(6);
      expect(calculateLevelFromPoints(5000)).toBe(11);
    });

    it('gracefully handles null, undefined, or negative values as Level 1', () => {
      expect(calculateLevelFromPoints(null)).toBe(1);
      expect(calculateLevelFromPoints(undefined)).toBe(1);
      expect(calculateLevelFromPoints(-100)).toBe(1);
    });
  });

  describe('calculateLevelProgress', () => {
    it('accurately computes progress percent within current level tier', () => {
      // 0 pts => Level 1, 0% progress
      const p0 = calculateLevelProgress(0);
      expect(p0.currentLevel).toBe(1);
      expect(p0.progressPercent).toBe(0);
      expect(p0.pointsToNextLevel).toBe(500);
      expect(p0.title).toBe('Iniciante');

      // 250 pts => Level 1, 50% progress
      const p250 = calculateLevelProgress(250);
      expect(p250.currentLevel).toBe(1);
      expect(p250.pointsInCurrentLevel).toBe(250);
      expect(p250.progressPercent).toBe(50);
      expect(p250.pointsToNextLevel).toBe(250);

      // 500 pts => Level 2, 0% progress into level 2
      const p500 = calculateLevelProgress(500);
      expect(p500.currentLevel).toBe(2);
      expect(p500.pointsInCurrentLevel).toBe(0);
      expect(p500.progressPercent).toBe(0);
      expect(p500.title).toBe('Intermediário');

      // 875 pts => Level 2, (375/500) = 75% progress
      const p875 = calculateLevelProgress(875);
      expect(p875.currentLevel).toBe(2);
      expect(p875.pointsInCurrentLevel).toBe(375);
      expect(p875.progressPercent).toBe(75);
    });

    it('assigns appropriate titles according to user advancement', () => {
      expect(calculateLevelProgress(300).title).toBe('Iniciante'); // Lvl 1
      expect(calculateLevelProgress(750).title).toBe('Intermediário'); // Lvl 2
      expect(calculateLevelProgress(1200).title).toBe('Avançado'); // Lvl 3
      expect(calculateLevelProgress(1800).title).toBe('Elite Fitness'); // Lvl 4
      expect(calculateLevelProgress(3500).title).toBe('Mestre NutriAI'); // Lvl 8 (>=5)
    });
  });

  describe('createPointsHistoryEntry', () => {
    it('creates an immutable history ledger entry with unique ID and timestamp', () => {
      const entry = createPointsHistoryEntry(50, 'Registro de Almoço Saudável');
      expect(entry.id).toBeDefined();
      expect(typeof entry.id).toBe('string');
      expect(entry.amount).toBe(50);
      expect(entry.reason).toBe('Registro de Almoço Saudável');
      expect(new Date(entry.date).getTime()).toBeGreaterThan(0);
    });

    it('falls back to default reason if an empty string or whitespace is provided', () => {
      const entry = createPointsHistoryEntry(30, '   ');
      expect(entry.reason).toBe('Atividade Nutricional');
    });

    it('supports custom timestamp injection for historical rehydration', () => {
      const customIso = '2026-11-01T12:00:00.000Z';
      const entry = createPointsHistoryEntry(100, 'Meta de Hidratação', customIso);
      expect(entry.date).toBe(customIso);
    });
  });

  describe('calculateActivityBonus', () => {
    it('returns established XP awards for common healthy actions', () => {
      expect(calculateActivityBonus('meal_logged')).toBe(50);
      expect(calculateActivityBonus('water_goal')).toBe(30);
      expect(calculateActivityBonus('workout_done')).toBe(100);
      expect(calculateActivityBonus('streak_7_days')).toBe(250);
      expect(calculateActivityBonus('streak_30_days')).toBe(1000);
    });
  });
});

describe('App Utilities - Language Normalization & Resolution', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('normalizeToSupportedLocale', () => {
    it('normalizes Portuguese codes and variants to pt-BR', () => {
      expect(normalizeToSupportedLocale('pt')).toBe('pt-BR');
      expect(normalizeToSupportedLocale('pt-BR')).toBe('pt-BR');
      expect(normalizeToSupportedLocale('pt-PT')).toBe('pt-BR');
      expect(normalizeToSupportedLocale('pt-br')).toBe('pt-BR');
      expect(normalizeToSupportedLocale('portuguese')).toBe('pt-BR');
      expect(normalizeToSupportedLocale('  PT-BR  ')).toBe('pt-BR');
    });

    it('normalizes English codes and variants to en-US', () => {
      expect(normalizeToSupportedLocale('en')).toBe('en-US');
      expect(normalizeToSupportedLocale('en-US')).toBe('en-US');
      expect(normalizeToSupportedLocale('en-GB')).toBe('en-US');
      expect(normalizeToSupportedLocale('en-AU')).toBe('en-US');
      expect(normalizeToSupportedLocale('en-CA')).toBe('en-US');
      expect(normalizeToSupportedLocale('english')).toBe('en-US');
      expect(normalizeToSupportedLocale('  EN-us  ')).toBe('en-US');
    });

    it('falls back to default en-US on null, undefined, or empty inputs', () => {
      expect(normalizeToSupportedLocale(null)).toBe('en-US');
      expect(normalizeToSupportedLocale(undefined)).toBe('en-US');
      expect(normalizeToSupportedLocale('')).toBe('en-US');
      expect(normalizeToSupportedLocale('   ')).toBe('en-US');
    });

    it('falls back to en-US on unsupported foreign languages', () => {
      expect(normalizeToSupportedLocale('es')).toBe('en-US');
      expect(normalizeToSupportedLocale('fr')).toBe('en-US');
      expect(normalizeToSupportedLocale('de')).toBe('en-US');
      expect(normalizeToSupportedLocale('ja-JP')).toBe('en-US');
      expect(normalizeToSupportedLocale('zh-CN')).toBe('en-US');
    });
  });

  describe('getLanguageBySubtag', () => {
    it('returns Brazilian Portuguese configuration with metric units and BRL currency', () => {
      const ptOption = getLanguageBySubtag('pt-BR');
      expect(ptOption.code).toBe('pt-BR');
      expect(ptOption.originalName).toBe('Português');
      expect(ptOption.translatedName).toBe('Português (Brasil)');
      expect(ptOption.country).toBe('Brasil');
      expect(ptOption.flag).toBe('🇧🇷');
      expect(ptOption.unitSystem).toBe('metric');
      expect(ptOption.currency).toBe('BRL');
      expect(ptOption.currencySymbol).toBe('R$');
    });

    it('returns US English configuration with imperial units and USD currency', () => {
      const enOption = getLanguageBySubtag('en-US');
      expect(enOption.code).toBe('en-US');
      expect(enOption.originalName).toBe('English');
      expect(enOption.translatedName).toBe('English (United States)');
      expect(enOption.country).toBe('United States');
      expect(enOption.flag).toBe('🇺🇸');
      expect(enOption.unitSystem).toBe('imperial');
      expect(enOption.currency).toBe('USD');
      expect(enOption.currencySymbol).toBe('$');
    });

    it('handles lowercase, uppercase, and prefix variants correctly', () => {
      expect(getLanguageBySubtag('en').code).toBe('en-US');
      expect(getLanguageBySubtag('EN-US').code).toBe('en-US');
      expect(getLanguageBySubtag('pt').code).toBe('pt-BR');
      expect(getLanguageBySubtag('PT-BR').code).toBe('pt-BR');
    });

    it('defaults to pt-BR if given null, undefined, or empty string', () => {
      expect(getLanguageBySubtag(null as any).code).toBe('pt-BR');
      expect(getLanguageBySubtag(undefined as any).code).toBe('pt-BR');
      expect(getLanguageBySubtag('').code).toBe('pt-BR');
    });
  });

  describe('searchLanguages', () => {
    it('returns all supported languages when query is empty', () => {
      const results = searchLanguages('');
      expect(results.length).toBe(languagesList.length);
      expect(results).toEqual(languagesList);
    });

    it('filters languages by country name', () => {
      const brResults = searchLanguages('Brasil');
      expect(brResults.length).toBe(1);
      expect(brResults[0].code).toBe('pt-BR');

      const usResults = searchLanguages('United');
      expect(usResults.length).toBe(1);
      expect(usResults[0].code).toBe('en-US');
    });

    it('filters languages by native name or code', () => {
      const ptResults = searchLanguages('português');
      expect(ptResults.length).toBe(1);
      expect(ptResults[0].code).toBe('pt-BR');

      const enCodeResults = searchLanguages('en-us');
      expect(enCodeResults.length).toBe(1);
      expect(enCodeResults[0].code).toBe('en-US');
    });

    it('returns an empty array when no languages match the query', () => {
      const noMatch = searchLanguages('xyz_non_existent');
      expect(noMatch.length).toBe(0);
    });
  });
});
