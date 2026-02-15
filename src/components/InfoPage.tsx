import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { PageKey } from "./Header";

type Copy = {
  kicker: string;
  title: string;
  subtitle?: string;
  body: string[];
  cta?: { label: string; action: "SHOP" | "GIFTS" | "CONTACT" };
};

const COPY: Record<
  Exclude<
    PageKey,
    | "HOME"
    | "HIGH JEWELLERY"
    | "JEWELLERY"
    | "RINGS"
    | "NECKLACES"
    | "GIFTS"
    | "ABOUT"
    | "CHECKOUT"
    | "ACCOUNT"
    | "USER"
  >,
  Copy
> = {
  "OUR STORY": {
    kicker: "COMPANY",
    title: "A quiet kind of luxury",
    subtitle: "Designed in Finland, built for everyday confidence.",
    body: [
      "Lumière began with a simple frustration: jewellery often felt either too loud or too delicate. We wanted pieces with calm presence, the kind you reach for without thinking, and still notice years later.",
      "Our shapes are intentional. We lean on clean geometry and warm metallic tones, then refine proportions until every line feels balanced. The result is jewellery that reads expensive without trying too hard.",
      "This storefront is a demo, but the philosophy is real: fewer distractions, better details, and a shopping experience that feels as considered as the pieces themselves.",
    ],
    cta: { label: "Shop the collection", action: "SHOP" },
  },
  RESPONSIBILITY: {
    kicker: "RESPONSIBILITY",
    title: "Better materials. Less waste.",
    subtitle: "A modern standard for modern jewellery.",
    body: [
      "We favour recycled metals and durable finishes because the most sustainable piece is the one you keep wearing. Good design earns its place in your life.",
      "Packaging is kept minimal and gift-ready. We avoid excess, but never compromise the unboxing feel.",
      "Care guidance is part of the product. When you know how to store and clean jewellery properly, it stays beautiful longer and you buy less over time.",
    ],
    cta: { label: "Browse gifts", action: "GIFTS" },
  },
  "LUMIÈRE FINLAND": {
    kicker: "STUDIO",
    title: "Made with Nordic restraint",
    subtitle: "Cool light, clean lines, warm metals.",
    body: [
      "Finland teaches you to appreciate simplicity. Not empty, but deliberate. That mindset shows up in our silhouettes and in the way we present products: spacious, clear, and calm.",
      "Our palette is quiet on purpose. When the UI doesn’t shout, the jewellery does the talking.",
      "If you love minimal design with strong finishing, you are in the right place.",
    ],
    cta: { label: "Explore jewellery", action: "SHOP" },
  },
  "ENCHANTING TREASURE": {
    kicker: "COLLECTION",
    title: "Enchanting Treasure",
    subtitle: "A curated edit of pieces with a little sparkle.",
    body: [
      "Some pieces are meant to be everyday. Others are meant to be remembered. Enchanting Treasure is our selection for the second category.",
      "Expect warmer tones, bolder silhouettes, and accents that catch light from across the room. Still elegant. Still wearable.",
      "Perfect for milestones, gifts, and moments where you want a signature piece instead of a trend.",
    ],
    cta: { label: "Shop High Jewellery", action: "SHOP" },
  },
  "VISITOR CENTER": {
    kicker: "VISIT",
    title: "Visitor Center",
    subtitle: "Discover how the pieces come together.",
    body: [
      "If you enjoy the process as much as the product, the Visitor Center is for you. Think of it as a behind-the-scenes look at design choices, materials, and finishing.",
      "We believe trust comes from clarity. When you understand what you’re buying, you can buy fewer pieces and love them harder.",
      "For now, this is a demo page, but the intention is simple: make every detail easy to understand.",
    ],
    cta: { label: "Start shopping", action: "SHOP" },
  },
  CONTACT: {
    kicker: "INFO",
    title: "Contact us",
    subtitle: "We reply fast and keep it human.",
    body: [
      "Questions about sizing, gifting, or care? Send a message and we’ll help you choose with confidence.",
      "For collaborations and wholesale inquiries, include a short introduction and a link to your store or portfolio.",
      "Demo note: this project does not send emails. The contact form is intentionally left out to keep the build lightweight.",
    ],
    cta: { label: "Browse gifts", action: "GIFTS" },
  },
  "TERMS OF USE": {
    kicker: "LEGAL",
    title: "Terms of use",
    subtitle: "Clear rules, simple language.",
    body: [
      "This site is a portfolio demo. Products, prices, and policies are illustrative and do not represent a real store.",
      "You are welcome to use the code for learning and inspiration. If you ship it commercially, replace demo content with your own brand and policies.",
      "We keep the experience safe, respectful, and focused on good design. That’s the whole point.",
    ],
    cta: { label: "Return to shop", action: "SHOP" },
  },
  "PRIVACY STATEMENT": {
    kicker: "LEGAL",
    title: "Privacy statement",
    subtitle: "Minimal data, maximum respect.",
    body: [
      "This storefront stores only what it needs to function in your browser: cart items and saved favourites. That data stays on your device.",
      "There is no account system here and no tracking setup by default. If you add analytics later, make it transparent and optional.",
      "If privacy matters to your users, build it into the product from day one. It is a design choice, not an afterthought.",
    ],
    cta: { label: "Continue shopping", action: "SHOP" },
  },
  "TERMS OF DELIVERY": {
    kicker: "INFO",
    title: "Terms of delivery",
    subtitle: "Simple shipping options that make sense.",
    body: [
      "Standard and express shipping are shown in checkout so the flow feels realistic. In a real store, rates would depend on destination, weight, and carrier.",
      "We recommend offering tracked delivery by default. Customers want calm certainty, not surprises.",
      "If you turn this demo into a real product, connect shipping rates to your backend and surface delivery estimates clearly on product pages.",
    ],
    cta: { label: "Shop now", action: "SHOP" },
  },
  "RETURN INSTRUCTIONS": {
    kicker: "INFO",
    title: "Return instructions",
    subtitle: "Returns should feel easy, not stressful.",
    body: [
      "A good return policy is part of trust. Keep it clear, keep it fair, and make it easy to follow.",
      "If a customer needs to return a gift, treat them with the same care as the original buyer. That’s how brands earn loyalty.",
      "This demo does not process orders. If you ship this as a real store, add a returns portal and show steps directly in account pages.",
    ],
    cta: { label: "Find a gift", action: "GIFTS" },
  },
  "JEWELRY MAINTENANCE": {
    kicker: "CARE",
    title: "Jewelry maintenance",
    subtitle: "Small habits that keep pieces beautiful.",
    body: [
      "Store pieces separately to avoid scratches. A soft pouch works, a lined box works even better.",
      "Avoid contact with perfume and harsh cleaners. Put jewellery on after fragrance, and wipe it down with a soft cloth after wearing.",
      "For silver, gentle polishing brings back brightness. For plated pieces, use light pressure and avoid abrasive materials.",
    ],
    cta: { label: "Explore jewellery", action: "SHOP" },
  },
};

