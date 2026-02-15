import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useStore } from "../store/StoreContext";
import { formatEUR } from "../App";
import { ProductImage } from "./ProductImage";
import { supabase } from "../lib/supabase";

type Step = 1 | 2 | 3 | 4;

function StepPill({ n, label, active, done }: { n: Step; label: string; active: boolean; done: boolean }) {
  return (
    <div className={"stepPill " + (active ? "active" : "") + (done ? " done" : "")}>
      <div className="stepNum">{done ? "✓" : n}</div>
      <div className="stepLabel">{label}</div>
    </div>
  );
}

export function CheckoutPage({ onBackToShop }: { onBackToShop: () => void }) {
  const { state, dispatch, derived } = useStore();
  const [step, setStep] = useState<Step>(1);
  const [isPlacing, setIsPlacing] = useState(false);

  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [addr, setAddr] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("Finland");

  const [ship, setShip] = useState<"standard" | "express">("standard");

  const [pay, setPay] = useState<"card" | "klarna">("card");
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");

  const formRef = useRef<HTMLDivElement | null>(null);

  const cartItems = useMemo(() => {
    return Object.entries(state.cart)
      .map(([id, qty]) => ({ product: derived.findProduct(id), qty }))
      .filter((x) => !!x.product) as { product: NonNullable<ReturnType<typeof derived.findProduct>>; qty: number }[];
  }, [state.cart, derived]);

  const shippingCents = ship === "express" ? 1299 : 599;
  const taxCents = Math.round(derived.cartSubtotalCents * 0.24);
  const totalCents = derived.cartSubtotalCents + shippingCents + taxCents;

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(formRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" });
  }, [step]);

  const canContinue = () => {
    if (cartItems.length === 0) return false;
    if (step === 1) return email.includes("@") && first.trim() && last.trim() && addr.trim() && city.trim() && postal.trim();
    if (step === 2) return true;
    if (step === 3) {
      if (pay === "klarna") return true;
      return card.replace(/\s/g, "").length >= 12 && exp.trim().length >= 4 && cvc.trim().length >= 3;
    }
    return true;
  };

  const next = () => {
    if (!canContinue()) {
      dispatch({ type: "toast/show", message: "Please complete the required fields." });
      return;
    }
    setStep((s) => (Math.min(4, (s + 1) as Step) as Step));
  };

  const back = () => setStep((s) => (Math.max(1, (s - 1) as Step) as Step));

  const placeOrder = async () => {
    if (cartItems.length === 0) return;
    if (isPlacing) return;


    if (!state.user || !(state.user as any).id) {
      dispatch({ type: "toast/show", message: "Please sign in to save your order to the backend." });
      return;
    }

    try {
      setIsPlacing(true);

      const shipping_address = {
        first,
        last,
        addr,
        city,
        postal,
        country,
      };

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: (state.user as any).id,
          email: email.trim(),
          shipping_address,
          shipping_method: ship,
          payment_method: pay,
          subtotal_cents: derived.cartSubtotalCents,
          shipping_cents: shippingCents,
          tax_cents: taxCents,
          total_cents: totalCents,
          status: "PLACED",
        })
        .select("id")
        .single();

      if (orderErr) throw orderErr;

      const itemsPayload = cartItems.map(({ product, qty }) => ({
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        unit_price_cents: product.priceCents,
        qty,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      dispatch({ type: "cart/clear" });
      dispatch({ type: "toast/show", message: `Order saved ✅ (id: ${order.id.slice(0, 8)}…)` });
      onBackToShop();
    } catch (err: any) {
      dispatch({ type: "toast/show", message: err?.message ?? "Could not place order. Try again." });
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <section className="checkout">
      <div className="checkoutTop">
        <button className="linkBtn" onClick={onBackToShop}>
          ← Continue shopping
        </button>
      </div>

      <div className="stepsRow" aria-label="Checkout steps">
        <StepPill n={1} label="Information" active={step === 1} done={step > 1} />
        <StepPill n={2} label="Shipping" active={step === 2} done={step > 2} />
        <StepPill n={3} label="Payment" active={step === 3} done={step > 3} />
        <StepPill n={4} label="Review" active={step === 4} done={false} />
      </div>

      <div className="checkoutGrid">
        <div className="checkoutLeft" ref={formRef}>
          {step === 1 && (
            <div className="panel">
              <div className="panelTitle">Contact</div>
              <div className="fieldGrid">
                <label className="field">
                  <span>Email</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </label>
              </div>

              <div className="panelTitle" style={{ marginTop: 18 }}>
                Shipping address
              </div>
              <div className="fieldGrid two">
                <label className="field">
                  <span>First name</span>
                  <input value={first} onChange={(e) => setFirst(e.target.value)} />
                </label>
                <label className="field">
                  <span>Last name</span>
                  <input value={last} onChange={(e) => setLast(e.target.value)} />
                </label>
              </div>

              <div className="fieldGrid">
                <label className="field">
                  <span>Address</span>
                  <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Street address" />
                </label>
              </div>

              <div className="fieldGrid two">
                <label className="field">
                  <span>City</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} />
                </label>
                <label className="field">
                  <span>Postal code</span>
                  <input value={postal} onChange={(e) => setPostal(e.target.value)} />
                </label>
              </div>

              <div className="fieldGrid">
                <label className="field">
                  <span>Country/Region</span>
                  <select value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option>Finland</option>
                    <option>Sweden</option>
                    <option>Norway</option>
                    <option>Denmark</option>
                    <option>Estonia</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="panel">
              <div className="panelTitle">Shipping method</div>

              <button className={"radioRow " + (ship === "standard" ? "active" : "")} onClick={() => setShip("standard")}>
                <div className="radioDot" />
                <div className="radioMain">
                  <div className="radioTop">
                    <div>Standard (2–5 business days)</div>
                    <div className="price">{formatEUR(599)}</div>
                  </div>
                  <div className="muted small">Tracked delivery</div>
                </div>
              </button>

              <button className={"radioRow " + (ship === "express" ? "active" : "")} onClick={() => setShip("express")}>
                <div className="radioDot" />
                <div className="radioMain">
                  <div className="radioTop">
                    <div>Express (1–2 business days)</div>
                    <div className="price">{formatEUR(1299)}</div>
                  </div>
                  <div className="muted small">Priority handling</div>
                </div>
              </button>

              <div className="muted small" style={{ marginTop: 10 }}>
                Shipping to: {addr ? `${addr}, ${postal} ${city}, ${country}` : "—"}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="panel">
              <div className="panelTitle">Payment (demo)</div>

              <button className={"radioRow " + (pay === "card" ? "active" : "")} onClick={() => setPay("card")}>
                <div className="radioDot" />
                <div className="radioMain">
                  <div className="radioTop">
                    <div>Credit / Debit card</div>
                    <div className="muted small">Visa • MasterCard • Amex</div>
                  </div>
                </div>
              </button>

              {pay === "card" && (
                <div className="fieldGrid" style={{ marginTop: 12 }}>
                  <label className="field">
                    <span>Card number</span>
                    <input value={card} onChange={(e) => setCard(e.target.value)} placeholder="1234 5678 9012 3456" />
                  </label>

                  <div className="fieldGrid two">
                    <label className="field">
                      <span>Expiry</span>
                      <input value={exp} onChange={(e) => setExp(e.target.value)} placeholder="MM/YY" />
                    </label>
                    <label className="field">
                      <span>CVC</span>
                      <input value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="123" />
                    </label>
                  </div>

                  <div className="muted small">
                    No payment is processed — this is the UI flow up to the final stage before paying.
                  </div>
                </div>
              )}

              <button className={"radioRow " + (pay === "klarna" ? "active" : "")} onClick={() => setPay("klarna")}>
                <div className="radioDot" />
                <div className="radioMain">
                  <div className="radioTop">
                    <div>Pay later (Klarna-style)</div>
                    <div className="muted small">Demo option</div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="panel">
              <div className="panelTitle">Review</div>

              <div className="reviewBlock">
                <div className="reviewRow">
                  <div className="muted small">Contact</div>
                  <div>{email || "—"}</div>
                </div>
                <div className="reviewRow">
                  <div className="muted small">Ship to</div>
                  <div>{addr ? `${first} ${last}, ${addr}, ${postal} ${city}, ${country}` : "—"}</div>
                </div>
                <div className="reviewRow">
                  <div className="muted small">Shipping</div>
                  <div>{ship === "express" ? "Express" : "Standard"}</div>
                </div>
                <div className="reviewRow">
                  <div className="muted small">Payment</div>
                  <div>{pay === "card" ? "Card (demo)" : "Pay later (demo)"}</div>
                </div>
              </div>

              <button className="primaryBtn" onClick={placeOrder} disabled={cartItems.length === 0 || isPlacing}>
                {isPlacing ? "Placing…" : "Place order"}
              </button>

              <div className="muted small" style={{ marginTop: 10 }}>
                This stops right before real payment integration. Perfect for portfolio demos.
              </div>
            </div>
          )}

          <div className="checkoutActions">
            {step > 1 && step < 4 && (
              <button className="ghostBtn" onClick={back}>
                Back
              </button>
            )}
            {step < 4 && (
              <button className="primaryBtn" onClick={next} disabled={!canContinue()}>
                Continue
              </button>
            )}
          </div>
        </div>

        <aside className="checkoutRight" aria-label="Order summary">
          <div className="summaryCard">
            <div className="summaryTitle">Order summary</div>

            <div className="sumItems">
              {cartItems.length === 0 ? (
                <div className="muted small">Your cart is empty.</div>
              ) : (
                cartItems.map(({ product, qty }) => (
                  <div key={product.id} className="sumItem">
                    <ProductImage product={{ id: product.id, category: product.category, name: product.name }} alt={product.name}  />
                    <div className="sumInfo">
                      <div className="sumName">{product.name}</div>
                      <div className="muted small">
                        {product.category} • {product.materialGroup} • Qty {qty}
                      </div>
                    </div>
                    <div className="sumPrice">{formatEUR(product.priceCents * qty)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="sumLine">
              <span className="muted small">Subtotal</span>
              <span>{formatEUR(derived.cartSubtotalCents)}</span>
            </div>
            <div className="sumLine">
              <span className="muted small">Shipping</span>
              <span>{formatEUR(shippingCents)}</span>
            </div>
            <div className="sumLine">
              <span className="muted small">Estimated tax</span>
              <span>{formatEUR(taxCents)}</span>
            </div>

            <div className="sumTotal">
              <span>Total</span>
              <span>{formatEUR(totalCents)}</span>
            </div>

            <div className="muted small" style={{ marginTop: 10 }}>
              Secure checkout UI • Saves order to backend when signed in • No real payment
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}