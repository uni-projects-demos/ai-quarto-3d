export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveStorage(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {}
}
