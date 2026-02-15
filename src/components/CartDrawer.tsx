import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { useStore } from "../store/StoreContext";
import { formatPrice, clamp } from "../utils";
import { Icon } from "./Icon";
import { ProductImage } from "./ProductImage";

export function CartDrawer() {
  const { state, dispatch, derived } = useStore();
  const open = state.ui.cartOpen;

  useEffect(() => {
    const fn = () => dispatch({ type: "cart/open", open: true });
    window.addEventListener("open-cart", fn as any);
    return () => window.removeEventListener("open-cart", fn as any);
  }, [dispatch]);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => {
    return Object.entries(state.cart)
      .map(([id, qty]) => {
        const p = derived.findProduct(id);
        if (!p) return null;
        return { product: p, qty };
      })
      .filter(Boolean) as { product: NonNullable<ReturnType<typeof derived.findProduct>>; qty: number }[];
  }, [state.cart, derived]);

  useEffect(() => {
    if (!overlayRef.current || !drawerRef.current) return;

    const overlay = overlayRef.current;
    const drawer = drawerRef.current;

    gsap.killTweensOf([overlay, drawer]);

    if (open) {
      gsap.set(overlay, { opacity: 0, pointerEvents: "auto" });
      gsap.set(drawer, { x: 24, opacity: 1 });
      gsap.to(overlay, { opacity: 1, duration: 0.2, ease: "power1.out" });
      gsap.to(drawer, { x: 0, duration: 0.35, ease: "power3.out" });
    } else {
      gsap.to(drawer, { x: 24, duration: 0.25, ease: "power2.inOut" });
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.2,
        ease: "power1.inOut",
        onComplete: () => {
          gsap.set(overlay, { pointerEvents: "none" });
        },
      });
    }
  }, [open]);

  const shippingCents = derived.cartSubtotalCents > 0 ? 590 : 0;
  const totalCents = derived.cartSubtotalCents + shippingCents;

  return (
    <div
      ref={overlayRef}
      className={"drawerOverlay " + (open ? "open" : "")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dispatch({ type: "cart/open", open: false });
      }}
      aria-hidden={!open}
    >
      <aside ref={drawerRef} className="drawer" aria-label="Shopping cart">
        <div className="drawerHeader">
          <div className="drawerTitle">
            <Icon name="bag" width={18} height={18} />
            Cart
            {derived.cartCount > 0 && <span className="badge">{derived.cartCount}</span>}
          </div>
          <button className="iconBtn" onClick={() => dispatch({ type: "cart/open", open: false })} aria-label="Close cart">
            <Icon name="x" width={18} height={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <div className="emptyTitle">Your cart is empty</div>
            <div className="muted">Add something shiny. Your future self will approve.</div>
            <button className="primaryBtn" onClick={() => dispatch({ type: "cart/open", open: false })}>
              Browse products
            </button>
          </div>
        ) : (
          <>
            <div className="drawerList">
              {items.map(({ product, qty }) => (
                <div className="lineItem" key={product.id}>
                  <ProductImage product={{ id: product.id, category: product.category, name: product.name }} alt={product.name}  />
                  <div className="liMid">
                    <div className="liTop">
                      <div className="liName">{product.name}</div>
                      <div className="liPrice">{formatPrice(product.priceCents * qty)}</div>
                    </div>
                    <div className="liMeta muted">
                      {product.category} • {product.material}
                    </div>
                    <div className="liActions">
                      <div className="qty small">
                        <button
                          className="iconBtn"
                          onClick={() => dispatch({ type: "cart/setQty", id: product.id, qty: clamp(qty - 1, 1, 99) })}
                          aria-label="Decrease quantity"
                        >
                          <Icon name="minus" width={16} height={16} />
                        </button>
                        <span className="qtyNum">{qty}</span>
                        <button
                          className="iconBtn"
                          onClick={() => dispatch({ type: "cart/setQty", id: product.id, qty: clamp(qty + 1, 1, 99) })}
                          aria-label="Increase quantity"
                        >
                          <Icon name="plus" width={16} height={16} />
                        </button>
                      </div>

                      <button
                        className="linkBtn"
                        onClick={() => {
                          dispatch({ type: "cart/remove", id: product.id });
                          dispatch({ type: "toast/show", message: "Removed item" });
                        }}
                      >
                        Remove
                      </button>

                      <button
                        className="linkBtn"
                        onClick={() => {
                          dispatch({ type: "product/open", id: product.id });
                        }}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="drawerFooter">
              <div className="totals">
                <div className="row">
                  <span className="muted">Subtotal</span>
                  <span>{formatPrice(derived.cartSubtotalCents)}</span>
                </div>
                <div className="row">
                  <span className="muted">Shipping</span>
                  <span>{formatPrice(shippingCents)}</span>
                </div>
                <div className="row total">
                  <span>Total</span>
                  <span>{formatPrice(totalCents)}</span>
                </div>
              </div>

              <div className="drawerBtns">
                <button
                  className="ghostBtn"
                  onClick={() => {
                    dispatch({ type: "cart/clear" });
                    dispatch({ type: "toast/show", message: "Cart cleared" });
                  }}
                >
                  Clear cart
                </button>
                <button
                  className="primaryBtn"
                  onClick={() => {
                    dispatch({ type: "cart/open", open: false });
                    window.dispatchEvent(new CustomEvent("go-checkout"));
                  }}
                >
                  Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}