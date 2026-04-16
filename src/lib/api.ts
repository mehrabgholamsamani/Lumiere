const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "lumiere_auth_token";
const ADMIN_TOKEN_KEY = "lumiere_admin_access_token";

export type ApiUser = { id: string; email: string; name?: string };
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(ADMIN_TOKEN_KEY); }
export function getAdminToken() { return sessionStorage.getItem(ADMIN_TOKEN_KEY); }
export function setAdminToken(token: string) { sessionStorage.setItem(ADMIN_TOKEN_KEY, token); }
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...(getAdminToken() ? { "X-Admin-Access": getAdminToken()! } : {}), ...options.headers },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || "Request failed.");
  return body as T;
}
export async function authenticate(path: "/auth/login" | "/auth/register", body: unknown) {
  const data = await request<{ token: string; user: ApiUser }>(path, { method: "POST", body: JSON.stringify(body) });
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.user;
}