export function InfoPage({
  page,
  onShop,
  onGifts,
  onContact,
}: {
  page: keyof typeof COPY;
  onShop: () => void;
  onGifts: () => void;
  onContact: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const copy = useMemo(() => COPY[page], [page]);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll("[data-in]")) as HTMLElement[];
    gsap.fromTo(
      items,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.06 }
    );
  }, [page]);

  const cta = copy.cta;

  const onCta = () => {
    if (!cta) return;
    if (cta.action === "SHOP") onShop();
    if (cta.action === "GIFTS") onGifts();
    if (cta.action === "CONTACT") onContact();
  };

  return (
    <section className="infoPage" ref={wrapRef}>
      <div className="infoHero">
        <div className="infoInner">
          <div className="kicker" data-in>{copy.kicker}</div>
          <h1 className="infoTitle" data-in>{copy.title}</h1>
          {copy.subtitle && <p className="infoSub" data-in>{copy.subtitle}</p>}

          <div className="infoBody" data-in>
            {copy.body.map((p, i) => (
              <p key={i} className="muted">{p}</p>
            ))}
          </div>

          {cta && (
            <div className="infoActions" data-in>
              <button className="primaryBtn" onClick={onCta}>{cta.label}</button>
              <button className="ghostBtn" onClick={onShop}>Browse everything</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}