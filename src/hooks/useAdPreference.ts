import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';

export type AdFormat = 'video' | 'banner';

export const useAdPreference = (
  profile: UserProfile | null,
  defaultFormat: AdFormat = 'banner'
) => {
  const resolvePreferredFormat = useCallback((): AdFormat => {
    if (profile?.defaultAdFormat === 'video' || profile?.defaultAdFormat === 'banner') {
      return profile.defaultAdFormat;
    }
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nutri_ad_format_preference');
        if (stored === 'video' || stored === 'banner') {
          return stored;
        }
      }
    } catch {
      // Ignore storage access errors
    }
    return defaultFormat;
  }, [profile?.defaultAdFormat, defaultFormat]);

  const [format, setFormat] = useState<AdFormat>(resolvePreferredFormat);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setFormat(resolvePreferredFormat());
    setInitialized(true);
  }, [resolvePreferredFormat]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePrefChange = (e: Event) => {
      const mode = (e as CustomEvent)?.detail?.mode;
      if (mode === 'video' || mode === 'banner') {
        setFormat(mode);
      }
    };
    window.addEventListener('nutri-ad-preference-changed', handlePrefChange);
    return () => window.removeEventListener('nutri-ad-preference-changed', handlePrefChange);
  }, []);

  const updateFormat = useCallback((newFormat: AdFormat) => {
    setFormat(newFormat);
    try {
      localStorage.setItem('nutri_ad_format_preference', newFormat);
      window.dispatchEvent(new CustomEvent('nutri-ad-preference-changed', { detail: { mode: newFormat } }));
    } catch {
      // Ignore storage access errors
    }
  }, []);

  return { format, updateFormat, initialized, isVideoMode: format === 'video' };
};
