import React, { useState } from "react";
import type { Brand, Collection, GemShape, MaterialGroup } from "../types";

type SectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="filterSection">
      <button className="filterHeader" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>{title}</span>
        <span className={"chev " + (open ? "up" : "")} aria-hidden>
          ^
        </span>
      </button>
      {open && <div className="filterBody">{children}</div>}
    </div>
  );
}

export type FiltersState = {
  priceMin: number;
  priceMax: number;
  brands: Set<Brand>;
  collections: Set<Collection>;
  gemShapes: Set<GemShape>;
  materials: Set<MaterialGroup>;
};

type Props = {
  filters: FiltersState;
  setFilters: (next: FiltersState) => void;
  priceBounds: { min: number; max: number };
};

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function FiltersPanel({ filters, setFilters, priceBounds }: Props) {
  const [showMore, setShowMore] = useState(false);

  const setMin = (v: number) => setFilters({ ...filters, priceMin: v });
  const setMax = (v: number) => setFilters({ ...filters, priceMax: v });

  return (
    <aside className="filters" aria-label="Filters">
      <div className="filtersTitle">Filters</div>

      <Section title="Price">
        <div className="priceRow">
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            value={filters.priceMin}
            onChange={(e) => setMin(Number(e.target.value))}
            aria-label="Min price"
          />
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            value={filters.priceMax}
            onChange={(e) => setMax(Number(e.target.value))}
            aria-label="Max price"
          />
        </div>
        <div className="priceInputs">
          <div className="priceBox">
            <span className="cur">€</span>
            <input
              value={filters.priceMin}
              onChange={(e) => setMin(Number(e.target.value || priceBounds.min))}
              inputMode="numeric"
            />
          </div>
          <span className="to">to</span>
          <div className="priceBox">
            <span className="cur">€</span>
            <input
              value={filters.priceMax}
              onChange={(e) => setMax(Number(e.target.value || priceBounds.max))}
              inputMode="numeric"
            />
          </div>
        </div>
        <div className="muted small">
          Selected: {filters.priceMin} — {filters.priceMax}
        </div>
      </Section>

      <Section title="Brand">
        <div className="check">
          {(["Kalevala", "Lumoava", "Lapponia", "Lumière"] as const).map((b) => (
            <label key={b}>
              <input
                type="checkbox"
                checked={filters.brands.has(b)}
                onChange={() => setFilters({ ...filters, brands: toggleSet(filters.brands, b) })}
              />
              {b}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Collection">
        <div className="check">
          {(["Modern", "Originals", "Limited drops", "Heritage", "Signature", "Gift Sets"] as const).map((c) => (
            <label key={c}>
              <input
                type="checkbox"
                checked={filters.collections.has(c)}
                onChange={() => setFilters({ ...filters, collections: toggleSet(filters.collections, c) })}
              />
              {c}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Diamond / Gemstone Shape">
        <div className="check">
          {(["Round", "Oval", "Pear", "Emerald", "Marquise"] as const).map((s) => (
            <label key={s}>
              <input
                type="checkbox"
                checked={filters.gemShapes.has(s)}
                onChange={() => setFilters({ ...filters, gemShapes: toggleSet(filters.gemShapes, s) })}
              />
              {s}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Jewelry Material" defaultOpen={showMore}>
        <div className="check">
          {(["Silver", "Gold", "Vermeil", "Mixed"] as const).map((m) => (
            <label key={m}>
              <input
                type="checkbox"
                checked={filters.materials.has(m)}
                onChange={() => setFilters({ ...filters, materials: toggleSet(filters.materials, m) })}
              />
              {m}
            </label>
          ))}
        </div>
      </Section>

      <button className="showMore" onClick={() => setShowMore((v) => !v)}>
        {showMore ? "Show less" : "Show more"}
      </button>

      <button
        className="showMore"
        onClick={() =>
          setFilters({
            priceMin: priceBounds.min,
            priceMax: priceBounds.max,
            brands: new Set(),
            collections: new Set(),
            gemShapes: new Set(),
            materials: new Set(),
          })
        }
      >
        Clear filters
      </button>
    </aside>
  );
}