export function formatPrice(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString(undefined, { style: "currency", currency: "EUR" });
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}