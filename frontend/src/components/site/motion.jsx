import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  useInView,
  useMotionValue,
  animate,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

export const EASE_EXPO = [0.19, 1, 0.22, 1];
export const EASE_QUART = [0.165, 0.84, 0.44, 1];

/* ------------------------------------------------------------------ */
/* Reveal — entrance when scrolled into view. ease-out-expo, y+opacity */
/* ------------------------------------------------------------------ */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  duration = 0.8,
  className,
  once = true,
  ...rest
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{
        opacity: { duration: 0.5, delay },
        y: reduced ? { duration: 0 } : { duration, delay, ease: EASE_EXPO },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Stagger — orchestrated children entrances                           */
/* ------------------------------------------------------------------ */
export function Stagger({ children, gap = 0.09, delay = 0, className, ...rest }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, y = 26, className, ...rest }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduced ? { opacity: 0 } : { opacity: 0, y },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            opacity: { duration: 0.45, ease: "easeOut" },
            y: reduced ? { duration: 0 } : { duration: 0.75, ease: EASE_EXPO },
          },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* SplitWords — headline reveals word by word from behind a mask       */
/* ------------------------------------------------------------------ */
export function SplitWords({
  text,
  className,
  highlightWords = [],
  stagger = 0.055,
  delay = 0,
  once = true,
}) {
  const reduced = useReducedMotion();
  const words = String(text).split(" ");
  const highlights = new Set(highlightWords.map((w) => w.toLowerCase()));
  return (
    <motion.span
      className={cn("inline", className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-40px" }}
      aria-label={text}
      role="text"
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-bottom"
        >
          <motion.span
            className={cn(
              "inline-block will-change-transform",
              highlights.has(word.replace(/[.,—?]/g, "").toLowerCase()) &&
                "text-signal"
            )}
            variants={{
              hidden: reduced
                ? { opacity: 0 }
                : { opacity: 0, y: "110%", rotate: 2 },
              show: {
                opacity: 1,
                y: "0%",
                rotate: 0,
                transition: {
                  opacity: { duration: 0.3 },
                  y: reduced ? { duration: 0 } : { duration: 0.7, ease: EASE_EXPO },
                  rotate: reduced ? { duration: 0 } : { duration: 0.7, ease: EASE_EXPO },
                },
              },
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/* Parallax — drifts children against scroll (scrub-linked)            */
/* ------------------------------------------------------------------ */
export function Parallax({ children, speed = 0.12, className, ...rest }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `${-speed * 100}%`]);
  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)} {...rest}>
      <motion.div style={reduced ? undefined : { y }} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MagneticButton — leans toward the cursor, springs back on leave     */
/* Desktop pointers only; springs keep it interruptible.               */
/* ------------------------------------------------------------------ */
export function Magnetic({ children, strength = 0.22, className, ...rest }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const yv = useMotionValue(0);
  const sx = useSpring(x, { duration: 0.5, bounce: 0.2 });
  const sy = useSpring(yv, { duration: 0.5, bounce: 0.2 });

  function onMove(e) {
    if (reduced || !ref.current || e.pointerType !== "mouse") return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    yv.set((e.clientY - rect.top - rect.height / 2) * strength);
  }
  function onLeave() {
    x.set(0);
    yv.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={cn("inline-block", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* TiltCard — subtle perspective tilt following the cursor             */
/* ------------------------------------------------------------------ */
export function TiltCard({ children, max = 5, className, ...rest }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 18 });
  const sry = useSpring(ry, { stiffness: 160, damping: 18 });

  function onMove(e) {
    if (reduced || !ref.current || e.pointerType !== "mouse") return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max * 2);
    rx.set(-py * max * 2);
  }
  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <div style={{ perspective: 900 }} className={className} {...rest}>
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{
          rotateX: srx,
          rotateY: sry,
          transformStyle: "preserve-3d",
        }}
        className="h-full w-full will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CountUp — numerals count up when they enter the viewport            */
/* ------------------------------------------------------------------ */
export function CountUp({ value, duration = 1.6, className, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE_QUART,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee — infinite horizontal loop; pauses on hover; static under   */
/* reduced motion. Content is duplicated for a seamless wrap.          */
/* ------------------------------------------------------------------ */
export function Marquee({
  children,
  direction = "left",
  duration = 42,
  className,
}) {
  return (
    <div className={cn("marquee relative overflow-hidden mask-fade-x", className)}>
      <div
        className="marquee-track flex w-max items-stretch"
        data-direction={direction}
        style={{ "--marquee-duration": `${duration}s` }}
      >
        <div className="flex items-stretch">{children}</div>
        <div className="flex items-stretch" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ImageReveal — curtain wipe: a solid panel lifts to expose media     */
/* ------------------------------------------------------------------ */
export function ImageReveal({
  src,
  alt = "",
  className,
  imgClassName,
  delay = 0,
  ...rest
}) {
  const reduced = useReducedMotion();
  return (
    <div className={cn("relative overflow-hidden", className)} {...rest}>
      <motion.img
        src={src}
        alt={alt}
        initial={reduced ? { opacity: 0 } : { scale: 1.15 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={
          reduced
            ? { duration: 0.4 }
            : { scale: { duration: 1.1, delay, ease: EASE_EXPO } }
        }
        className={cn("h-full w-full object-cover will-change-transform", imgClassName)}
      />
      {!reduced && (
        <motion.span
          aria-hidden="true"
          initial={{ scaleY: 1 }}
          whileInView={{ scaleY: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, delay, ease: EASE_QUART }}
          className="absolute inset-0 origin-top bg-foreground dark:bg-background"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CustomCursor — dot + lagging ring in difference blend.              */
/* Fine pointers only; the native cursor hides while it is active.     */
/* ------------------------------------------------------------------ */
export function CustomCursor() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 320, damping: 28, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 320, damping: 28, mass: 0.6 });

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    setEnabled(true);
    document.documentElement.classList.add("cursor-none-root");
    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setHovering(
        Boolean(e.target.closest?.("a, button, [data-cursor='hover']"))
      );
    };
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.classList.remove("cursor-none-root");
    };
  }, [reduced, x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference"
        style={{ x, y }}
      >
        <motion.span
          animate={{
            scale: pressed ? 0.6 : hovering ? 0.5 : 1,
          }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        />
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference"
        style={{ x: ringX, y: ringY }}
      >
        <motion.span
          animate={{
            scale: pressed ? 0.8 : hovering ? 1.9 : 1,
            opacity: hovering ? 0.9 : 0.55,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="block h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
        />
      </motion.div>
    </>
  );
}

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 24 });
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-signal"
      style={{ scaleX }}
    />
  );
}
