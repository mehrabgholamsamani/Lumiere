// Compatibility adapter: preserves the existing UI calls while using Express/MongoDB.
import { authenticate, clearToken, request, type ApiUser } from "./api";

type UiUser = { id: string; email: string; user_metadata: { full_name?: string } };
const toUiUser = (user: ApiUser): UiUser => ({ id: user.id, email: user.email, user_metadata: user.name ? { full_name: user.name } : {} });
const listeners = new Set<(event: string, session: { user: UiUser } | null) => void>();
const emit = (event: string, user: ApiUser | null) => listeners.forEach((listener) => listener(event, user ? { user: toUiUser(user) } : null));
const ok = (data: any): any => ({ data, error: null });
const fail = (error: unknown): any => ({ data: null, error: error instanceof Error ? error : new Error("Request failed.") });

class Query {
  private filters: Record<string, string> = {};
  private action = "select";
  private payload: any;
  constructor(private table: string) {}
  select(_columns = "*") { if (this.action === "select") this.action = "select"; return this; }
  insert(payload: any) { this.action = "insert"; this.payload = payload; return this; }
  update(payload: any) { this.action = "update"; this.payload = payload; return this; }
  upsert(payload: any, _options?: any) { this.action = "upsert"; this.payload = payload; return this; }
  delete() { this.action = "delete"; return this; }
  eq(key: string, value: string) { this.filters[key] = value; return this; }
  order(_column: string, _options?: any) { return this; }
  maybeSingle() { return this.execute(true); }
  single() { return this.execute(true); }
  then<TResult1 = any, TResult2 = never>(resolve?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null, reject?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null) { return this.execute(false).then(resolve, reject); }
  private async execute(single: boolean): Promise<any> {
    try {
      const account = async () => request<any>("/account");
      let data: any = null;
      if (this.table === "newsletter_subscriptions" && this.action === "upsert") data = await request("/newsletter", { method: "POST", body: JSON.stringify(this.payload) });
      else if (this.table === "favorites") {
        const productId = this.filters.product_id || this.payload?.product_id;
        if (this.action === "select") data = (await account()).favorites.map((product_id: string) => ({ product_id }));
        else if (this.action === "delete") data = await request(`/account/favorites/${productId}`, { method: "DELETE" });
        else { for (const row of Array.isArray(this.payload) ? this.payload : [this.payload]) await request(`/account/favorites/${row.product_id}`, { method: "PUT" }); }
      } else if (this.table === "profiles") {
        const profile = (await account()).profile;
        if (this.action === "select") data = profile;
        else if (this.action === "insert" || this.action === "update") { const saved = await request<any>("/account/profile", { method: "PATCH", body: JSON.stringify({ full_name: this.payload.full_name }) }); data = { id: saved.user.id, full_name: saved.user.name || null }; }
      } else if (this.table === "addresses") {
        if (this.action === "select") data = (await account()).addresses;
        else if (this.action === "insert") data = await request("/account/addresses", { method: "POST", body: JSON.stringify(this.payload) });
        else if (this.action === "update") data = await request(`/account/addresses/${this.filters.id}`, { method: "PATCH", body: JSON.stringify(this.payload) });
        else if (this.action === "delete") data = await request(`/account/addresses/${this.filters.id}`, { method: "DELETE" });
      } else if (this.table === "orders") {
        if (this.action === "select") data = (await account()).orders;
        else if (this.action === "insert") data = await request("/orders", { method: "POST", body: JSON.stringify(this.payload) });
      } else if (this.table === "order_items" && this.action === "insert") {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        data = await request(`/orders/${items[0].order_id}/items`, { method: "POST", body: JSON.stringify({ items }) });
      } else throw new Error(`Unsupported API operation: ${this.table}.${this.action}`);
      return ok(single && Array.isArray(data) ? data[0] ?? null : data);
    } catch (error) { return fail(error); }
  }
}

export const supabase = {
  auth: {
    async getUser() { try { const { user } = await request<{ user: ApiUser }>("/auth/me"); return ok({ user: toUiUser(user) }); } catch (error) { return { data: { user: null }, error }; } },
    async signUp({ email, password, options }: any) { try { const user = await authenticate("/auth/register", { email, password, fullName: options?.data?.full_name }); emit("SIGNED_IN", user); return ok({ user: toUiUser(user), session: { user: toUiUser(user) } }); } catch (error) { return fail(error); } },
    async signInWithPassword({ email, password }: any) { try { const user = await authenticate("/auth/login", { email, password }); emit("SIGNED_IN", user); return ok({ user: toUiUser(user), session: { user: toUiUser(user) } }); } catch (error) { return fail(error); } },
    async signOut() { clearToken(); emit("SIGNED_OUT", null); return { error: null }; },
    onAuthStateChange(listener: (event: string, session: { user: UiUser } | null) => void) { listeners.add(listener); return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } }; },
  },
  from(table: string) { return new Query(table); },
};
