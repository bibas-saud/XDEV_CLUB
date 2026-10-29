import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { formatDate, formatFee } from "@/utils/format";
import { cn } from "@/utils/cn";

/**
 * EventIndexList — the agency pattern: numbered rows, hairline rules,
 * and a cover image that trails the cursor while a row is hovered.
 * Desktop gets the preview; mobile gets clean stacked rows.
 */
export function EventIndexList({ events, className }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(null);
  const containerRef = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 250, damping: 26, mass: 0.7 });
  const py = useSpring(my, { stiffness: 250, damping: 26, mass: 0.7 });

  function onMove(e) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={onMove}
      className={cn("relative", className)}
    >
      {/* cursor-following preview */}
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-20 hidden lg:block"
          style={{ x: px, y: py }}
        >
          <motion.div
            animate={{
              opacity: active !== null ? 1 : 0,
              scale: active !== null ? 1 : 0.85,
              rotate: active !== null ? -3 : 0,
            }}
            transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
            className="h-44 w-72 -translate-x-1/2 -translate-y-[112%] overflow-hidden border border-border bg-muted shadow-2xl"
          >
            {active !== null && events[active]?.cover_image_url && (
              <img
                src={events[active].cover_image_url}
                alt=""
                width="288"
                height="176"
                className="h-full w-full object-cover"
              />
            )}
          </motion.div>
        </motion.div>
      )}

      <ul className="border-t border-border">
        {events.map((event, i) => (
          <li key={event.id} className="border-b border-border">
            <Link
              to={`/events/${event.id}`}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-5 py-6 transition-colors duration-200 ease-out sm:grid-cols-[3.5rem_1fr_auto_auto] sm:gap-x-8 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {/* hover wash */}
              <span
                aria-hidden="true"
                className="absolute inset-0 origin-bottom scale-y-0 bg-foreground/[0.045] transition-transform duration-300 ease-out group-hover:scale-y-100 dark:bg-white/[0.05]"
              />

              <span
                className={cn(
                  "relative font-mono text-xs tracking-widest transition-colors duration-200",
                  active === i ? "text-signal" : "text-muted-foreground"
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <span className="relative min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="display-tight text-xl tracking-tight transition-transform duration-300 ease-out group-hover:translate-x-2 sm:text-3xl">
                    {event.name}
                  </span>
                  {event.status === "ongoing" && (
                    <span className="font-mono text-[10px] tracking-[0.2em] text-signal uppercase">
                      ● live
                    </span>
                  )}
                  {event.type === "competitive" && (
                    <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                      {event.type}
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                  {formatDate(event.event_date)} · {event.venue}
                </span>
              </span>

              <span className="relative hidden font-mono text-xs tabular-nums text-muted-foreground sm:block">
                {event.spots_left > 0
                  ? `${event.spots_left} left`
                  : "full"}
              </span>

              <span
                className={cn(
                  "relative hidden w-20 text-right font-mono text-xs sm:block",
                  event.is_free || event.fee_amount == null
                    ? "text-muted-foreground"
                    : "text-foreground"
                )}
              >
                {formatFee(event.fee_amount, event.currency, event.is_free)}
              </span>

              <ArrowUpRight
                size={18}
                aria-hidden="true"
                className="relative -translate-x-1 translate-y-1 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 max-sm:hidden"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
