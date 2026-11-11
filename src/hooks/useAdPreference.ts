import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';

export type AdFormat = 'video' | 'banner';

export const useAdPreference = (profile: UserProfile | null) => {
  const [format, setFormat] = useState<AdFormat>(profile?.defaultAdFormat || (localStorage.getItem('nutri_ad_format_preference') as AdFormat) || 'banner');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // If profile has a preference, prioritize it
    if (profile?.defaultAdFormat) {
      setFormat(profile.defaultAdFormat);
    } else {
      const stored = localStorage.getItem('nutri_ad_format_preference');
      if (stored === 'video' || stored === 'banner') {
        setFormat(stored as AdFormat);
      }
    }
    setInitialized(true);
  }, [profile?.defaultAdFormat]);

  const updateFormat = useCallback((newFormat: AdFormat) => {
    setFormat(newFormat);
    localStorage.setItem('nutri_ad_format_preference', newFormat);
    // Note: The profile update itself must be handled by the caller (Profile component)
    window.dispatchEvent(new CustomEvent('nutri-ad-preference-changed', { detail: { mode: newFormat } }));
  }, []);

  return { format, updateFormat, initialized, isVideoMode: format === 'video' };
};
