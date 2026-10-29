import { useState, useEffect, useRef } from 'react';
import { safeGet, safeSet } from '../lib/storage';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const isMountedRef = useRef(false);

  // Read stored value on client after initial hydration mount
  useEffect(() => {
    try {
      const item = safeGet(key);
      if (item !== null && item !== undefined) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      // Gracefully handle parsing errors
    }
  }, [key]);

  // Sync state changes back to localStorage
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    try {
      safeSet(key, JSON.stringify(storedValue));
    } catch (error) {
      // Handled inside safeSet
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
