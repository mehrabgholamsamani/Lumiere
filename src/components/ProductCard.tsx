import { useRef } from "react";
import gsap from "gsap";
import type { Product } from "../types";
import { formatPrice } from "../utils";
import { useStore } from "../store/StoreContext";
import { Icon } from "./Icon";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product }: { product: Product }) {
  const { state, dispatch, actions } = useStore();
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const isFav = !!state.favorites[product.id];

  return (
    <button
      ref={cardRef}
      className="card"
      onClick={() => dispatch({ type: "product/open", id: product.id })}
      onMouseMove={(e) => {
        const el = cardRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const rx = ((y / r.height) - 0.5) * -6;
        const ry = ((x / r.width) - 0.5) * 6;
        gsap.to(el, { rotateX: rx, rotateY: ry, transformPerspective: 700, duration: 0.25, ease: "power2.out" });
      }}
      onMouseLeave={() => {
        const el = cardRef.current;
        if (!el) return;
        gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.35, ease: "power3.out" });
      }}
    >
      <div className="cardMedia">
        {product.badge && <div className="chip">{product.badge}</div>}
        <ProductImage product={{ id: product.id, category: product.category, name: product.name }} alt={product.name} loading="lazy"  />
        <button
          className={"heart " + (isFav ? "on" : "")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.toggleFavorite(product.id);
          }}
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Icon name="heart" width={18} height={18} />
        </button>
      </div>

      <div className="cardBody">
        <div className="cardTop">
          <div className="cardTitle">{product.name}</div>
          <div className="cardPrice">{formatPrice(product.priceCents)}</div>
        </div>
        <div className="cardMeta">
          <span className="muted">{product.brand}</span>
          <span className="dot">•</span>
          <span className="muted">{product.category} • {product.materialGroup}</span>
        </div>

        <div className="cardBottom">
          <div className="stars" aria-label={`Rating ${product.rating} out of 5`}>
            {"★★★★★".slice(0, Math.round(product.rating))}
            <span className="muted">{"★★★★★".slice(Math.round(product.rating))}</span>
            <span className="ratingNum">{product.rating.toFixed(1)}</span>
          </div>

          <button
            className="addBtn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dispatch({ type: "cart/add", id: product.id, qty: 1 });
              dispatch({ type: "toast/show", message: "Added to cart" });
              dispatch({ type: "cart/open", open: true });
            }}
          >
            Add
          </button>
        </div>
      </div>
    </button>
  );
}