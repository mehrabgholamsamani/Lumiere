import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/StoreContext";
import type { Product } from "../types";

type ProfileRow = {
  id: string;
  full_name: string | null;
  created_at?: string;
};

type AddressRow = {
  id: string;
  user_id: string;
  label: string;
  is_default_shipping: boolean;
  is_default_billing: boolean;
  full_name: string | null;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string;
  region: string | null;
  country: string;
  created_at?: string;
  updated_at?: string;
};

type OrderRow = {
  id: string;
  created_at: string;
  total_cents: number;
  status: string;
};

function eur(cents: number) {
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function clampStr(v: string) {
  return v.trim().replace(/\s+/g, " ");
}


function Skel({ className, style }: { className: string; style?: CSSProperties }) {
  return <div className={"skeleton " + className} style={style} aria-hidden />;
}

function TabSkeleton({ tab }: { tab: "PROFILE" | "ADDRESSES" | "FAVORITES" | "ORDERS" }) {
  if (tab === "PROFILE") {
    return (
      <div className="accForm" style={{ maxWidth: 560 }}>
        <Skel className="skelLine" style={{ width: 120 }} />
        <Skel className="skelLine" style={{ height: 44 }} />
        <Skel className="skelLine" style={{ width: 70, marginTop: 8 }} />
        <Skel className="skelLine" style={{ height: 44 }} />
        <Skel className="skelBtn" style={{ marginTop: 8 }} />
      </div>
    );
  }

  if (tab === "ADDRESSES") {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div className="skelCard">
          <Skel className="skelLine" style={{ width: 160 }} />
          <Skel className="skelLine sm" style={{ width: 260 }} />
        </div>
        <div className="skelCard">
          <Skel className="skelLine" style={{ width: 140 }} />
          <Skel className="skelLine sm" style={{ width: 320 }} />
        </div>
        <div className="accCard" style={{ padding: 14 }}>
          <Skel className="skelLine" style={{ width: 120, marginBottom: 10 }} />
          <div className="accForm" style={{ maxWidth: 640 }}>
            <Skel className="skelLine" style={{ height: 44 }} />
            <Skel className="skelLine" style={{ height: 44 }} />
            <Skel className="skelBtn" />
          </div>
        </div>
      </div>
    );
  }

  const rows = [0, 1, 2];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((r) => (
        <div key={r} className="accProfile" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Skel className="skelThumb" />
            <div style={{ display: "grid", gap: 8 }}>
              <Skel className="skelLine" style={{ width: 220 }} />
              <Skel className="skelLine sm" style={{ width: 120 }} />
            </div>
          </div>
          <Skel className="skelLine" style={{ width: 90 }} />
        </div>
      ))}
    </div>
  );
}

