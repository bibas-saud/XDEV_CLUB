import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { EventIndexList } from "@/components/site/EventIndexList";
import { Reveal } from "@/components/site/motion";
import { usePublicEvents } from "@/features/public/hooks/usePublicData";

function EventSection({ index, title, status, limit }) {
  const { data, isLoading } = usePublicEvents(status, limit);
  const events = data?.items ?? [];
  if (!isLoading && events.length === 0) return null;

  return (
    <section className="mx-auto max-w-[110rem] px-5 sm:px-8">
      <Reveal>
        <div className="flex items-baseline gap-5">
          <span className="font-mono text-xs text-signal">{index}</span>
          <h2 className="display-tight text-3xl tracking-tight sm:text-4xl">
            {title}
          </h2>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            ({data?.total ?? "…"})
          </span>
        </div>
      </Reveal>
      <div className="mt-8">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse border-b border-border bg-muted/50"
              />
            ))}
          </div>
        ) : (
          <EventIndexList events={events} />
        )}
      </div>
    </section>
  );
}

export default function EventsPage() {
  return (
    <>
      <section className="grain relative overflow-hidden pt-36 pb-16 sm:pt-44">
        <div className="mx-auto max-w-[110rem] px-5 sm:px-8">
          <Reveal y={12}>
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              <ArrowLeft size={13} aria-hidden="true" /> Index
            </Link>
          </Reveal>
          <Reveal y={24}>
            <h1 className="display mt-8 text-[clamp(3.4rem,11vw,10rem)]">
              <span className="block">Events</span>
            </h1>
          </Reveal>
          <div className="mt-8 flex flex-col justify-between gap-4 border-t border-border pt-5 sm:flex-row">
            <Reveal delay={0.3}>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Workshops to learn, competitions to prove it, community to do
                it all with. Registration takes under a minute.
              </p>
            </Reveal>
            <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              Live / Upcoming / Past
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-24 pb-32">
        <section className="mx-auto max-w-[110rem] px-5 sm:px-8">
          <LiveBanner />
        </section>
        <EventSection index="01" title="Upcoming" status="upcoming" />
        <EventSection index="02" title="Past" status="past" />
      </div>
    </>
  );
}

function LiveBanner() {
  const { data, isLoading } = usePublicEvents("ongoing", 3);
  const events = data?.items ?? [];
  if (!isLoading && events.length === 0) return null;

  return (
    <div>
      <Reveal className="mb-6 flex items-center gap-3">
        <span className="h-2 w-2 animate-pulse bg-signal" aria-hidden="true" />
        <h2 className="font-mono text-[11px] tracking-[0.24em] text-signal uppercase">
          Happening now
        </h2>
      </Reveal>
      <EventIndexList events={events} />
    </div>
  );
}
