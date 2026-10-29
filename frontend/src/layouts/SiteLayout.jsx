import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import Lenis from "lenis";
import { useReducedMotion } from "motion/react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useScrollSnap } from "@/hooks/useScrollSnap";
import {
  CustomCursor,
  ScrollProgressBar,
  EASE_EXPO,
} from "@/components/site/motion";

const LenisContext = createContext(null);

/** Access the shared Lenis instance (null when reduced motion is on). */
export function useLenis() {
  return useContext(LenisContext);
}

/**
 * Public site shell: buttery smooth scrolling (Lenis), a glass navbar,
 * scroll progress bar, page enter/exit transitions, and the footer.
 */
export function SiteLayout() {
  const location = useLocation();
  const reduced = useReducedMotion();
  const lenisRef = useRef(null);

  useScrollSnap(lenisRef, !reduced);

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(2, -10 * t),
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;
    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  // New page → start at the top (instant, before paint).
  useLayoutEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <LenisContext.Provider value={lenisRef}>
      <CustomCursor />
      <ScrollProgressBar />
      <SiteNav />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          id="main"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{
            opacity: { duration: 0.3, ease: "easeOut" },
            y: reduced ? { duration: 0 } : { duration: 0.45, ease: EASE_EXPO },
          }}
          className="min-h-screen will-change-transform"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <SiteFooter />
    </LenisContext.Provider>
  );
}