export function UserPage({ onBackToShop }: { onBackToShop: () => void }) {
  const { state, dispatch } = useStore();
  const user = state.user;

  const rootRef = useRef<HTMLDivElement | null>(null);

  const [tab, setTab] = useState<"PROFILE" | "ADDRESSES" | "FAVORITES" | "ORDERS">("PROFILE");
  const [loading, setLoading] = useState(true);


  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState("");


  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [editing, setEditing] = useState<AddressRow | null>(null);
  const [addrDraft, setAddrDraft] = useState<Partial<AddressRow>>({
    label: "Home",
    country: "Finland",
    is_default_shipping: true,
    is_default_billing: false,
  });


  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of state.products) map.set(p.id, p);
    return map;
  }, [state.products]);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".accCard", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" });
      gsap.fromTo(".accTabs .accTab", { y: 6, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.04, duration: 0.4, delay: 0.1 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        setLoading(true);


        const uid = user.id;

        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, created_at")
          .eq("id", uid)
          .maybeSingle();

        if (pErr) throw pErr;

        if (!p) {
          const { data: inserted, error: insErr } = await supabase
            .from("profiles")
            .insert({ id: uid, full_name: user.name ?? null })
            .select("id, full_name, created_at")
            .single();

          if (insErr) throw insErr;

          setProfile(inserted as any);
          setFullName(inserted.full_name ?? "");
        } else {
          setProfile(p as any);
          setFullName(p.full_name ?? user.name ?? "");
        }


        const { data: a, error: aErr } = await supabase
          .from("addresses")
          .select("*")
          .order("created_at", { ascending: false });

        if (aErr) throw aErr;
        setAddresses((a ?? []) as any);


        const { data: f, error: fErr } = await supabase
          .from("favorites")
          .select("product_id")
          .order("created_at", { ascending: false });

        if (fErr) throw fErr;
        setFavoriteIds((f ?? []).map((x: any) => x.product_id));


        const { data: o, error: oErr } = await supabase
          .from("orders")
          .select("id, created_at, total_cents, status")
          .order("created_at", { ascending: false });

        if (oErr) throw oErr;
        setOrders((o ?? []) as any);
      } catch (e: any) {
        dispatch({ type: "toast/show", message: e?.message ?? "Failed to load account data." });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, dispatch]);

  const signedIn = !!user;

  const favProducts = useMemo(() => {
    return favoriteIds
      .map((id) => productsById.get(id))
      .filter(Boolean) as Product[];
  }, [favoriteIds, productsById]);

  const startNewAddress = () => {
    setEditing(null);
    setAddrDraft({
      label: "Home",
      country: "Finland",
      is_default_shipping: addresses.length === 0,
      is_default_billing: false,
    });
    setTab("ADDRESSES");
  };

  const startEditAddress = (a: AddressRow) => {
    setEditing(a);
    setAddrDraft({ ...a });
    setTab("ADDRESSES");
  };

  const reloadAddresses = async () => {
    const { data } = await supabase.from("addresses").select("*").order("created_at", { ascending: false });
    setAddresses((data ?? []) as any);
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      const nextName = clampStr(fullName);
      const { error } = await supabase.from("profiles").update({ full_name: nextName || null }).eq("id", user.id);
      if (error) throw error;

      setProfile((p) => (p ? { ...p, full_name: nextName || null } : p));
      dispatch({ type: "auth/set", user: { ...user, name: nextName || user.name } });
      dispatch({ type: "toast/show", message: "Profile saved ✅" });
      gsap.fromTo(".jsSaveProfile",{ scale: 1 },{ scale: 1.02, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" });
    } catch (e: any) {
      dispatch({ type: "toast/show", message: e?.message ?? "Failed to save profile." });
    }
  };

  const saveAddress = async () => {
    if (!user) return;
    try {
      const d = addrDraft;

      if (!d.line1 || !d.city || !d.postal_code || !d.country) {
        dispatch({ type: "toast/show", message: "Please fill address line, city, postal code, country." });
        return;
      }

      const payload = {
        label: (d.label ?? "Home").trim() || "Home",
        full_name: d.full_name ? clampStr(d.full_name) : null,
        line1: clampStr(d.line1),
        line2: d.line2 ? clampStr(d.line2) : null,
        city: clampStr(d.city),
        postal_code: clampStr(d.postal_code),
        region: d.region ? clampStr(d.region) : null,
        country: clampStr(d.country),
        is_default_shipping: !!d.is_default_shipping,
        is_default_billing: !!d.is_default_billing,
      };

      if (editing) {
        const { error } = await supabase.from("addresses").update(payload).eq("id", editing.id);
        if (error) throw error;
        dispatch({ type: "toast/show", message: "Address updated ✅" });
        gsap.fromTo(".jsSaveAddress",{ scale: 1 },{ scale: 1.02, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" });
      } else {
        const { error } = await supabase.from("addresses").insert({ ...payload, user_id: user.id });
        if (error) throw error;
        dispatch({ type: "toast/show", message: "Address saved ✅" });
        gsap.fromTo(".jsSaveAddress",{ scale: 1 },{ scale: 1.02, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" });
      }


      if (payload.is_default_shipping || payload.is_default_billing) {
        await reloadAddresses();
      } else {
        await reloadAddresses();
      }

      setEditing(null);
      setAddrDraft({ label: "Home", country: "Finland", is_default_shipping: false, is_default_billing: false });
    } catch (e: any) {
      dispatch({ type: "toast/show", message: e?.message ?? "Failed to save address." });
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
      setAddresses((prev) => prev.filter((x) => x.id !== id));
      dispatch({ type: "toast/show", message: "Address deleted." });
    } catch (e: any) {
      dispatch({ type: "toast/show", message: e?.message ?? "Failed to delete address." });
    }
  };

  if (!signedIn) {
    return (
      <div className="accWrap">
        <div className="accCard">
          <h1 className="pageTitle">Sign in required</h1>
          <div className="muted">Please sign in to view your account.</div>
          <div style={{ marginTop: 14 }}>
            <button className="btnOutline" onClick={onBackToShop} type="button">
              Back to shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="accWrap">
      <div className="crumbs muted small">Home / Your account</div>

      <div className="accCard" style={{ marginTop: 10 }}>
        <div className="accTopRow">
          <h1 className="pageTitle" style={{ marginBottom: 6 }}>
            Your account
          </h1>
          <div className="accTabs">
            <button className={"accTab " + (tab === "PROFILE" ? "active" : "")} onClick={() => setTab("PROFILE")} type="button">
              Profile
            </button>
            <button className={"accTab " + (tab === "ADDRESSES" ? "active" : "")} onClick={() => setTab("ADDRESSES")} type="button">
              Addresses
            </button>
            <button className={"accTab " + (tab === "FAVORITES" ? "active" : "")} onClick={() => setTab("FAVORITES")} type="button">
              Favorites
            </button>
            <button className={"accTab " + (tab === "ORDERS" ? "active" : "")} onClick={() => setTab("ORDERS")} type="button">
              Orders
            </button>
          </div>
        </div>

        {loading ? (
          <TabSkeleton tab={tab} />
        ) : tab === "PROFILE" ? (
          <div className="accForm" style={{ maxWidth: 560 }}>
            <label className="field">
              <span>Full name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </label>

            <label className="field">
              <span>Email</span>
              <input value={user.email} disabled />
            </label>

            <button className="btnPrimary wide jsSaveProfile" type="button" onClick={saveProfile}>
              Save profile
            </button>

                      </div>
        ) : tab === "ADDRESSES" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <div className="muted">Shipping & billing details.</div>
              <button className="btnOutline" onClick={startNewAddress} type="button">
                + New address
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              {addresses.length === 0 ? (
                <div className="muted">No addresses yet.</div>
              ) : (
                addresses.map((a) => (
                  <div key={a.id} className="accProfile" style={{ justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.label}</div>
                      <div className="muted small">
                        {(a.full_name ?? user.name ?? "—")} · {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}, {a.postal_code} {a.city}
                        {a.region ? `, ${a.region}` : ""}, {a.country}
                      </div>
                      <div className="muted small">
                        {a.is_default_shipping ? "Default shipping" : ""}
                        {a.is_default_shipping && a.is_default_billing ? " · " : ""}
                        {a.is_default_billing ? "Default billing" : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btnOutline" onClick={() => startEditAddress(a)} type="button">
                        Edit
                      </button>
                      <button className="btnPrimary" onClick={() => deleteAddress(a.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="accCard" style={{ padding: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{editing ? "Edit address" : "Add address"}</div>

              <div className="accForm" style={{ maxWidth: 640 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label className="field">
                    <span>Label</span>
                    <input value={addrDraft.label ?? ""} onChange={(e) => setAddrDraft((p) => ({ ...p, label: e.target.value }))} />
                  </label>

                  <label className="field">
                    <span>Full name</span>
                    <input value={addrDraft.full_name ?? ""} onChange={(e) => setAddrDraft((p) => ({ ...p, full_name: e.target.value }))} />
                  </label>
                </div>

                <label className="field">
                  <span>Address line 1</span>
                  <input value={addrDraft.line1 ?? ""} onChange={(e) => setAddrDraft((p) => ({ ...p, line1: e.target.value }))} />
                </label>

                <label className="field">
                  <span>Address line 2</span>
                  <input value={addrDraft.line2 ?? ""} onChange={(e) => setAddrDraft((p) => ({ ...p, line2: e.target.value }))} />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label className="field">
                    <span>City</span>
                    <input value={addrDraft.city ?? ""} onChange={(e) => setAddrDraft((p) => ({ ...p, city: e.target.value }))} />
                  </label>

                  <label className="field">
                    <span>Postal code</span>
                    <input value={addrDraft.postal_code ?? ""} onChange={(e) => setAddrDraft((p) => ({ ...p, postal_code: e.target.value }))} />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label className="field">
                    <span>Region</span>
                    <input value={addrDraft.region ?? ""} onChange={(e) => setAddrDraft((p) => ({ ...p, region: e.target.value }))} />
                  </label>

                  <label className="field">
                    <span>Country</span>
                    <input value={addrDraft.country ?? ""} onChange={(e) => setAddrDraft((p) => ({ ...p, country: e.target.value }))} />
                  </label>
                </div>

                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <label className="muted small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!addrDraft.is_default_shipping}
                      onChange={(e) => setAddrDraft((p) => ({ ...p, is_default_shipping: e.target.checked }))}
                    />
                    Default shipping
                  </label>

                  <label className="muted small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!addrDraft.is_default_billing}
                      onChange={(e) => setAddrDraft((p) => ({ ...p, is_default_billing: e.target.checked }))}
                    />
                    Default billing
                  </label>
                </div>

                <button className="btnPrimary wide jsSaveAddress" type="button" onClick={saveAddress}>
                  {editing ? "Save changes" : "Save address"}
                </button>
                              </div>
            </div>
          </div>
        ) : tab === "FAVORITES" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {favProducts.length === 0 ? (
              <div className="muted">No favorites yet.</div>
            ) : (
              favProducts.map((p) => (
                <div key={p.id} className="accProfile" style={{ justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div className="thumbMini" aria-hidden />
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="muted small">{eur(p.priceCents)}</div>
                    </div>
                  </div>
                                  </div>
              ))
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {orders.length === 0 ? (
              <div className="muted">No orders yet.</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="accProfile" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Order {o.id.slice(0, 8).toUpperCase()}</div>
                    <div className="muted small">
                      {new Date(o.created_at).toLocaleString()} · {o.status}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600 }}>{eur(o.total_cents)}</div>
                </div>
              ))
            )}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <button className="btnOutline" onClick={onBackToShop} type="button">
            Continue shopping
          </button>
        </div>
      </div>
    </div>
  );
}