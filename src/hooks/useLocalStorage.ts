import { useState, useEffect } from 'react';
import { safeGet, safeSet } from '../lib/storage';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = safeGet(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      safeSet(key, JSON.stringify(storedValue));
    } catch (error) {
      // Handled inside safeSet
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

