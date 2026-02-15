import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";

function useStaggerReveal(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll("[data-reveal]")) as HTMLElement[];
    targets.forEach((t) => (t.style.opacity = "0"));

    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        if (vis.length) {
          gsap.to(vis, { opacity: 1, y: 0, duration: 0.65, ease: "power2.out", stagger: 0.06 });
          vis.forEach((el) => io.unobserve(el));
        }
      },
      { threshold: 0.18 }
    );

    targets.forEach((el) => {
      el.style.transform = "translateY(14px)";
      io.observe(el);
    });

    return () => io.disconnect();
  }, [containerRef]);
}

function AtelierCanvas() {
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

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.1, 5.2);

    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(3, 2, 4);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(-4, 0.5, 2);
    scene.add(rim);

    scene.add(new THREE.AmbientLight(0xffffff, 0.52));


    const knotGeo = new THREE.TorusKnotGeometry(1.0, 0.32, 240, 16);
    const knotMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#f4f1ea"),
      metalness: 0.25,
      roughness: 0.22,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    scene.add(knot);

    const ringGeo = new THREE.TorusGeometry(1.45, 0.05, 18, 140);
    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#a48a63"),
      metalness: 0.55,
      roughness: 0.35,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.2;
    scene.add(ring);

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
      gsap.to(knot.rotation, { y: nx * 0.8, x: ny * 0.55, duration: 0.9, ease: "power3.out" });
      gsap.to(ring.rotation, { z: nx * 0.25, duration: 0.9, ease: "power3.out" });
    };
    wrap.addEventListener("pointermove", onMove);

    gsap.fromTo(knot.position, { y: 0.25 }, { y: 0, duration: 1.0, ease: "power2.out" });
    gsap.fromTo(knot.rotation, { y: -0.6 }, { y: 0.25, duration: 1.2, ease: "power2.out" });

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      knot.rotation.z += 0.001;
      ring.rotation.y += 0.0008;
      knot.position.y = Math.sin(t * 0.0008) * 0.08;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      knotGeo.dispose();
      knotMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="atelierWrap" ref={wrapRef} aria-hidden>
      <canvas ref={canvasRef} className="atelierCanvas" />
      <div className="atelierGlow" />
    </div>
  );
}

export function AboutPage({
  onShop,
  onGifts,
}: {
  onShop: () => void;
  onGifts: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useStaggerReveal(rootRef as any);

  useEffect(() => {

    const el = document.querySelector(".aboutUnderline");
    if (!el) return;
    gsap.fromTo(el, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.8, ease: "power2.out" });
  }, []);

  return (
    <section className="aboutPage" ref={rootRef as any}>
      <div className="aboutHero">
        <div className="aboutHeroGrid">
          <div className="aboutHeroLeft">
            <div className="kicker" data-reveal>OUR CRAFT</div>
            <h1 className="aboutTitle" data-reveal>
              Jewellery that feels <span className="aboutUnderline">inevitable</span>.
            </h1>
            <p className="aboutLead" data-reveal>
              Lumière is built around one idea: luxury shouldn’t shout. It should <em>hold</em> attention —
              through proportion, material, and the calm confidence of a perfect finish.
            </p>

            <div className="aboutPills" data-reveal>
              <div className="pill">Recycled metals</div>
              <div className="pill">Nordic geometry</div>
              <div className="pill">Gift-ready</div>
            </div>

            <div className="heroActions" data-reveal>
              <button className="primaryBtn" onClick={onShop}>Shop the collection</button>
              <button className="ghostBtn" onClick={onGifts}>Find a gift</button>
            </div>

            <div className="aboutTrust" data-reveal>
              <div className="trustItem">
                <div className="trustTop">24h dispatch</div>
                <div className="muted small">for in-stock pieces (demo)</div>
              </div>
              <div className="trustItem">
                <div className="trustTop">Care + polishing</div>
                <div className="muted small">guides included</div>
              </div>
              <div className="trustItem">
                <div className="trustTop">Secure checkout</div>
                <div className="muted small">UI flow shown</div>
              </div>
            </div>
          </div>

          <div className="aboutHeroRight">
            <AtelierCanvas />
          </div>
        </div>
      </div>

      <div className="aboutSections">
        <div className="aboutRow" data-reveal>
          <div className="aboutCardA">
            <div className="sectionKicker">Design philosophy</div>
            <div className="sectionTitle">Less noise. More signal.</div>
            <p className="muted">
              We start with geometry — arcs, halos, clean edges — then tune the finish until it looks expensive in daylight and
              even better at night. Every piece is designed to stack without chaos.
            </p>
          </div>

          <div className="aboutCardB">
            <div className="sectionKicker">Materials</div>
            <div className="sectionTitle">The quiet power of metal.</div>
            <p className="muted">
              Recycled silver, warm gold tones, and selective stones — used sparingly so the shapes remain the main character.
              That’s how you get “luxury” without yelling.
            </p>
          </div>
        </div>

        <div className="quoteCard" data-reveal>
          <div className="quoteMark">“</div>
          <div className="quoteText">
            If it looks perfect for one second and timeless for ten years — that’s the one.
          </div>
          <div className="muted small">— Lumière Studio Note</div>
        </div>

        <div className="ctaStrip" data-reveal>
          <div>
            <div className="sectionTitle">Ready to choose your signature?</div>
            <div className="muted">Explore rings, necklaces, and high jewellery — curated to feel effortless.</div>
          </div>
          <button className="primaryBtn" onClick={onShop}>Shop now</button>
        </div>
      </div>
    </section>
  );
}