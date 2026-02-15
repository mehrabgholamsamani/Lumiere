import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { Product } from "../types";
import { PRODUCTS } from "../data/products";
import { clamp } from "../utils";
import { loadPersisted, savePersisted } from "./storage";
import { supabase } from "../lib/supabase";

type State = {
  products: Product[];
  cart: Record<string, number>;
  favorites: Record<string, true>;
  user: { id: string; email: string; name?: string } | null;
  ui: {
    cartOpen: boolean;
    activeProductId: string | null;
    toast: { id: string; message: string } | null;
  };
};

type Action =
  | { type: "cart/open"; open: boolean }
  | { type: "product/open"; id: string | null }
  | { type: "toast/show"; message: string }
  | { type: "toast/clear" }
  | { type: "cart/add"; id: string; qty?: number }
  | { type: "cart/setQty"; id: string; qty: number }
  | { type: "cart/remove"; id: string }
  | { type: "cart/clear" }
  | { type: "fav/toggle"; id: string }
  | { type: "fav/replace"; favorites: Record<string, true> }
  | { type: "auth/set"; user: { id: string; email: string; name?: string } | null }
  | { type: "auth/signOut" };

const StoreCtx = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
  actions: {
    toggleFavorite: (productId: string) => Promise<void>;
  };
  derived: {
    cartCount: number;
    cartSubtotalCents: number;
    favCount: number;
    findProduct: (id: string) => Product | undefined;
  };
} | null>(null);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "cart/open":
      return { ...state, ui: { ...state.ui, cartOpen: action.open } };
    case "product/open":
      return { ...state, ui: { ...state.ui, activeProductId: action.id } };
    case "toast/show": {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      return { ...state, ui: { ...state.ui, toast: { id, message: action.message } } };
    }
    case "toast/clear":
      return { ...state, ui: { ...state.ui, toast: null } };
    case "cart/add": {
      const current = state.cart[action.id] ?? 0;
      const add = clamp(action.qty ?? 1, 1, 99);
      return { ...state, cart: { ...state.cart, [action.id]: clamp(current + add, 1, 99) } };
    }
    case "cart/setQty": {
      const qty = clamp(action.qty, 1, 99);
      return { ...state, cart: { ...state.cart, [action.id]: qty } };
    }
    case "cart/remove": {
      const next = { ...state.cart };
      delete next[action.id];
      return { ...state, cart: next };
    }
    case "cart/clear":
      return { ...state, cart: {} };
    case "fav/toggle": {
      const next = { ...state.favorites };
      if (next[action.id]) delete next[action.id];
      else next[action.id] = true;
      return { ...state, favorites: next };
    }

    case "fav/replace":
      return { ...state, favorites: action.favorites };

    case "auth/set":
      return { ...state, user: action.user };
    case "auth/signOut":
      return { ...state, user: null };
    default:
      return state;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const persisted = typeof window !== "undefined" ? loadPersisted() : null;

  const [state, dispatch] = useReducer(reducer, {
    products: PRODUCTS,
    cart: persisted?.cart ?? {},
    favorites: persisted?.favorites ?? {},
    user: persisted?.user && (persisted.user as any).id ? (persisted.user as any) : null,
    ui: { cartOpen: false, activeProductId: null, toast: null },
  });

  const syncFavoritesForUser = async (userId: string) => {

    const localFavIds = Object.keys(state.favorites);
    if (localFavIds.length) {
      await supabase
        .from("favorites")
        .upsert(
          localFavIds.map((pid) => ({ user_id: userId, product_id: pid })),
          { onConflict: "user_id,product_id" }
        );
    }


    const { data, error } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", userId);

    if (error) throw error;
    const next: Record<string, true> = {};
    for (const row of data ?? []) next[row.product_id] = true;
    dispatch({ type: "fav/replace", favorites: next });
  };

  const toggleFavorite = async (productId: string) => {
    const currentlyFav = !!state.favorites[productId];


    dispatch({ type: "fav/toggle", id: productId });


    if (!state.user?.id) return;

    try {
      if (currentlyFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", state.user.id)
          .eq("product_id", productId);
        if (error) throw error;
        dispatch({ type: "toast/show", message: "Removed from favorites." });
      } else {
        const { error } = await supabase
          .from("favorites")
          .upsert({ user_id: state.user.id, product_id: productId }, { onConflict: "user_id,product_id" });
        if (error) throw error;
        dispatch({ type: "toast/show", message: "Saved to favorites." });
      }
    } catch {

      dispatch({ type: "fav/toggle", id: productId });
      dispatch({ type: "toast/show", message: "Could not update favorites. Try again." });
    }
  };


  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      const u = data.user;
      dispatch({
        type: "auth/set",
        user: u
          ? { id: u.id, email: u.email ?? "", name: (u.user_metadata as any)?.full_name ?? undefined }
          : null,
      });

      if (u) {
        syncFavoritesForUser(u.id).catch(() => {

        });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      dispatch({
        type: "auth/set",
        user: u
          ? { id: u.id, email: u.email ?? "", name: (u.user_metadata as any)?.full_name ?? undefined }
          : null,
      });

      if (u) {
        syncFavoritesForUser(u.id).catch(() => {

        });
      } else {

        dispatch({ type: "fav/replace", favorites: {} });
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);


  useEffect(() => {
    savePersisted({ cart: state.cart, favorites: state.favorites, user: state.user });
  }, [state.cart, state.favorites, state.user]);

  const derived = useMemo(() => {
    const cartCount = Object.values(state.cart).reduce((a, n) => a + n, 0);
    const favCount = Object.keys(state.favorites).length;
    const findProduct = (id: string) => state.products.find((p) => p.id === id);

    const cartSubtotalCents = Object.entries(state.cart).reduce((sum, [id, qty]) => {
      const p = findProduct(id);
      if (!p) return sum;
      return sum + p.priceCents * qty;
    }, 0);

    return { cartCount, cartSubtotalCents, favCount, findProduct, isAuthed: !!state.user };
  }, [state.cart, state.favorites, state.products]);

  return <StoreCtx.Provider value={{ state, dispatch, actions: { toggleFavorite }, derived }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}