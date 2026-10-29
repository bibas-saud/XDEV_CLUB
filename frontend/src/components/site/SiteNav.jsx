import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/utils/cn";

const LINKS = [
  { to: "/", label: "Index" },
  { to: "/story", label: "Story" },
  { to: "/team", label: "Team" },
  { to: "/events", label: "Events" },
];

function ThemeToggle({ className }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {isDark ? "Light" : "Dark"}
    </button>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Permanent frosted glass — content (e.g. the orbiting showcase
          cards) always hides behind the bar instead of showing through. */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/85 backdrop-blur-lg">
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-[110rem] items-center justify-between px-5 sm:px-8"
        >
          <Link
            to="/"
            aria-label="XDEV Club home"
            className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo markOnly className="h-7 w-auto" />
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-200",
                    isActive
                      ? "text-signal"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <span aria-hidden="true" className="h-4 w-px bg-border" />
            <a
              href="/admin/login"
              className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors duration-200 hover:text-foreground"
            >
              Admin
            </a>
            <ThemeToggle />
          </div>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="font-mono text-[11px] tracking-[0.2em] uppercase md:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </nav>
      </header>

      {/* Mobile — full-screen index */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
            className="fixed inset-0 z-40 flex flex-col bg-background md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <Logo markOnly className="h-7 w-auto" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-[11px] tracking-[0.2em] uppercase"
              >
                Close
              </button>
            </div>
            <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center px-6">
              <ul className="space-y-2">
                {[...LINKS, { to: "/admin/login", label: "Admin" }].map(
                  (link, i) => (
                    <motion.li
                      key={link.to}
                      initial={{ opacity: 0, x: -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.06, duration: 0.4 }}
                    >
                      <NavLink
                        to={link.to}
                        end={link.to === "/"}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "group flex items-baseline gap-4 py-1",
                            isActive ? "text-signal" : "text-foreground"
                          )
                        }
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          0{i + 1}
                        </span>
                        <span className="display text-5xl">{link.label}</span>
                        <ArrowUpRight
                          size={22}
                          aria-hidden="true"
                          className="self-center opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </NavLink>
                    </motion.li>
                  )
                )}
              </ul>
            </nav>
            <div className="flex items-center justify-between border-t border-border px-6 py-5">
              <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                XDEV — Build what's next
              </span>
              <ThemeToggle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
