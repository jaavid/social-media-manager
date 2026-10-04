/** Browser-only persistence belongs here, not in feature components. */
export function getBrowserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
export const persistentStorage = {
  getItem(key: string): string | null {
    return getBrowserStorage()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string): void {
    getBrowserStorage()?.setItem(key, value);
  },
  removeItem(key: string): void {
    getBrowserStorage()?.removeItem(key);
  },
};

export function getSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
export const transientStorage = {
  getItem(key: string): string | null {
    return getSessionStorage()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string): void {
    getSessionStorage()?.setItem(key, value);
  },
  removeItem(key: string): void {
    getSessionStorage()?.removeItem(key);
  },
};
