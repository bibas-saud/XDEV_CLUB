import { motion, useScroll, useSpring, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { cn } from "@/utils/cn";
import { Reveal } from "./motion";

/**
 * CommitTrail — the site's signature. A hairline rail draws itself as
 * you scroll; each milestone lands like a commit on main. Steps:
 * [{ hash, date, title, body }]
 */
export function CommitTrail({ steps = [], className }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 72%", "end 65%"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 top-0 w-px bg-border"
      />
      {!reduced && (
        <motion.div
          aria-hidden="true"
          style={{ scaleY }}
          className="absolute bottom-0 left-0 top-0 w-px origin-top bg-signal"
        />
      )}

      <ol className="space-y-14">
        {steps.map((step, i) => (
          <li key={step.hash ?? i} className="relative pl-10 sm:pl-14">
            <Reveal y={0} duration={0.5} className="absolute left-0 top-1.5" aria-hidden="true">
              <span className="block h-2.5 w-2.5 bg-signal" />
            </Reveal>

            <Reveal delay={0.08}>
              <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                <span translate="no" className="text-signal">
                  {step.hash}
                </span>
                {step.date && (
                  <>
                    <span aria-hidden="true" className="mx-3 text-border">
                      /
                    </span>
                    {step.date}
                  </>
                )}
              </p>
              <h3 className="display-tight mt-3 text-2xl tracking-tight text-balance sm:text-3xl">
                {step.title}
              </h3>
              {step.body && (
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
                  {step.body}
                </p>
              )}
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}
