import { cn } from "@/utils/cn";
import { Reveal, SplitWords } from "./motion";

/**
 * Section opener: mono index + label on the hairline, then the
 * uppercase display title. One system for every section on the site.
 */
export function SectionHeader({
  index,
  eyebrow,
  title,
  align = "left",
  className,
}) {
  const centered = align === "center";
  return (
    <div className={cn(centered && "text-center", className)}>
      {(index || eyebrow) && (
        <Reveal y={10} duration={0.5}>
          <p
            className={cn(
              "flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] uppercase",
              centered && "justify-center",
              "text-muted-foreground"
            )}
          >
            {index && (
              <>
                <span className="text-signal">{index}</span>
                <span aria-hidden="true" className="h-px w-8 bg-border" />
              </>
            )}
            {eyebrow && <span>{eyebrow}</span>}
          </p>
        </Reveal>
      )}
      <h2
        className={cn(
          "display-tight mt-5 text-[clamp(2rem,5.5vw,3.75rem)] text-balance",
          centered && "mx-auto"
        )}
      >
        {typeof title === "string" ? <SplitWords text={title} /> : title}
      </h2>
    </div>
  );
}
