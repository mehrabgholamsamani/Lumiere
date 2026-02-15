import React, { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useStore } from "../store/StoreContext";
import { Icon } from "./Icon";

export type PageKey =
  | "HOME"
  | "HIGH JEWELLERY"
  | "JEWELLERY"
  | "RINGS"
  | "NECKLACES"
  | "GIFTS"
  | "ABOUT"
  | "CHECKOUT"
  | "OUR STORY"
  | "RESPONSIBILITY"
  | "LUMIÈRE FINLAND"
  | "ENCHANTING TREASURE"
  | "VISITOR CENTER"
  | "CONTACT"
  | "TERMS OF USE"
  | "PRIVACY STATEMENT"
  | "TERMS OF DELIVERY"
  | "RETURN INSTRUCTIONS"
  | "JEWELRY MAINTENANCE"
  | "ACCOUNT"
  | "USER";

type Props = {
  query: string;
  setQuery: (v: string) => void;
  sortMode: string;
  setSortMode: (v: string) => void;
  activePage: PageKey;
  setActivePage: (p: PageKey) => void;
};

const navLinks: PageKey[] = ["HIGH JEWELLERY", "JEWELLERY", "RINGS", "NECKLACES", "GIFTS", "ABOUT"];
const sortModes = ["Featured", "Price: Low → High", "Price: High → Low", "Rating"] as const;

export function Header({ query, setQuery, sortMode, setSortMode, activePage, setActivePage }: Props) {
  const { derived } = useStore();
  const logoRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  React.useEffect(() => {
    if (searchOpen) {

      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [searchOpen]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "TIMELESS GEOMETRY";
    if (h < 18) return "QUIET SHINE";
    return "EVENING SPARKLE";
  }, []);

  return (
    <header className="header">
      <div className="topBar">
        <div className="topSlot left">
          <button className="iconTop" onClick={() => setActivePage("HOME")} aria-label="Saved">
            <Icon name="heart" width={18} height={18} />
          </button>
        </div>

        <div
          ref={logoRef}
          className="brand"
          onClick={() => setActivePage("HOME")}
          onMouseEnter={() => {
            if (!logoRef.current) return;
            gsap.fromTo(logoRef.current, { y: 0 }, { y: -2, yoyo: true, repeat: 3, duration: 0.08 });
          }}
          role="button"
          tabIndex={0}
        >
          <div className="brandName">LUMIÈRE</div>
          <div className="brandTag">{greeting}</div>
        </div>

        <div className="topSlot right">
          <button
            className={"iconTop " + (searchOpen ? "active" : "")}
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
          >
            <Icon name="search" width={18} height={18} />
          </button>

          <button
            className="iconTop"
            onClick={() => setActivePage(derived.isAuthed ? "USER" : "ACCOUNT")}
            aria-label="Account"
          >
            <Icon name="user" width={18} height={18} />
          </button>

          <button className="iconTop" onClick={() => window.dispatchEvent(new CustomEvent("open-cart"))} aria-label="Cart">
            <Icon name="bag" width={18} height={18} />
            {derived.cartCount > 0 && <span className="dotBadge">{derived.cartCount}</span>}
          </button>
        </div>
      </div>

      <nav className="navBar" aria-label="Main navigation">
        {navLinks.map((t) => (
          <a
            key={t}
            href="#"
            className={activePage === t ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              setActivePage(t);
            }}
          >
            {t}
          </a>
        ))}
      </nav>

      <div className={"subBar " + (searchOpen ? "open" : "")}>
        <div className="subInner">
          <div className="searchWide" role="search">
            <Icon name="search" width={18} height={18} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: ring, pearl, gold…"
              aria-label="Search products"
            />
            {query.trim().length > 0 && (
              <button className="clearSearch" onClick={() => setQuery("")} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          <div className="sortBlock">
            <span className="muted small">Sort by</span>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
              {sortModes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}