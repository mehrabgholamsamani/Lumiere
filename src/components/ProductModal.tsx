import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useStore } from "../store/StoreContext";
import { formatPrice } from "../utils";
import { Icon } from "./Icon";
import { ProductImage } from "./ProductImage";

export function ProductModal() {
  const { state, dispatch, derived, actions } = useStore();
  const id = state.ui.activeProductId;
  const product = useMemo(() => (id ? derived.findProduct(id) : undefined), [id, derived]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [qty, setQty] = useState<number>(1);

  useEffect(() => {
    if (!id) return;
    setQty(1);
  }, [id]);

  useEffect(() => {
    if (!id || !wrapRef.current || !panelRef.current) return;

    const wrap = wrapRef.current;
    const panel = panelRef.current;

    gsap.set(wrap, { opacity: 0 });
    gsap.set(panel, { y: 22, scale: 0.98 });

    const tl = gsap.timeline();
    tl.to(wrap, { opacity: 1, duration: 0.2, ease: "power1.out" })
      .to(panel, { y: 0, scale: 1, duration: 0.35, ease: "power3.out" }, "<");

    return () => {
      tl.kill();
    };
  }, [id]);

  if (!id || !product) return null;
  const isFav = !!state.favorites[product.id];

  const close = () => {
    const wrap = wrapRef.current;
    const panel = panelRef.current;
    if (!wrap || !panel) {
      dispatch({ type: "product/open", id: null });
      return;
    }
    const tl = gsap.timeline({
      onComplete: () => dispatch({ type: "product/open", id: null }),
    });
    tl.to(panel, { y: 18, scale: 0.98, duration: 0.25, ease: "power2.inOut" }).to(
      wrap,
      { opacity: 0, duration: 0.18, ease: "power1.inOut" },
      "<"
    );
  };

  return (
    <div
      ref={wrapRef}
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Product details ${product.name}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div ref={panelRef} className="modalPanel">
        <button className="iconBtn" onClick={close} aria-label="Close">
          <Icon name="x" width={18} height={18} />
        </button>

        <div className="modalGrid">
          <div className="modalMedia">
            <ProductImage product={{ id: product.id, category: product.category, name: product.name }} alt={product.name}  />
          </div>

          <div className="modalInfo">
            <div className="modalTitleRow">
              <h2>{product.name}</h2>
              <button
                className={"heart big " + (isFav ? "on" : "")}
                onClick={() => {
                  actions.toggleFavorite(product.id);
                }}
                aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Icon name="heart" width={18} height={18} />
              </button>
            </div>

            <div className="modalPrice">{formatPrice(product.priceCents)}</div>

            <p className="modalDesc">{product.description}</p>

            <div className="kv">
              <div className="kvRow">
                <span className="k">Category</span>
                <span className="v">{product.category}</span>
              </div>
              <div className="kvRow">
                <span className="k">Material</span>
                <span className="v">{product.material}</span>
              </div>
              <div className="kvRow">
                <span className="k">Gemstones</span>
                <span className="v">{product.gemstones}</span>
              </div>
              <div className="kvRow">
                <span className="k">Rating</span>
                <span className="v">{product.rating.toFixed(1)} / 5</span>
              </div>
            </div>

            <div className="buyRow">
              <div className="qty">
                <button
                  className="iconBtn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  <Icon name="minus" width={16} height={16} />
                </button>
                <span className="qtyNum">{qty}</span>
                <button
                  className="iconBtn"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  aria-label="Increase quantity"
                >
                  <Icon name="plus" width={16} height={16} />
                </button>
              </div>

              <button
                className="primaryBtn"
                onClick={() => {
                  dispatch({ type: "cart/add", id: product.id, qty });
                  dispatch({ type: "toast/show", message: `Added ${qty} to cart` });
                  dispatch({ type: "product/open", id: null });
                  dispatch({ type: "cart/open", open: true });
                }}
              >
                Add to cart
              </button>
            </div>

            <div className="hint muted">This is a front-end demo store (no payments). Cart & Saved persist in your browser.</div>
          </div>
        </div>
      </div>
    </div>
  );
}