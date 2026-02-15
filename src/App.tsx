import { useCallback, useEffect, useMemo, useState } from "react";
import { StoreProvider, useStore } from "./store/StoreContext";
import type { Product, SortMode, Brand, Collection, GemShape, MaterialGroup } from "./types";
import { Header, type PageKey } from "./components/Header";
import { ProductCard } from "./components/ProductCard";
import { CartDrawer } from "./components/CartDrawer";
import { ProductModal } from "./components/ProductModal";
import { Toast } from "./components/Toast";
import { FiltersPanel, type FiltersState } from "./components/FiltersPanel";
import { Footer } from "./components/Footer";
import { Pagination } from "./components/Pagination";
import { CheckoutPage } from "./components/CheckoutPage";
import { LandingPage } from "./components/LandingPage";
import { AboutPage } from "./components/AboutPage";
import { AccountPage } from "./components/AccountPage";
import { UserPage } from "./components/UserPage";
import { InfoPage } from "./components/InfoPage";

const categoryChips = ["Rings", "Earrings", "Necklaces", "Bracelets", "High Jewellery", "Gifts"] as const;

function applyQuery(items: Product[], q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return items;
  return items.filter((p) => {
    const hay = `${p.name} ${p.category} ${p.material} ${p.gemstones} ${p.description} ${p.brand} ${p.collection}`.toLowerCase();
    return hay.includes(query);
  });
}

function applySort(items: Product[], mode: SortMode) {
  const arr = [...items];
  switch (mode) {
    case "Price: Low → High":
      arr.sort((a, b) => a.priceCents - b.priceCents);
      break;
    case "Price: High → Low":
      arr.sort((a, b) => b.priceCents - a.priceCents);
      break;
    case "Rating":
      arr.sort((a, b) => b.rating - a.rating);
      break;
    default:
      arr.sort((a, b) => {
        const rank = (p: Product) => (p.badge ? 1 : 0);
        const d = rank(b) - rank(a);
        if (d !== 0) return d;
        return b.rating - a.rating;
      });
  }
  return arr;
}

function pageToTitle(p: PageKey): string {
  switch (p) {
    case "RINGS":
      return "Rings";
    case "NECKLACES":
      return "Necklaces";
    case "HIGH JEWELLERY":
      return "High Jewellery";
    case "GIFTS":
      return "Gifts";
    case "ABOUT":
      return "About";
    case "CHECKOUT":
      return "Checkout";
    case "HOME":
      return "Home";
    case "JEWELRY MAINTENANCE":
      return "Jewelry maintenance";
    case "RETURN INSTRUCTIONS":
      return "Return instructions";
    case "TERMS OF DELIVERY":
      return "Terms of delivery";
    case "PRIVACY STATEMENT":
      return "Privacy statement";
    case "TERMS OF USE":
      return "Terms of use";
    case "CONTACT":
      return "Contact";
    case "VISITOR CENTER":
      return "Visitor Center";
    case "ENCHANTING TREASURE":
      return "Enchanting Treasure";
    case "LUMIÈRE FINLAND":
      return "Lumière Finland";
    case "RESPONSIBILITY":
      return "Responsibility";
    case "OUR STORY":
      return "Our story";
    default:
      return "Finnish Jewelry";
  }
}

function isInfoPage(p: PageKey) {
  return (
    p === "OUR STORY" ||
    p === "RESPONSIBILITY" ||
    p === "LUMIÈRE FINLAND" ||
    p === "ENCHANTING TREASURE" ||
    p === "VISITOR CENTER" ||
    p === "CONTACT" ||
    p === "TERMS OF USE" ||
    p === "PRIVACY STATEMENT" ||
    p === "TERMS OF DELIVERY" ||
    p === "RETURN INSTRUCTIONS" ||
    p === "JEWELRY MAINTENANCE"
  );
}

function filterByPage(items: Product[], page: PageKey): Product[] {
  switch (page) {
    case "RINGS":
      return items.filter((p) => p.category === "Rings");
    case "NECKLACES":
      return items.filter((p) => p.category === "Necklaces");
    case "HIGH JEWELLERY":
      return items.filter((p) => p.category === "High Jewellery");
    case "GIFTS":
      return items.filter((p) => p.category === "Gifts");
    case "JEWELLERY":
      return items.filter((p) => ["Rings", "Necklaces", "Earrings", "Bracelets"].includes(p.category));
    case "ABOUT":
      return [];
    case "CHECKOUT":
      return [];
    case "ACCOUNT":
      return [];
    case "HOME":
      return [];
    default:
      return items;
  }
}

