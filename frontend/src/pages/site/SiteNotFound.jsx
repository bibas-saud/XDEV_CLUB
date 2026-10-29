import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/site/motion";

export default function SiteNotFound() {
  return (
    <section className="grain relative grid min-h-svh place-items-center overflow-hidden px-5 pt-24 text-center">
      <div className="relative">
        <Reveal y={12}>
          <p className="font-mono text-[11px] tracking-[0.24em] text-signal uppercase">
            404 · route not found
          </p>
        </Reveal>
        <h1 className="display mt-6 text-[clamp(3rem,10vw,8rem)]">
          <span className="block">Not</span>
          <span className="block text-stroke">Shipped</span>
        </h1>
        <Reveal delay={0.3}>
          <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The URL you followed doesn't exist — but plenty of working routes
            do.
          </p>
        </Reveal>
        <Reveal delay={0.45}>
          <Link
            to="/"
            className="group mt-9 inline-flex items-center gap-3 border border-border px-7 py-3.5 font-mono text-xs tracking-[0.18em] uppercase transition-colors duration-200 hover:border-signal hover:text-signal"
          >
            <ArrowLeft
              size={14}
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
            Back to base
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
