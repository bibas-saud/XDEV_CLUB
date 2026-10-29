import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SectionHeader } from "@/components/site/SectionHeader";
import { EventIndexList } from "@/components/site/EventIndexList";
import ShowcaseFlythrough from "@/components/site/ShowcaseFlythrough";
import {
  CountUp,
  EASE_EXPO,
  Marquee,
  Reveal,
  SplitWords,
  Stagger,
  StaggerItem,
} from "@/components/site/motion";
import {
  hero,
  manifesto,
  marqueeWords,
  pillars,
} from "@/features/public/content";
import {
  useActiveMembers,
  usePublicEvents,
} from "@/features/public/hooks/usePublicData";
import { initials } from "@/utils/format";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/* Hero — the thesis, set in type. Retained (unused): the reel below   */
/* replaced it as the opener; restore by swapping it into <Home/>.     */
/* ------------------------------------------------------------------ */

export function Hero() {
  return (
    <section className="grain relative flex min-h-svh flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-[110rem] flex-1 flex-col justify-end px-5 pt-32 pb-10 sm:px-8">
        {/* eyebrow row */}
        <Reveal y={12} duration={0.6} className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <p className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
              {hero.eyebrow}
            </p>
            <p className="hidden font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase sm:block">
              Est. on campus
            </p>
          </div>
        </Reveal>

        {/* monumental headline */}
        <h1 className="display select-none text-[clamp(4.2rem,16.5vw,15.5rem)]">
          {hero.titleLines.map((line, i) => (
            <span key={line.text} className="block overflow-hidden pb-[0.06em]">
              <motion.span
                className={cn(
                  "block will-change-transform",
                  line.outline && "text-stroke"
                )}
                initial={{ y: "112%" }}
                animate={{ y: "0%" }}
                transition={{
                  delay: 0.15 + i * 0.12,
                  duration: 1,
                  ease: EASE_EXPO,
                }}
              >
                {line.text}
                {i < hero.titleLines.length - 1 && (
                  <span className="text-signal">.</span>
                )}
              </motion.span>
            </span>
          ))}
        </h1>

        {/* sub row */}
        <div className="mt-8 flex flex-col justify-between gap-8 sm:mt-12 md:flex-row md:items-end">
          <Reveal delay={0.7} className="max-w-md">
            <p className="text-base leading-relaxed text-muted-foreground text-pretty">
              {hero.subtitle}
            </p>
          </Reveal>
          <Reveal delay={0.85} className="flex flex-wrap items-center gap-8">
            <Link
              to={hero.primaryCta.href}
              className="arrow-link group font-mono text-xs tracking-[0.18em] uppercase"
            >
              <span className="grid h-11 w-11 place-items-center bg-foreground text-background transition-colors duration-200 group-hover:bg-signal group-hover:text-white">
                <ArrowRight size={16} aria-hidden="true" />
              </span>
              <span className="link-sweep">{hero.primaryCta.label}</span>
            </Link>
            <Link
              to={hero.secondaryCta.href}
              className="arrow-link group font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              <span className="grid h-11 w-11 place-items-center border border-border">
                <ArrowUpRight size={16} aria-hidden="true" />
              </span>
              <span className="link-sweep">{hero.secondaryCta.label}</span>
            </Link>
          </Reveal>
        </div>
      </div>

      {/* discipline ticker */}
      <Reveal delay={1.05} y={0}>
        <div className="border-y border-border py-4">
          <Marquee duration={30}>
            {marqueeWords.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="mx-6 font-mono text-xs tracking-[0.3em] whitespace-nowrap uppercase"
              >
                <span className={i % 2 ? "text-stroke" : "text-foreground"}>
                  {word}
                </span>
                <span aria-hidden="true" className="ml-12 text-signal">
                  ✳
                </span>
              </span>
            ))}
          </Marquee>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Manifesto — pinned editorial statement: masked word reveals with    */
/* mixed type treatments (grotesque / outlined / serif italic /        */
/* signal), ghost backdrop type and a drawing hairline.                */
/* ------------------------------------------------------------------ */

const WORD_SIGNAL = new Set(["learn"]);
const WORD_OUTLINE = new Set(["everything"]);
const WORD_SERIF = new Set(["curious"]);
const LINE_INDENTS = ["sm:pl-0", "sm:pl-[9%]", "sm:pl-[2%]", "sm:pl-[15%]"];

function RevealWord({ children, progress, start }) {
  const end = start + 0.09;
  const y = useTransform(progress, [start, end], ["115%", "-8%"]);
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const clean = children.replace(/[.,—]/g, "").toLowerCase();
  return (
    <span className="inline-block overflow-hidden pb-[0.09em] -mb-[0.09em] align-bottom">
      <motion.span
        style={{ y, opacity }}
        className={cn(
          "inline-block will-change-transform",
          WORD_SIGNAL.has(clean) && "text-signal",
          WORD_OUTLINE.has(clean) && "text-stroke",
          WORD_SERIF.has(clean) && "font-editorial-serif text-[1.06em]",
        )}
      >
        {children}&nbsp;
      </motion.span>
    </span>
  );
}

