import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import * as THREE from "three";

function useReveal(selector: string, deps: any[] = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            gsap.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" });
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.18 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();

  }, deps);
}

function GemCanvas() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.1, 4.8);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(3, 2, 3);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.55);
    fill.position.set(-3, -1, 2);
    scene.add(fill);

    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(amb);

    const geo = new THREE.IcosahedronGeometry(1.22, 1);
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#f7f4ee"),
      metalness: 0.08,
      roughness: 0.12,
      transmission: 0.42,
      thickness: 0.9,
      ior: 1.35,
      clearcoat: 0.6,
      clearcoatRoughness: 0.14,
    });
    const gem = new THREE.Mesh(geo, mat);
    scene.add(gem);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({ color: new THREE.Color("#141414"), transparent: true, opacity: 0.10 })
    );
    gem.add(wire);


    const frameGeo = new THREE.TorusGeometry(1.62, 0.012, 10, 220);
    const frameMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#1f2b23"), transparent: true, opacity: 0.12 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.rotation.x = Math.PI * 0.62;
    frame.rotation.y = Math.PI * 0.18;
    scene.add(frame);

    let raf = 0;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();

    const onMove = (ev: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const nx = (ev.clientX - r.left) / r.width - 0.5;
      const ny = (ev.clientY - r.top) / r.height - 0.5;
      gsap.to(gem.rotation, { y: nx * 0.8, x: ny * 0.6, duration: 0.8, ease: "power3.out" });
      gsap.to(frame.rotation, { y: Math.PI * 0.18 + nx * 0.25, x: Math.PI * 0.62 + ny * 0.2, duration: 1.0, ease: "power3.out" });
    };
    wrap.addEventListener("pointermove", onMove);

    gsap.fromTo(gem.scale, { x: 0.92, y: 0.92, z: 0.92 }, { x: 1, y: 1, z: 1, duration: 1.1, ease: "power3.out" });
    gsap.fromTo(gem.rotation, { y: -0.6, x: 0.18 }, { y: 0.2, x: -0.05, duration: 1.3, ease: "power2.out" });
    gsap.fromTo(frame.material, { opacity: 0.0 }, { opacity: 0.12, duration: 1.15, ease: "power2.out" });

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      gem.rotation.z += 0.0011;
      gem.position.y = Math.sin(t * 0.0007) * 0.08;
      frame.rotation.z -= 0.0006;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      geo.dispose();
      mat.dispose();
      frameGeo.dispose();
      frameMat.dispose();
      (wire.geometry as THREE.BufferGeometry).dispose();
      (wire.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="gemWrap" ref={wrapRef} aria-hidden>
      <canvas ref={canvasRef} className="gemCanvas" />
      <div className="gemHalo" />
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    gsap.set(el, { height: open ? "auto" : 0, opacity: open ? 1 : 0 });
  }, []);

  const toggle = () => {
    const el = bodyRef.current;
    if (!el) return;
    const next = !open;
    setOpen(next);

    gsap.killTweensOf(el);
    if (next) {
      gsap.fromTo(el, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.5, ease: "power2.out" });
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.35, ease: "power2.inOut" });
    }
  };

  return (
    <button type="button" className={"faqItem" + (open ? " open" : "")} onClick={toggle} data-reveal>
      <div className="faqTop">
        <div className="faqQ">{q}</div>
        <div className="faqPlus" aria-hidden>
          {open ? "–" : "+"}
        </div>
      </div>
      <div className="faqBody" ref={bodyRef}>
        <div className="faqA">{a}</div>
      </div>
    </button>
  );
}

type PageKey = "HOME" | "JEWELLERY" | "HIGH JEWELLERY" | "RINGS" | "NECKLACES" | "GIFTS" | "ABOUT";

