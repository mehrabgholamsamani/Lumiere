const KEY = "gleam_store_v1";

export type PersistedState = {
  cart: Record<string, number>;
  favorites: Record<string, true>;

  user?: { id?: string; email: string; name?: string } | null;
};

export function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.cart || !parsed.favorites) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePersisted(state: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {

  }
}