function Manifesto() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const ruleScale = useTransform(scrollYProgress, [0.02, 0.16], [0, 1]);
  const ghostY = useTransform(scrollYProgress, [0, 1], ["14%", "-14%"]);

  const totalWords = manifesto.lines.join(" ").split(" ").length;
  const renderLine = (line, li) => {
    const offset = manifesto.lines
      .slice(0, li)
      .reduce((n, l) => n + l.split(" ").length, 0);
    const nodes = line.split(" ").map((word, wi) => {
      const start = 0.08 + ((offset + wi) / totalWords) * 0.6;
      return (
        <RevealWord
          key={`${word}-${offset + wi}`}
          progress={scrollYProgress}
          start={start}
        >
          {word}
        </RevealWord>
      );
    });
    return (
      <span
        key={li}
        className={cn("block", LINE_INDENTS[li % LINE_INDENTS.length])}
      >
        {nodes}
      </span>
    );
  };

  if (reduced) {
    return (
      <section
        ref={ref}
        data-snap="manifesto"
        className="relative z-10 flex h-[260vh] items-center justify-center border-t border-border bg-background border-b"
      >
        <div className="sticky top-0 flex h-screen items-center px-5 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <p className="mb-10 font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
              {manifesto.label}
            </p>
            <p className="display-tight text-[clamp(2.1rem,5.6vw,4.9rem)] leading-[1.04]">
              {manifesto.lines.map((line, li) => (
                <span
                  key={li}
                  className={cn(
                    "block",
                    LINE_INDENTS[li % LINE_INDENTS.length],
                  )}
                >
                  {line}
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      data-snap="manifesto"
      className="grain relative z-10 flex h-[260vh] items-center justify-center overflow-hidden border-t border-border bg-background border-b"
    >
      {/* ghost backdrop type drifting against the scroll */}
      <motion.div
        aria-hidden="true"
        style={{ y: ghostY }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span className="display text-stroke select-none text-[19vw] leading-none opacity-[0.07]">
          MANIFESTO
        </span>
      </motion.div>

      <div className="sticky top-0 flex h-screen items-center px-5 sm:px-8">
        <div className="relative mx-auto w-full max-w-6xl">
          {/* meta row with drawing hairline */}
          <div className="mb-10 flex items-center gap-5 sm:mb-14">
            <span className="font-mono text-[11px] tracking-[0.24em] text-signal">
              01
            </span>
            <motion.span
              style={{ scaleX: ruleScale }}
              className="h-px flex-1 origin-left bg-border"
            />
            <span className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
              {manifesto.label}
            </span>
          </div>

          <p className="display-tight text-[clamp(2.1rem,5.6vw,4.9rem)] leading-[1.04]">
            {manifesto.lines.map(renderLine)}
          </p>

          <div className="mt-10 flex justify-end sm:mt-14">
            <span className="font-mono text-[10px] tracking-[0.26em] text-muted-foreground/70 uppercase">
              XDEV — Student software collective
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Practice — index rows instead of cards                              */
/* ------------------------------------------------------------------ */

function Practice() {
  return (
    <section className="mx-auto max-w-[110rem] px-5 py-24 sm:px-8 sm:py-32">
      <SectionHeader
        index="01"
        eyebrow={pillars.label}
        title={pillars.title}
      />
      <div className="mt-14">
        <Stagger gap={0.1}>
          {pillars.items.map((pillar) => (
            <StaggerItem key={pillar.index} y={24}>
              <article className="group grid items-start gap-x-10 gap-y-3 border-t border-border py-9 transition-colors duration-300 last:border-b hover:bg-foreground/[0.03] sm:grid-cols-[5rem_1fr_1.2fr_auto] sm:py-11 dark:hover:bg-white/[0.03]">
                <span className="font-mono text-xs tracking-widest text-muted-foreground transition-colors duration-300 group-hover:text-signal">
                  {pillar.index}
                </span>
                <h3 className="display-tight text-3xl tracking-tight transition-transform duration-300 ease-out group-hover:translate-x-2 sm:text-5xl">
                  {pillar.name}
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty sm:justify-self-end">
                  {pillar.body}
                </p>
                <ArrowUpRight
                  size={22}
                  aria-hidden="true"
                  className="hidden self-center opacity-0 transition-all duration-300 ease-out group-hover:opacity-100 sm:block"
                />
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Live pulse — real numbers, hairline dividers                        */
/* ------------------------------------------------------------------ */

function LivePulse() {
  const members = useActiveMembers();
  const upcoming = usePublicEvents("upcoming");
  const past = usePublicEvents("past", 1);

  const stats = [
    { value: members.data?.length ?? 0, label: "Active builders" },
    { value: past.data?.total ?? 0, label: "Events shipped" },
    { value: upcoming.data?.total ?? 0, label: "Events upcoming" },
  ];

  return (
    <section className="border-y border-border bg-paper dark:bg-[#0c0d10]">
      <div className="mx-auto grid max-w-[110rem] grid-cols-1 divide-y divide-border px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-14 text-center sm:py-20">
            <p className="display text-6xl tabular-nums sm:text-7xl">
              <CountUp value={stat.value} />
            </p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Events teaser — the index, preview edition                          */
/* ------------------------------------------------------------------ */

function EventsTeaser() {
  const { data, isLoading } = usePublicEvents("upcoming", 4);
  const events = data?.items ?? [];

  return (
    <section className="mx-auto max-w-[110rem] px-5 py-24 sm:px-8 sm:py-32">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeader index="02" eyebrow="On the calendar" title="Next up" />
        <Reveal delay={0.15}>
          <Link
            to="/events"
            className="arrow-link group font-mono text-xs tracking-[0.18em] uppercase"
          >
            <span className="link-sweep">Full index</span>
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="transition-transform duration-300 ease-out group-hover:translate-x-1"
            />
          </Link>
        </Reveal>
      </div>

      <div className="mt-12">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse border-b border-border bg-muted/50" />
            ))}
          </div>
        ) : events.length ? (
          <EventIndexList events={events} />
        ) : (
          <div className="border border-dashed border-border p-14 text-center">
            <p className="display-tight text-2xl text-muted-foreground">
              The calendar is quiet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              New events drop soon — check back shortly.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Team strip — portrait marquee, editorial chips                      */
/* ------------------------------------------------------------------ */

function MemberChip({ member }) {
  return (
    <div className="mx-2.5 flex items-center gap-3 border border-border bg-card py-2 pr-6 pl-2 whitespace-nowrap">
      {member.photo_url ? (
        <img
          src={member.photo_url}
          alt=""
          loading="lazy"
          width="36"
          height="36"
          className="h-9 w-9 border border-border object-cover grayscale transition-[filter] duration-300 hover:grayscale-0"
        />
      ) : (
        <span className="grid h-9 w-9 place-items-center border border-border bg-signal-soft font-mono text-xs text-signal">
          {initials(member.full_name)}
        </span>
      )}
      <span className="text-sm font-medium">{member.full_name}</span>
      <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {member.role.replace("-", " ")}
      </span>
    </div>
  );
}

function TeamTeaser() {
  const { data } = useActiveMembers();
  const members = data ?? [];
  const half = Math.ceil(members.length / 2);
  const rowA = members.slice(0, half);
  const rowB = members.slice(half);

  return (
    <section className="overflow-hidden border-y border-border py-24 sm:py-32">
      <SectionHeader
        index="03"
        eyebrow="The people"
        title="Builders, not resumes"
        align="center"
      />
      <div className="mt-14 space-y-4">
        {members.length ? (
          <>
            <Marquee duration={46}>
              {rowA.map((m) => (
                <MemberChip key={`a-${m.id}`} member={m} />
              ))}
            </Marquee>
            <Marquee direction="right" duration={54}>
              {rowB.map((m) => (
                <MemberChip key={`b-${m.id}`} member={m} />
              ))}
            </Marquee>
          </>
        ) : (
          <p className="pt-6 text-center font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Roster loading…
          </p>
        )}
      </div>
      <Reveal className="mt-14 text-center">
        <Link
          to="/team"
          className="arrow-link group font-mono text-xs tracking-[0.18em] uppercase"
        >
          <span className="link-sweep">Meet the team</span>
          <ArrowRight
            size={14}
            aria-hidden="true"
            className="transition-transform duration-300 ease-out group-hover:translate-x-1"
          />
        </Link>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Closing CTA                                                         */
/* ------------------------------------------------------------------ */

function ClosingCta() {
  return (
    <section className="grain relative overflow-hidden">
      <div className="mx-auto max-w-[110rem] px-5 py-28 text-center sm:px-8 sm:py-40">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
            Your move
          </p>
        </Reveal>
        <h2 className="display mx-auto mt-6 max-w-5xl text-[clamp(2.6rem,8vw,7rem)]">
          <SplitWords
            text="Ready to commit?"
            highlightWords={["commit?"]}
            stagger={0.08}
          />
        </h2>
        <Reveal delay={0.4} className="mt-12">
          <Link
            to="/events"
            className="group inline-flex items-center gap-4 bg-foreground px-8 py-4 font-mono text-xs tracking-[0.18em] text-background uppercase transition-colors duration-200 hover:bg-signal hover:text-white active:scale-[0.98]"
          >
            Find your event
            <ArrowRight
              size={15}
              aria-hidden="true"
              className="transition-transform duration-300 ease-out group-hover:translate-x-1"
            />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <ShowcaseFlythrough />
      <Manifesto />
      <Practice />
      <LivePulse />
      <EventsTeaser />
      <TeamTeaser />
      <ClosingCta />
    </>
  );
}