export function LandingPage({
  onShop,
  onGoHigh,
  onNavigate,
}: {
  onShop: () => void;
  onGoHigh: () => void;
  onNavigate: (page: PageKey) => void;
}) {
  useReveal("[data-reveal]", []);
  const heroKicker = useMemo(() => "NEW COLLECTION", []);
  return (
    <section className="landing">
      <div className="hero">
        <div className="heroGrid">
          <div className="heroLeft">
            <div className="kicker" data-reveal>
              {heroKicker}
            </div>
            <h1 className="heroTitle" data-reveal>
              Geometry, made <br /> timeless.
            </h1>
            <p className="heroSub" data-reveal>
              Precision forms. Quiet shine. Designed to feel like a signature — from everyday silver to elevated high jewellery.
            </p>

            <div className="heroActions" data-reveal>
              <button className="primaryBtn" onClick={onShop}>
                Shop now
              </button>
              <button className="ghostBtn" onClick={onGoHigh}>
                High jewellery
              </button>
            </div>

            <div className="heroMeta" data-reveal>
              <div className="metaItem">
                <div className="metaTop">Recycled metals</div>
                <div className="muted small">Crafted with restraint</div>
              </div>
              <div className="metaItem">
                <div className="metaTop">Nordic minimal</div>
                <div className="muted small">Expensive, not loud</div>
              </div>
              <div className="metaItem">
                <div className="metaTop">Gift-ready</div>
                <div className="muted small">Packaging included</div>
              </div>
            </div>
          </div>

          <div className="heroRight">
            <GemCanvas />
          </div>
        </div>
      </div>

      <div className="landingSection">
        <div className="sectionHead" data-reveal>
          <div className="sectionKicker">Shop by</div>
          <div className="sectionTitle">Collections</div>
        </div>

        <div className="catCards">
          <button className="catCard" onClick={() => onNavigate("JEWELLERY")} data-reveal>
            <div className="catName">Jewellery</div>
            <div className="muted small">Rings, necklaces, earrings, bracelets</div>
          </button>

          <button className="catCard" onClick={() => onNavigate("HIGH JEWELLERY")} data-reveal>
            <div className="catName">High Jewellery</div>
            <div className="muted small">Signature stones & gold</div>
          </button>

          <button className="catCard" onClick={() => onNavigate("GIFTS")} data-reveal>
            <div className="catName">Gifts</div>
            <div className="muted small">Sets, boxes, ready-to-give</div>
          </button>
        </div>
      </div>

      <div className="landingSection">
        <div className="featureRow">
          <div className="featureCard" data-reveal>
            <div className="featureKicker">Featured drops</div>
            <div className="featureTitle">Pieces that feel like a signature.</div>
            <div className="muted">
              A curated edit of our best-loved silhouettes — balanced proportions, clean settings, and a finish that reads quiet luxury.
            </div>
            <div className="featureActions">
              <button className="primaryBtn" onClick={() => onNavigate("RINGS")}>
                Shop rings
              </button>
              <button className="ghostBtn" onClick={() => onNavigate("NECKLACES")}>
                Shop necklaces
              </button>
            </div>
          </div>

          <div className="featureGrid" aria-hidden>
            <div className="miniCard a" data-reveal>
              <div className="miniTag">Rings</div>
            </div>
            <div className="miniCard b" data-reveal>
              <div className="miniTag">Necklaces</div>
            </div>
            <div className="miniCard c" data-reveal>
              <div className="miniTag">High jewellery</div>
            </div>
            <div className="miniCard d" data-reveal>
              <div className="miniTag">Gifts</div>
            </div>
          </div>
        </div>
      </div>

      <div className="landingSection">
        <div className="craftCard" data-reveal>
          <div className="craftLeft">
            <div className="sectionKicker">Our craft</div>
            <div className="craftTitle">Quiet detail. Heavy presence.</div>
            <p className="muted">
              Designed to sit close to the skin and feel intentional. Our settings stay sharp, the surfaces stay calm, and everything is
              made to wear well — today and years from now.
            </p>
            <div className="pillRow">
              <div className="pill">Nickel-safe alloys</div>
              <div className="pill">Recycled precious metals</div>
              <div className="pill">Hand-finished edges</div>
            </div>
            <button className="ghostBtn" onClick={onShop}>
              Explore the shop
            </button>
          </div>
          <div className="craftRight" aria-hidden>
            <div className="craftTile" />
            <div className="craftTile two" />
          </div>
        </div>
      </div>

      <div className="landingSection">
        <div className="sectionHead" data-reveal>
          <div className="sectionKicker">Lookbook</div>
          <div className="sectionTitle">Soft neutrals, sharp lines</div>
        </div>

        <div className="lookbookGrid">
          <div className="lookbookImg one" data-reveal />
          <div className="lookbookImg two" data-reveal />
          <div className="lookbookImg three" data-reveal />
        </div>

        <div className="pressRow" data-reveal>
          <div className="pressKicker">As seen in</div>
          <div className="pressLogos" aria-label="Press logos">
            <span>Nordic Design</span>
            <span>Studio Edit</span>
            <span>Minimal Review</span>
            <span>Finland Weekly</span>
            <span>Craft Journal</span>
          </div>
        </div>
      </div>

      <div className="landingSection">
        <div className="sectionHead" data-reveal>
          <div className="sectionKicker">Questions</div>
          <div className="sectionTitle">A few quick answers</div>
        </div>

        <div className="faqGrid">
          <FAQItem
            q="Do you ship internationally?"
            a="Yes. We ship across the EU and selected international destinations. Delivery options are shown at checkout."
          />
          <FAQItem
            q="How do I care for gold vermeil?"
            a="Keep it dry, store it separately, and wipe with a soft cloth. Avoid perfume and harsh cleaners to preserve the finish."
          />
          <FAQItem
            q="What if I need a different size?"
            a="Most rings can be exchanged. Start a return from your order confirmation later — the flow is already built for the demo."
          />
          <FAQItem
            q="Is packaging included?"
            a="Always. Each piece arrives in a protective box, designed to feel gift-ready straight out of the parcel."
          />
        </div>

        <div className="landingCTA" data-reveal>
          <div>
            <div className="ctaTitle">Ready when you are.</div>
            <div className="muted">Browse by category, save what you love, then check out in a few clean steps.</div>
          </div>
          <div className="ctaBtns">
            <button className="primaryBtn" onClick={onShop}>
              Shop the collection
            </button>
            <button className="ghostBtn" onClick={() => onNavigate("ABOUT")}>
              Our story
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}