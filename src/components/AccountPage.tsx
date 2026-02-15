import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import * as THREE from "three";
import { useStore } from "../store/StoreContext";
import { supabase } from "../lib/supabase";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function useLuxuryScene(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.25, 2.2);

    const group = new THREE.Group();
    scene.add(group);

    const lightA = new THREE.DirectionalLight(0xffffff, 0.9);
    lightA.position.set(2, 2, 2);
    scene.add(lightA);

    const lightB = new THREE.DirectionalLight(0xffffff, 0.5);
    lightB.position.set(-2, -1, 2);
    scene.add(lightB);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);

    const coreGeo = new THREE.IcosahedronGeometry(0.62, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#f7f6f2"),
      roughness: 0.18,
      metalness: 0.15,
      transmission: 0.25,
      thickness: 0.4,
      clearcoat: 1.0,
      clearcoatRoughness: 0.22,
      ior: 1.35,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0.03, 0);
    group.add(core);

    const edgeGeo = new THREE.EdgesGeometry(coreGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#1f2b23"),
      transparent: true,
      opacity: 0.16,
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.copy(core.position);
    group.add(edges);

    const frameGeo = new THREE.OctahedronGeometry(0.95, 0);
    const frameMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#c7a86a"),
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.rotation.set(0.25, 0.15, 0.0);
    group.add(frame);

    let raf = 0;
    let t = 0;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(group.rotation, { y: x * 0.5, x: -y * 0.35, duration: 0.6, ease: "power3.out" });
    };

    const tick = () => {
      t += 0.01;

      core.rotation.y += 0.004;
      core.rotation.x += 0.0015;

      edges.rotation.copy(core.rotation);

      frame.rotation.y -= 0.0012;
      frame.rotation.z += 0.0008;

      core.position.y = 0.03 + Math.sin(t) * 0.02;
      edges.position.copy(core.position);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", onMove);

    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      renderer.dispose();
      coreGeo.dispose();
      edgeGeo.dispose();
      frameGeo.dispose();
      coreMat.dispose();
      edgeMat.dispose();
      frameMat.dispose();
    };
  }, [canvasRef]);
}

export function AccountPage({ onBackToShop }: { onBackToShop: () => void }) {
  const { state, dispatch } = useStore();

  const [mode, setMode] = useState<"SIGN_IN" | "SIGN_UP">("SIGN_IN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(state.user?.email ?? "");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useLuxuryScene(canvasRef);


  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".accCard", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" });
      gsap.fromTo(".accLeft h1", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, delay: 0.05 });
      gsap.fromTo(".accHint", { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.2 });
    }, rootRef);
    return () => ctx.revert();
  }, []);


  useEffect(() => {
    let alive = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!alive) return;
      if (error) return;
      const u = data.user;
      if (!u) return;
      dispatch({
        type: "auth/set",
        user: {
          id: u.id,
          email: u.email ?? "",
          name: (u.user_metadata as any)?.full_name ?? undefined,
        },
      });
      setEmail(u.email ?? "");
    });

    return () => {
      alive = false;
    };
  }, [dispatch]);

  const isAuthed = !!state.user;

  const canSubmit = useMemo(() => {
    if (!isValidEmail(email)) return false;
    if (mode === "SIGN_UP" && name.trim().length < 2) return false;
    if (password.trim().length < 6) return false;
    return true;
  }, [email, password, name, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) {
      dispatch({ type: "toast/show", message: "Please check your details and try again." });
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "SIGN_UP") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;


        if (!data.session) {
          dispatch({ type: "toast/show", message: "Check your email to confirm your account." });
        } else {
          dispatch({ type: "toast/show", message: "Welcome to Lumière. Your account is ready." });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;

        const u = data.user;
        dispatch({
          type: "auth/set",
          user: {
            id: u.id,
            email: u.email ?? email.trim(),
            name: (u.user_metadata as any)?.full_name ?? undefined,
          },
        });

        dispatch({ type: "toast/show", message: "Signed in." });
      }

      setPassword("");
    } catch (err: any) {
      dispatch({ type: "toast/show", message: err?.message ?? "Auth failed. Try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = async () => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      dispatch({ type: "auth/signOut" });
      dispatch({ type: "toast/show", message: "Signed out." });
      setPassword("");
      setName("");
    } catch (err: any) {
      dispatch({ type: "toast/show", message: err?.message ?? "Sign out failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={rootRef} className="accWrap">
      <div className="crumbs muted small">Home / Account</div>

      <div className="accGrid">
        <div className="accLeft">
          <div className="accCard">
            <div className="accTopRow">
              <h1 className="pageTitle" style={{ marginBottom: 6 }}>
                {isAuthed ? "Your profile" : mode === "SIGN_UP" ? "Create account" : "Sign in"}
              </h1>
              <div className="accTabs">
                <button
                  className={"accTab " + (mode === "SIGN_IN" ? "active" : "")}
                  onClick={() => setMode("SIGN_IN")}
                  disabled={isAuthed || isSubmitting}
                  type="button"
                >
                  Sign in
                </button>
                <button
                  className={"accTab " + (mode === "SIGN_UP" ? "active" : "")}
                  onClick={() => setMode("SIGN_UP")}
                  disabled={isAuthed || isSubmitting}
                  type="button"
                >
                  Sign up
                </button>
              </div>
            </div>

            <div className="accHint muted">
              {isAuthed
                ? "You’re signed in. Your favorites and bag can follow you across devices."
                : "Quiet access. One account, saved favorites, and faster checkout."}
            </div>

            {isAuthed ? (
              <div className="accProfile">
                <div className="accAvatar" aria-hidden>
                  {(state.user?.name?.[0] ?? state.user?.email?.[0] ?? "G").toUpperCase()}
                </div>
                <div className="accMeta">
                  <div className="accName">{state.user?.name?.trim() || "Lumière Member"}</div>
                  <div className="muted small">{state.user?.email}</div>
                </div>

                <div className="accActions">
                  <button className="btnOutline" onClick={onBackToShop} type="button" disabled={isSubmitting}>
                    Continue shopping
                  </button>
                  <button className="btnPrimary" onClick={signOut} type="button" disabled={isSubmitting}>
                    {isSubmitting ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="accForm">
                {mode === "SIGN_UP" && (
                  <label className="field">
                    <span>Full name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </label>
                )}

                <label className="field">
                  <span>Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    type="password"
                    autoComplete={mode === "SIGN_UP" ? "new-password" : "current-password"}
                  />
                </label>

                <button className="btnPrimary wide" type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Please wait..." : mode === "SIGN_UP" ? "Create account" : "Sign in"}
                </button>

                {mode === "SIGN_UP" && (
                  <div className="muted small">
                    If email confirmation is enabled, you’ll need to click the link we send before you can sign in.
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        <div className="accRight">
          <div className="accSceneCard accCard">
            <div className="accSceneLabel">
              <div className="muted small" style={{ letterSpacing: 2 }}>
                SIGNATURE ACCESS
              </div>
              <div className="accSceneTitle">A quieter checkout.</div>
              <div className="muted">Save your favorites, keep your bag, and return to the exact piece that felt like yours.</div>
            </div>
            <canvas ref={canvasRef} className="accCanvas" aria-label="Decorative 3D scene" />
          </div>
        </div>
      </div>
    </div>
  );
}