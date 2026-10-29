import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useLenis } from "@/layouts/SiteLayout";
import { footerNote } from "@/features/public/content";

function LocalTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setTime(`${fmt.format(new Date())} LOCAL`);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground tabular-nums uppercase">
      {time}
    </span>
  );
}

const COLUMNS = [
  {
    heading: "Index",
    links: [
      { label: "Home", to: "/" },
      { label: "Story", to: "/story" },
      { label: "Team", to: "/team" },
      { label: "Events", to: "/events" },
    ],
  },
];

export function SiteFooter() {
  const lenis = useLenis();

  return (
    <footer className="relative border-t border-border bg-background">
      <div className="mx-auto max-w-[110rem] px-5 sm:px-8">
        <div className="flex flex-col gap-12 py-14 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo className="h-9 w-auto" />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              A student-run software collective. Workshops, competitions, and
              shipped projects — in public, every week.
            </p>
          </div>

          <div className="flex gap-16 sm:gap-24">
            {COLUMNS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <h2 className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
                  {col.heading}
                </h2>
                <ul className="mt-5 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="link-sweep text-sm text-foreground/80 transition-colors duration-200 hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div>
              <h2 className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
                Status
              </h2>
              <p className="mt-5 flex items-center gap-2.5 text-sm text-foreground/80">
                <span aria-hidden="true" className="h-1.5 w-1.5 bg-signal" />
                Open to new builders
              </p>
              <p className="mt-3">
                <LocalTime />
              </p>
            </div>
          </div>
        </div>

        {/* Monumental wordmark */}
        <div aria-hidden="true" className="select-none overflow-hidden border-t border-border pt-6">
          <p className="display translate-y-[0.12em] text-center text-[19vw] leading-none tracking-tighter text-foreground/[0.07]">
            XDEV
          </p>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-border py-5 sm:flex-row sm:items-center">
          <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            {footerNote}
          </p>
          <div className="flex items-center gap-6">
            <a
              href="/admin/login"
              className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Admin console
            </a>
            <button
              type="button"
              onClick={() => {
                if (lenis?.current) lenis.current.scrollTo(0);
                else window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Top <ArrowUp size={12} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
