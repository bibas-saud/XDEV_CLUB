import { useEffect } from "react";

const EXPO_OUT = (t) => 1 - Math.pow(2, -10 * t);

/**
 * Glides the page to the nearest story beat once scrolling settles near one.
 * Anchors are elements carrying [data-snap]; the target inside each depends
 * on its name:
 *   portal-white  → end of the pinned carousel (wash fully white)
 *   logo-settled  → just after the interlude logo finishes entering
 *   manifesto     → pinned start of the manifesto curtain
 * Any wheel/touch input cancels a pending glide. No-op when `enabled` is
 * false (reduced motion) or when the page has no anchors.
 */
export function useScrollSnap(lenisRef, enabled) {
  useEffect(() => {
    if (!enabled) return;

    let raf;
    let anchors = [];
    let lastY = window.scrollY;
    let stillFrames = 0;
    let cooldownUntil = 0;
    let gliding = false;

    const measure = () => {
      const vh = window.innerHeight;
      anchors = [...document.querySelectorAll("[data-snap]")].map((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const span = Math.max(el.offsetHeight - vh, 1);
        let target = top;
        if (el.dataset.snap === "portal-white") target = top + span * 0.97;
        else if (el.dataset.snap === "logo-settled") target = top + span * 0.16;
        return { target };
      });
    };
    measure();
    window.addEventListener("resize", measure);

    const cancel = () => {
      cooldownUntil = performance.now() + 900;
    };
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (gliding) return;

      const y = window.scrollY;
      const v = Math.abs(y - lastY);
      lastY = y;

      if (now < cooldownUntil || v > 1) {
        stillFrames = 0;
        return;
      }
      stillFrames += 1;
      if (stillFrames < 9) return;

      const near = anchors
        .map((a) => ({ ...a, d: a.target - y }))
        .filter((a) => Math.abs(a.d) > 2 && Math.abs(a.d) < window.innerHeight * 0.16)
        .sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
      if (!near || !lenisRef.current) return;

      gliding = true;
      lenisRef.current.scrollTo(near.target, {
        duration: 0.85,
        easing: EXPO_OUT,
        lock: true,
        onComplete: () => {
          gliding = false;
          lastY = window.scrollY;
        },
      });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
    };
  }, [enabled, lenisRef]);
}