function applyFilters(items: Product[], f: FiltersState): Product[] {
  return items.filter((p) => {
    const euros = Math.round(p.priceCents / 100);
    if (euros < f.priceMin || euros > f.priceMax) return false;

    if (f.brands.size > 0 && !f.brands.has(p.brand as Brand)) return false;
    if (f.collections.size > 0 && !f.collections.has(p.collection as Collection)) return false;
    if (f.gemShapes.size > 0 && !f.gemShapes.has(p.gemShape as GemShape)) return false;
    if (f.materials.size > 0 && !f.materials.has(p.materialGroup as MaterialGroup)) return false;

    return true;
  });
}

export function formatEUR(cents: number) {
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function Screen() {
  const { state, dispatch } = useStore();

  const [activePage, setActivePage] = useState<PageKey>("HOME");
  const [query, setQuery] = useState("");

  const setQuerySmart = useCallback(
    (v: string) => {
      setQuery(v);

      if (v.trim() && (activePage === "HOME" || activePage === "ABOUT")) {
        setActivePage("JEWELLERY");
      }
    },
    [activePage]
  );
  const [sortMode, setSortMode] = useState<SortMode>("Featured");

  const priceBounds = useMemo(() => {
    const euros = state.products.map((p) => Math.round(p.priceCents / 100));
    return { min: Math.min(...euros), max: Math.max(...euros) };
  }, [state.products]);

  const [filters, setFilters] = useState<FiltersState>({
    priceMin: 0,
    priceMax: 99999,
    brands: new Set(),
    collections: new Set(),
    gemShapes: new Set(),
    materials: new Set(),
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, priceMin: priceBounds.min, priceMax: priceBounds.max }));
  }, [priceBounds.min, priceBounds.max]);

  const pageSize = 24;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [query, sortMode, activePage, filters.priceMin, filters.priceMax, filters.brands, filters.collections, filters.gemShapes, filters.materials]);

  useEffect(() => {
    const fn = () => dispatch({ type: "cart/open", open: true });
    window.addEventListener("open-cart", fn as any);
    return () => window.removeEventListener("open-cart", fn as any);
  }, [dispatch]);

  useEffect(() => {
    const fn = () => setActivePage("CHECKOUT");
    window.addEventListener("go-checkout", fn as any);
    return () => window.removeEventListener("go-checkout", fn as any);
  }, []);

  const filtered = useMemo(() => {
    let items: Product[] = state.products;
    items = filterByPage(items, activePage);
    items = applyQuery(items, query);
    items = applyFilters(items, filters);
    items = applySort(items, sortMode);
    return items;
  }, [state.products, activePage, query, filters, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  const title = pageToTitle(activePage);

  return (
    <div className="app light">
      <Header
        query={query}
        setQuery={setQuerySmart}
        sortMode={sortMode}
        setSortMode={(v) => setSortMode(v as SortMode)}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="page">
        {activePage === "CHECKOUT" ? (
          <CheckoutPage onBackToShop={() => setActivePage("JEWELLERY")} />
        ) : activePage === "USER" ? (
          <UserPage onBackToShop={() => setActivePage("JEWELLERY")} />
        ) : activePage === "ACCOUNT" ? (
          <AccountPage onBackToShop={() => setActivePage("JEWELLERY")} />
        ) : activePage === "HOME" ? (
          <LandingPage onShop={() => setActivePage("JEWELLERY")} onGoHigh={() => setActivePage("HIGH JEWELLERY")} onNavigate={(p) => setActivePage(p)} />
        ) : activePage === "ABOUT" ? (
          <AboutPage onShop={() => setActivePage("JEWELLERY")} onGifts={() => setActivePage("GIFTS")} />
        ) : isInfoPage(activePage) ? (
          <InfoPage
            page={activePage as any}
            onShop={() => setActivePage("JEWELLERY")}
            onGifts={() => setActivePage("GIFTS")}
            onContact={() => setActivePage("CONTACT")}
          />
        ) : (
          <>
            <div className="crumbs muted small">Home / {title}</div>

            <div className="titleRow">
              <h1 className="pageTitle">{title}</h1>
              <div className="muted small">{filtered.length} products</div>
            </div>

            <div className="chipRow" aria-label="Category chips">
              {categoryChips.map((c) => (
                <button
                  key={c}
                  className="chipBtn"
                  onClick={() => {
                    if (c === "Rings") setActivePage("RINGS");
                    else if (c === "Necklaces") setActivePage("NECKLACES");
                    else if (c === "High Jewellery") setActivePage("HIGH JEWELLERY");
                    else if (c === "Gifts") setActivePage("GIFTS");
                    else setActivePage("JEWELLERY");
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="layout">
              <FiltersPanel filters={filters} setFilters={setFilters} priceBounds={priceBounds} />

              <section className="gridWrap" aria-label="Products grid">
                <div className="grid">
                  {paged.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  totalItems={filtered.length}
                  pageSize={pageSize}
                  onChange={setPage}
                />
              </section>
            </div>
          </>
        )}

        <Footer onNavigate={(page) => setActivePage(page as any)} />
      </main>

      <CartDrawer />
      <ProductModal />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Screen />
    </StoreProvider>
  );
}
