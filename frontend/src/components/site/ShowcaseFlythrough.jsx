import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import whiteLogo from "@/assets/small-white-logo.png";
import { site, showcase } from "@/features/public/content";
import { showcaseItems } from "@/features/public/showcase";

/* ------------------------------------------------------------------ */
/* Tuning — orbit ring à la cipher.tv: slow idle spin, scroll bursts   */
/* add decaying velocity, slight ellipse tilt, deck-stack intro,       */
/* portal-wash outro with word sweep + light rays into the interlude.  */
/* ------------------------------------------------------------------ */

const MIN_CARDS = 12;
const BASE_SPEED = 0.14;
const SCROLL_GAIN = 0.0045;
const VEL_DECAY = 2.1;
const MAX_VEL = 2.4;
const TILT = -0.14;
const CAROUSEL_END = 0.62;
const OUTRO_END = 0.94;
const INTRO_DELAY = 350;
const INTRO_DUR = 1700;

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*/—";

/* ------------------------------------------------------------------ */
/* useScramble — per-letter resolve animation when the text changes    */
/* ------------------------------------------------------------------ */

function useScramble(text) {
  const reduced = useReducedMotion();
  const [out, setOut] = useState(text);
  const prevRef = useRef(text);

  useEffect(() => {
    if (reduced) {
      prevRef.current = text;
      return;
    }
    const from = prevRef.current;
    prevRef.current = text;
    if (from === text) return;
    const len = Math.max(from.length, text.length);
    const start = performance.now();
    const DURATION = 620;
    let raf;
    const tick = (now) => {
      const p = Math.min((now - start) / DURATION, 1);
      const solved = Math.floor(p * len);
      let s = "";
      for (let i = 0; i < len; i++) {
        const target = text[i] ?? "";
        if (i < solved || target === " ") s += target;
        else if (i < len * ((p + 0.25) / 1.25))
          s += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
        else s += from[i] ?? target;
      }
      setOut(s);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, reduced]);

  if (reduced) return text;
  return out;
}

/* ------------------------------------------------------------------ */
/* StaticReel — reduced-motion fallback                                */
/* ------------------------------------------------------------------ */

function StaticReel({ items }) {
  return (
    <section
      aria-label={showcase.eyebrow}
      className="mx-auto max-w-[110rem] px-5 pt-28 pb-16 sm:px-8"
    >
      <p className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
        {showcase.eyebrow}
      </p>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {items.map((item, i) => (
          <figure key={`${item.title}-${i}`} className="group">
            <div className="relative aspect-video overflow-hidden border border-border bg-card">
              {item.src ? (
                item.type === "video" ? (
                  <video
                    src={item.src}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={item.src}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="grid h-full place-items-center border border-dashed border-border">
                  <span className="display text-stroke text-7xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              )}
            </div>
            <figcaption className="mt-3 flex items-baseline justify-between font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span>{item.title}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ShowcaseFlythrough — the orbiting card ring                         */
/* ------------------------------------------------------------------ */

export default function ShowcaseFlythrough() {
  const reduced = useReducedMotion();

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const cardElsRef = useRef([]);
  const videoRefsRef = useRef([]);
  const glowRef = useRef(null);
  const raysRef = useRef(null);
  const washRef = useRef(null);
  const wordRef = useRef(null);
  const ringRef = useRef(null);
  const centerLogoRef = useRef(null);
  const hudExitRef = useRef(null);
  const hudRef = useRef(null);
  const hudPctRef = useRef(null);
  const hudIdxRef = useRef(null);
  const hoveredRef = useRef(null);
  const lastMoveRef = useRef(0);
  const mouseRef = useRef({ x: -1, y: -1 });
  const geomRef = useRef([]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const activeRef = useRef(0);

  /* Hover is intentional only when the pointer recently moved — a card
     sliding under a still cursor must not pop forward. Hit-testing is
     done geometrically in the rAF loop (DOM hover events don't fire
     reliably for transformed, moving elements). */
  const activateHover = (idx) => {
    if (hoveredRef.current === idx) return;
    if (hoveredRef.current !== null)
      cardElsRef.current[hoveredRef.current]?.classList.remove("is-hovered");
    cardElsRef.current[idx]?.classList.add("is-hovered");
    if (cardElsRef.current[idx])
      cardElsRef.current[idx].style.zIndex = String(400 + idx * 4);
    stageRef.current?.setAttribute("data-hovering", "1");
    hoveredRef.current = idx;
    setHoveredIdx(idx);
  };
  const deactivateHover = () => {
    if (hoveredRef.current === null) return;
    const prev = hoveredRef.current;
    cardElsRef.current[prev]?.classList.remove("is-hovered");
    if (cardElsRef.current[prev])
      cardElsRef.current[prev].style.zIndex = String(100 + prev * 4);
    stageRef.current?.setAttribute("data-hovering", "0");
    hoveredRef.current = null;
    setHoveredIdx(null);
  };

  const media =
    showcaseItems.length > 0
      ? showcaseItems
      : Array.from({ length: 6 }, (_, i) => ({
          src: null,
          type: "image",
          title: `Chapter ${String(i + 1).padStart(2, "0")}`,
        }));
  const cards =
    media.length >= MIN_CARDS
      ? media
      : Array.from({ length: MIN_CARDS }, (_, i) => media[i % media.length]);
  const count = cards.length;

  const title = useScramble(
    (hoveredIdx !== null ? cards[hoveredIdx]?.title : cards[activeIdx]?.title) ?? "",
  );
  const tagline = useScramble(showcase.tagline || site.tagline);

  useEffect(() => {
    if (reduced) return;

    const stage = stageRef.current;
    const section = sectionRef.current;
    if (!stage || !section) return;

    let raf;
    let angle = -Math.PI / 2;
    let vel = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let metrics = null;
    const introStart = performance.now() + INTRO_DELAY;
    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);

    /* mouse parallax state (fine pointers only) */
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    let curRotX = 0;
    let curRotY = 0;
    let underFrames = 0;
    let lastUnder = null;

    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mobile = w < 640;
      const rect = section.getBoundingClientRect();
      metrics = {
        w,
        h,
        cx: w / 2,
        cy: h * 0.44,
        rx: mobile ? w * 0.38 : Math.min(w * 0.24, 500),
        ry: h * (mobile ? 0.28 : 0.25),
        cardW: mobile
          ? Math.max(130, w * 0.36)
          : Math.min(Math.max(150, w * 0.15), 260),
        top: rect.top + window.scrollY,
        span: Math.max(section.offsetHeight - h, 1),
      };
    };
    measure();
    window.addEventListener("resize", measure);

    const onPointerMove = (e) => {
      lastMoveRef.current = performance.now();
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    stage.addEventListener("pointermove", onPointerMove, { passive: true });

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOutBack = (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    const smooth = (v, a, b) => Math.min(Math.max((v - a) / (b - a), 0), 1);
    const lerp = (a, b, t) => a + (b - a) * t;

    const frame = (now) => {
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;

      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      vel += Math.max(Math.min(dy, 90), -90) * SCROLL_GAIN;
      vel *= Math.exp(-VEL_DECAY * dt);
      vel = Math.max(Math.min(vel, MAX_VEL), -MAX_VEL);

      const m = metrics;

      /* intro — cards start as a stacked deck, then deal out with a
         per-card stagger and a small scale overshoot */
      const introRaw = Math.min(
        Math.max((now - introStart) / INTRO_DUR, 0),
        1,
      );
      const introP = easeInOutCubic(introRaw);

      /* orbit — spins faster while scrolling, idle drift otherwise */
      angle += (BASE_SPEED + vel) * dt * smooth(introP, 0.55, 1);
      const pageP = Math.min(Math.max((y - m.top) / m.span, 0), 1);
      const outroP = smooth(pageP, CAROUSEL_END, OUTRO_END);

      /* cards fly past the camera at the portal */
      const expand = 1 + easeOutCubic(outroP) * 3.5;
      const rx = m.rx * expand;
      const ry = m.ry * expand;

      /* whip — motion blur + skew while spinning fast */
      const whip = Math.min(Math.max((Math.abs(vel) - 0.35) * 2.2, 0), 2.6);
      const skew = Math.max(Math.min(vel * 1.1, 2.4), -2.4);
      const whipBlur = whip > 0.1 ? `blur(${whip.toFixed(2)}px)` : "none";

      let frontIdx = 0;
      let frontDepth = -2;

      for (let i = 0; i < count; i++) {
        const el = cardElsRef.current[i];
        if (!el) continue;
        const a = angle + (i / count) * Math.PI * 2;
        const sinA = Math.sin(a);
        const ox = Math.cos(a) * rx;
        const oy = sinA * ry;
        const x = ox * cosT - oy * sinT;
        const yy = ox * sinT + oy * cosT;

        /* staggered deal-out from the deck */
        const cp = Math.min(
          Math.max((introRaw - (i / count) * 0.22) / 0.78, 0),
          1,
        );
        const posEase = easeOutCubic(cp);

        const deckX = (i - (count - 1) / 2) * 4;
        const deckY = ((i % 3) - 1) * 7;
        const deckRot = ((i % 5) - 2) * 1.6;

        const px = m.cx + lerp(deckX, x, posEase);
        const py = m.cy + lerp(deckY, yy, posEase);
        const rot = deckRot * (1 - posEase);
        const scale = (0.85 + 0.15 * easeOutBack(cp)) * (1 + outroP * 0.1);

        el.style.width = `${m.cardW}px`;
        el.style.filter = hoveredRef.current === i ? "none" : whipBlur;
        el.style.transform = `translate(-50%, -50%) translate(${px}px, ${py}px) rotate(${rot}deg) skewY(${skew.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        el.style.opacity = String(Math.min(introRaw * 4, 1));

        geomRef.current[i] = {
          x: px,
          y: py,
          hw: (m.cardW * scale) / 2,
          hh: (m.cardW * scale * 9) / 32,
          sinA,
        };

        if (sinA > frontDepth) {
          frontDepth = sinA;
          frontIdx = i;
        }

        const video = videoRefsRef.current[i];
        if (video) {
          const shouldPlay = sinA > 0.3 && outroP < 0.5;
          if (shouldPlay && video.paused) video.play().catch(() => {});
          else if (!shouldPlay && !video.paused) video.pause();
        }
      }

      if (frontIdx !== activeRef.current) {
        activeRef.current = frontIdx;
        setActiveIdx(frontIdx);
      }

      /* hover resolution — geometric hit-test, gated on pointer motion */
      const { x: mx, y: my } = mouseRef.current;
      let under = null;
      let underZ = -1;
      for (let i = 0; i < count; i++) {
        const g = geomRef.current[i];
        if (!g) continue;
        if (
          mx >= g.x - g.hw &&
          mx <= g.x + g.hw &&
          my >= g.y - g.hh &&
          my <= g.y + g.hh
        ) {
          const z = 100 + i * 4;
          if (z > underZ) {
            underZ = z;
            under = i;
          }
        }
      }
      /* a card must dwell under the cursor before hover transfers to it —
         keeps the handoff smooth while the ring spins under a still mouse */
      if (under !== lastUnder) {
        underFrames = 0;
        lastUnder = under;
      } else {
        underFrames += 1;
      }
      if (under !== hoveredRef.current) {
        if (under === null) deactivateHover();
        else if (now - lastMoveRef.current < 250) activateHover(under);
        else if (hoveredRef.current !== null && underFrames >= 8)
          activateHover(under);
      }

      /* portal — glow peaks then fades, rays fan out, cards sweep past,
         wash lands on pure white */
      if (glowRef.current) {
        const g = smooth(outroP, 0.15, 0.5) * (1 - smooth(outroP, 0.55, 0.85));
        glowRef.current.style.opacity = String(g);
        glowRef.current.style.transform = `translate(-50%, -50%) scale(${0.35 + g * 2.3})`;
      }
      if (raysRef.current) {
        const r =
          smooth(outroP, 0.18, 0.42) * (1 - smooth(outroP, 0.5, 0.78));
        raysRef.current.style.opacity = String(r);
        raysRef.current.style.transform = `translate(-50%, -50%) rotate(${((now / 1000) * 9).toFixed(1)}deg) scale(${(0.85 + r * 0.45).toFixed(3)})`;
      }
      if (washRef.current) {
        washRef.current.style.opacity = String(smooth(outroP, 0.6, 0.9));
      }
      /* kinetic word — sweeps across during the wash, gone at full white */
      if (wordRef.current) {
        const wp = easeInOutCubic(Math.min(outroP / 0.95, 1));
        wordRef.current.style.transform = `translate(calc(-50% + ${(55 - 110 * wp).toFixed(2)}vw), -50%)`;
        wordRef.current.style.opacity = String(
          smooth(outroP, 0, 0.1) * (1 - smooth(outroP, 0.82, 1)),
        );
      }
      /* the small white mark dissolves before the word sweep begins */
      if (centerLogoRef.current) {
        centerLogoRef.current.style.opacity = String(
          1 - smooth(pageP, 0.58, 0.64),
        );
      }
      /* HUD slides away before the wash completes */
      if (hudExitRef.current) {
        const h = 1 - smooth(outroP, 0.04, 0.42);
        hudExitRef.current.style.opacity = String(h);
        hudExitRef.current.style.transform = `translateY(${((1 - h) * 26).toFixed(1)}px)`;
      }
      if (hudRef.current) {
        hudRef.current.dataset.exit = outroP > 0.04 ? "1" : "0";
      }

      /* ring container — mouse parallax + idle breathing + outro push */
      if (ringRef.current) {
        const k = 1 - Math.exp(-5 * dt);
        let tRotX = 0;
        let tRotY = 0;
        if (finePointer && mouseRef.current.x >= 0) {
          tRotY = ((mouseRef.current.x / m.w) * 2 - 1) * 3.2;
          tRotX = -((mouseRef.current.y / m.h) * 2 - 1) * 2.6;
        }
        curRotX += (tRotX - curRotX) * k;
        curRotY += (tRotY - curRotY) * k;
        const breath = Math.sin(now / 780) * 0.01;
        ringRef.current.style.transform = `rotateX(${curRotX.toFixed(2)}deg) rotateY(${curRotY.toFixed(2)}deg) scale(${((1 + breath) * (1 + outroP * 0.12)).toFixed(4)})`;
      }

      if (hudPctRef.current)
        hudPctRef.current.textContent = `${Math.round(pageP * 100)}%`;
      if (hudIdxRef.current)
        hudIdxRef.current.textContent = `${String(frontIdx + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      stage.removeEventListener("pointermove", onPointerMove);
    };
  }, [reduced, count]);

  if (reduced) return <StaticReel items={media} />;

  return (
    <section
      ref={sectionRef}
      aria-label={`${site.fullName} reel`}
      data-snap="portal-white"
      style={{ height: "780vh" }}
      className="relative z-0"
    >
      <div
        ref={stageRef}
        className="showcase-stage grain sticky top-0 z-0 h-svh overflow-hidden bg-[#050505] text-white"
        style={{ perspective: "1200px" }}
      >
        {/* orbiting ring */}
        <div
          ref={ringRef}
          className="absolute inset-0 will-change-transform [transform-style:preserve-3d]"
        >
          {cards.map((item, i) => (
            <div
              key={`${item.title}-${i}`}
              ref={(el) => (cardElsRef.current[i] = el)}
              style={{ zIndex: 100 + i * 4 }}
              className="showcase-card absolute top-0 left-0 will-change-transform"
            >
              <div
                data-cursor="hover"
                className="showcase-inner group relative aspect-[16/9] overflow-hidden bg-[#101012]"
              >
                {item.src ? (
                  item.type === "video" ? (
                    <video
                      ref={(el) => (videoRefsRef.current[i] = el)}
                      src={item.src}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="ring-media h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.src}
                      alt={item.title}
                      loading={i < 6 ? "eager" : "lazy"}
                      className="ring-media h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="grid h-full w-full place-items-center border border-dashed border-white/15 bg-white/[0.03]">
                    <span className="display text-6xl text-white/25">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* center mark — dissolves as the portal wash takes over */}
        <div
          ref={centerLogoRef}
          className="pointer-events-none absolute top-[44%] left-1/2 z-[300] -translate-x-1/2 -translate-y-1/2"
        >
          <motion.img
            src={whiteLogo}
            alt=""
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 1.3, ease: "easeOut" }}
            className="h-8 w-auto sm:h-10"
          />
        </div>

        {/* portal glow */}
        <div
          ref={glowRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-[310] aspect-square w-[56vmin] rounded-full opacity-0 blur-2xl will-change-transform"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 38%, rgba(255,255,255,0) 70%)",
          }}
        />

        {/* light-ray fan */}
        <div
          ref={raysRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-[312] h-[150vmin] w-[150vmin] rounded-full opacity-0 will-change-transform"
          style={{
            background:
              "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.16) 0deg 5deg, rgba(255,255,255,0) 5deg 20deg)",
          }}
        />

        {/* portal wash — lands on the next section's background */}
        <div
          ref={washRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[320] bg-background opacity-0"
        />

        {/* kinetic word — auto-inverts via blend difference */}
        <div
          ref={wordRef}
          aria-hidden="true"
          className="display pointer-events-none absolute top-1/2 left-1/2 z-[325] whitespace-nowrap text-[clamp(3.5rem,9vw,9rem)] text-white uppercase opacity-0 mix-blend-difference will-change-transform"
        >
          {site.tagline}
        </div>

        {/* HUD — exits in stagger before the wash completes */}
        <div
          ref={hudExitRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[330]"
        >
          <motion.div
            ref={hudRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 1.7 }}
            className="showcase-hud flex items-center justify-between gap-4 px-5 py-4 font-mono text-[10px] tracking-[0.22em] text-white/60 uppercase sm:px-8"
          >
            <span className="hud-item hidden truncate sm:block">{tagline}</span>
            <span className="hud-item flex-1 truncate text-center text-white/90">
              {title}
            </span>
            <span className="hud-item flex items-center gap-4 tabular-nums">
              <span ref={hudIdxRef}>01 / {String(count).padStart(2, "0")}</span>
              <span ref={hudPctRef}>0%</span>
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
