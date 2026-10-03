import i18n from '../i18n';

/**
 * Standardized Internationalization (Intl) Formatters for NutriAI
 * Localizes dates, times, currencies, numbers and percentages seamlessly across all 12+ supported locales.
 */

// Mapping of language code to regional currency default (US, UK, AU, BR)
const CURRENCY_MAP: Record<string, string> = {
  'en-US': 'USD',
  'en': 'USD',
  'en-GB': 'GBP',
  'en-AU': 'AUD',
  'pt-BR': 'BRL',
  'pt': 'BRL',
};

export function getActiveLocale(): string {
  return i18n.language || 'pt-BR';
}

/**
 * Formats a Date object or ISO string according to the active locale
 */
export function formatDate(
  date: Date | string | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const targetLocale = locale || getActiveLocale();
  const defaultOptions: Intl.DateTimeFormatOptions = options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  try {
    return new Intl.DateTimeFormat(targetLocale, defaultOptions).format(d);
  } catch (e) {
    return d.toLocaleDateString();
  }
}

/**
 * Formats time according to the active locale (e.g. 14:30 or 2:30 PM)
 */
export function formatTime(
  date: Date | string | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const targetLocale = locale || getActiveLocale();
  const defaultOptions: Intl.DateTimeFormatOptions = options || {
    hour: '2-digit',
    minute: '2-digit'
  };
  try {
    return new Intl.DateTimeFormat(targetLocale, defaultOptions).format(d);
  } catch (e) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Formats full Date + Time
 */
export function formatDateTime(
  date: Date | string | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const targetLocale = locale || getActiveLocale();
  const defaultOptions: Intl.DateTimeFormatOptions = options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  try {
    return new Intl.DateTimeFormat(targetLocale, defaultOptions).format(d);
  } catch (e) {
    return d.toLocaleString();
  }
}

/**
 * Formats a number according to active locale (decimal and thousand separators)
 */
export function formatNumber(
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions
): string {
  if (typeof value !== 'number' || isNaN(value)) return '0';
  const targetLocale = locale || getActiveLocale();
  try {
    return new Intl.NumberFormat(targetLocale, options).format(value);
  } catch (e) {
    return value.toString();
  }
}

/**
 * Formats currency (e.g. R$ 29,90 or $29.90 or 29,90 €)
 */
export function formatCurrency(
  value: number,
  locale?: string,
  currencyCode?: string
): string {
  if (typeof value !== 'number' || isNaN(value)) return '0.00';
  const targetLocale = locale || getActiveLocale();
  const currency = currencyCode || CURRENCY_MAP[targetLocale] || CURRENCY_MAP[targetLocale.split('-')[0]] || 'USD';
  
  try {
    return new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch (e) {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Formats percentage
 */
export function formatPercent(
  value: number,
  locale?: string,
  fractionDigits = 0
): string {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  const targetLocale = locale || getActiveLocale();
  try {
    return new Intl.NumberFormat(targetLocale, {
      style: 'percent',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(value / 100);
  } catch (e) {
    return `${value}%`;
  }
}
