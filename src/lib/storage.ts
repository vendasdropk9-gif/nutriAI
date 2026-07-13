export const safeGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

export const safeSet = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {}
};

export const safeRemove = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch (e) {}
};
