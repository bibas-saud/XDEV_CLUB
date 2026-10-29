import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CommitTrail } from "@/components/site/CommitTrail";
import { Reveal, Stagger, StaggerItem } from "@/components/site/motion";
import { story } from "@/features/public/content";

export default function Story() {
  return (
    <>
      {/* Opening */}
      <section className="grain relative overflow-hidden pt-36 pb-20 sm:pt-44">
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
            <h1 className="display-tight max-w-6xl text-[clamp(2.8rem,8vw,7rem)] text-balance">
              <span className="block">{story.title}</span>
            </h1>
          </Reveal>
          <div className="mt-10 flex flex-col justify-between gap-4 border-t border-border pt-5 sm:flex-row">
            <Reveal delay={0.3}>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
                {story.lede}
              </p>
            </Reveal>
            <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              git log --oneline
            </p>
          </div>
        </div>
      </section>

      {/* Journey — the commit trail */}
      <section className="mx-auto max-w-3xl px-5 pb-28 sm:px-8">
        <CommitTrail steps={story.milestones} />
      </section>

      {/* Values — hairline cell grid */}
      <section className="border-y border-border bg-paper py-24 sm:py-28 dark:bg-[#0c0d10]">
        <div className="mx-auto max-w-[110rem] px-5 sm:px-8">
          <Reveal>
            <div className="flex items-baseline gap-5">
              <span className="font-mono text-xs text-signal">02</span>
              <h2 className="display-tight text-3xl tracking-tight uppercase sm:text-4xl">
                {story.values.title}
              </h2>
            </div>
          </Reveal>
          <Stagger className="mt-12 grid gap-px border border-border bg-border md:grid-cols-3" gap={0.1}>
            {story.values.items.map((value) => (
              <StaggerItem key={value.name} className="bg-background">
                <article className="h-full p-8 transition-colors duration-300 hover:bg-card sm:p-10">
                  <h3 className="display-tight text-2xl tracking-tight uppercase">
                    {value.name}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {value.body}
                  </p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Join — earned numbering, real sequence */}
      <section className="mx-auto max-w-4xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <div className="flex items-baseline gap-5">
            <span className="font-mono text-xs text-signal">03</span>
            <h2 className="display-tight text-3xl tracking-tight uppercase sm:text-5xl">
              {story.join.title}
            </h2>
          </div>
        </Reveal>
        <ol className="mt-14 border-t border-border">
          {story.join.steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <li className="group grid grid-cols-[auto_1fr] items-start gap-x-6 border-b border-border py-8 transition-colors duration-300 hover:bg-foreground/[0.03] sm:gap-x-10 sm:py-10 dark:hover:bg-white/[0.03]">
                <span className="display-tight pt-1 text-2xl text-signal tabular-nums sm:text-3xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="display-tight text-xl tracking-tight uppercase sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {step.body}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={0.2} className="mt-14 text-center">
          <p className="text-sm text-muted-foreground">{story.join.note}</p>
          <Link
            to={story.join.cta.href}
            className="group mt-7 inline-flex items-center gap-4 bg-foreground px-8 py-4 font-mono text-xs tracking-[0.18em] text-background uppercase transition-colors duration-200 hover:bg-signal hover:text-white active:scale-[0.98]"
          >
            {story.join.cta.label}
            <ArrowRight
              size={15}
              aria-hidden="true"
              className="transition-transform duration-300 ease-out group-hover:translate-x-1"
            />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
