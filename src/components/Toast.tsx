import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useStore } from "../store/StoreContext";

export function Toast() {
  const { state, dispatch } = useStore();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!state.ui.toast || !ref.current) return;

    const el = ref.current;
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { y: 18, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" }
    );

    const t = window.setTimeout(() => dispatch({ type: "toast/clear" }), 1800);
    return () => window.clearTimeout(t);
  }, [state.ui.toast?.id]);

  if (!state.ui.toast) return null;

  return (
    <div className="toastWrap">
      <div ref={ref} className="toast">
        {state.ui.toast.message}
      </div>
    </div>
  );
}