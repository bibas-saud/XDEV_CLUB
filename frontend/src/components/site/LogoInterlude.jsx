import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import largeBlackLogo from "@/assets/large-black-logo.png";

/* ------------------------------------------------------------------ */
/* LogoInterlude — the white breath after the portal. Almost no dead   */
/* time: the large black mark reveals immediately via a circular       */
/* clip-wipe (echoing the portal), drifts up slowly, and the next      */
/* section curtains over it.                                           */
/* ------------------------------------------------------------------ */

const ENTER_START = 0.02;
const ENTER_END = 0.14;
const HOLD_HEIGHT = "260vh";

export default function LogoInterlude() {
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.35,
  });

  const opacity = useTransform(smooth, [ENTER_START, ENTER_END], [0, 1]);
  const scale = useTransform(smooth, [ENTER_START, ENTER_END], [0.94, 1]);
  const clipPath = useTransform(
    smooth,
    [ENTER_START, ENTER_END],
    ["circle(0% at 50% 50%)", "circle(85% at 50% 50%)"],
  );
  const y = useTransform(
    smooth,
    [ENTER_START, ENTER_END, 0.2, 1],
    ["3vh", "0vh", "0vh", "-8vh"],
  );

  if (reduced) {
    return (
      <section
        aria-hidden="true"
        data-snap="logo-settled"
        style={{ height: HOLD_HEIGHT }}
        className="relative bg-white"
      >
        <div className="grid h-svh place-items-center">
          <img src={largeBlackLogo} alt="" className="w-[min(42vw,20rem)]" />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-hidden="true"
      data-snap="logo-settled"
      style={{ height: HOLD_HEIGHT }}
      className="relative bg-white"
    >
      <div className="sticky top-0 grid h-svh place-items-center overflow-hidden bg-white">
        <motion.img
          src={largeBlackLogo}
          alt=""
          style={{ opacity, scale, y, clipPath }}
          className="w-[min(42vw,20rem)] will-change-transform"
        />
      </div>
    </section>
  );
}
