import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  GraduationCap,
  Hash,
  Phone,
} from "lucide-react";
import { FacebookIcon, InstagramIcon, LinkedInIcon, XIcon } from "@/components/ui/brand-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { displayRole, isLeadershipRole } from "@/utils/roleLabels";
import { initials } from "@/utils/format";
import {
  EASE_EXPO,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/site/motion";
import { useActiveMembers } from "@/features/public/hooks/usePublicData";

const ROLE_ORDER = [
  "president",
  "vice-president",
  "secretary",
  "treasurer",
  "faculty-advisor",
];

function roleRank(role) {
  const i = ROLE_ORDER.indexOf(role);
  return i === -1 ? ROLE_ORDER.length : i;
}

const SOCIALS = [
  { key: "linkedin_url", label: "LinkedIn", Icon: LinkedInIcon },
  { key: "instagram_url", label: "Instagram", Icon: InstagramIcon },
  { key: "facebook_url", label: "Facebook", Icon: FacebookIcon },
  { key: "twitter_url", label: "X", Icon: XIcon },
];

function memberMeta(member) {
  const bits = [member.department, member.course];
  if (member.semester) bits.push(`Sem ${member.semester}`);
  return bits.filter(Boolean).join(" · ");
}

/* ------------------------------------------------------------------ */
/* Leadership — portrait plates, sharp edges, grayscale → color        */
/* ------------------------------------------------------------------ */

function SpotlightCard({ member, index, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(member)}
      aria-haspopup="dialog"
      className="group block w-full text-left focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[4/5] overflow-hidden border border-border bg-muted">
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt=""
            loading="lazy"
            width="480"
            height="600"
            className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 ease-out group-hover:scale-[1.04] group-hover:grayscale-0"
          />
        ) : (
          <span
            aria-hidden="true"
            className="display-tight grid h-full place-items-center text-6xl text-muted-foreground/30"
          >
            {initials(member.full_name)}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute top-3 left-3 bg-background/85 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase backdrop-blur"
        >
          {String(index).padStart(2, "0")}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/90 px-4 py-3 opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100"
        >
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
            View profile
          </span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3 border-b border-border py-4">
        <span className="display-tight text-2xl tracking-tight">
          {member.full_name}
        </span>
        <span className="font-mono text-[10px] tracking-[0.18em] text-signal uppercase">
          {displayRole(member.role, true)}
        </span>
      </div>
      {memberMeta(member) && (
        <p className="pt-3 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          {memberMeta(member)}
        </p>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Members — editorial index rows                                      */
/* ------------------------------------------------------------------ */

function MemberRow({ member, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(member)}
      aria-haspopup="dialog"
      className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-5 border-b border-border py-4 text-left transition-colors duration-200 hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring dark:hover:bg-white/[0.04]"
    >
      <span className="font-mono text-[11px] text-muted-foreground">
        {initials(member.full_name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium transition-colors duration-200 group-hover:text-signal">
          {member.full_name}
        </span>
        {memberMeta(member) && (
          <span className="block truncate font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            {memberMeta(member)}
          </span>
        )}
      </span>
      <ArrowUpRight
        size={15}
        aria-hidden="true"
        className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Profile dialog                                                      */
/* ------------------------------------------------------------------ */

function MemberDialogBody({ member }) {
  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="h-32 w-32 shrink-0 overflow-hidden border border-border max-sm:self-center">
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="display-tight grid h-full place-items-center text-3xl text-muted-foreground/40"
            >
              {initials(member.full_name)}
            </span>
          )}
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <DialogHeader className="space-y-1.5 text-center sm:text-left">
            <DialogTitle className="display-tight border-none text-2xl tracking-tight uppercase">
              {member.full_name}
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px] tracking-[0.18em] text-signal uppercase">
              {displayRole(member.role, true)}
            </DialogDescription>
          </DialogHeader>

          {(member.department || member.course || member.semester) && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <GraduationCap size={14} aria-hidden="true" />
              {[member.department, member.course].filter(Boolean).join(" · ")}
              {member.semester ? ` · Semester ${member.semester}` : ""}
            </p>
          )}
          {member.roll_no && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Hash size={14} aria-hidden="true" className="shrink-0" />
              {member.roll_no}
            </p>
          )}
          {member.phone && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground sm:block">
              <Phone size={14} aria-hidden="true" className="shrink-0" />
              {member.phone}
            </p>
          )}

          {(SOCIALS.some(({ key }) => member[key]) || member.description) && (
            <div className="mt-4">
              {member.description && (
                <p className="text-sm leading-relaxed text-foreground/90 text-pretty">
                  {member.description}
                </p>
              )}
              <div className="mt-4 flex justify-center gap-2 sm:justify-start">
                {SOCIALS.filter(({ key }) => member[key]).map(
                  ({ key, label, Icon }) => (
                    <a
                      key={key}
                      href={member[key]}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${label} profile of ${member.full_name}`}
                      className="grid h-9 w-9 place-items-center border border-border text-muted-foreground transition-colors duration-200 hover:border-signal hover:text-signal focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Icon size={15} aria-hidden="true" />
                    </a>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function TeamInner() {
  const { data, isLoading } = useActiveMembers();
  const [selected, setSelected] = useState(null);
  const members = (data ?? []).slice().sort((a, b) => {
    const byRole = roleRank(a.role) - roleRank(b.role);
    return byRole !== 0 ? byRole : a.full_name.localeCompare(b.full_name);
  });
  const leadership = members.filter((m) => isLeadershipRole(m.role));
  const core = members.filter((m) => !isLeadershipRole(m.role));

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
          <h1 className="display mt-8 text-[clamp(3.4rem,11vw,10rem)]">
            <span className="block">The</span>
            <span className="block text-stroke">People</span>
          </h1>
          <div className="mt-8 flex flex-col justify-between gap-4 border-t border-border pt-5 sm:flex-row">
            <Reveal delay={0.3}>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                The people behind the workshops, the hackathons, and the 2 AM
                pushes. Open any profile for the full record.
              </p>
            </Reveal>
            <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              {members.length} active
            </p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="mx-auto max-w-[110rem] px-5 pb-24 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse border border-border bg-muted"
              />
            ))}
          </div>
        </section>
      ) : members.length === 0 ? (
        <section className="mx-auto max-w-[110rem] px-5 pb-28 sm:px-8">
          <div className="border border-dashed border-border p-16 text-center">
            <p className="display-tight text-2xl text-muted-foreground">
              The roster is being written.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Profiles appear here as members are onboarded.
            </p>
          </div>
        </section>
      ) : (
        <>
          {leadership.length > 0 && (
            <section className="mx-auto max-w-[110rem] px-5 pb-24 sm:px-8">
              <Stagger className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" gap={0.1}>
                {leadership.map((member, i) => (
                  <StaggerItem key={member.id}>
                    <SpotlightCard
                      member={member}
                      index={i + 1}
                      onSelect={setSelected}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          )}

          {core.length > 0 && (
            <section className="mx-auto max-w-[110rem] px-5 pb-28 sm:px-8">
              <Reveal>
                <h2 className="flex items-baseline gap-4 border-t border-border pt-6">
                  <span className="font-mono text-xs text-signal">04</span>
                  <span className="display-tight text-2xl tracking-tight uppercase sm:text-3xl">
                    Members
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    ({core.length})
                  </span>
                </h2>
              </Reveal>
              <div className="mt-6 border-t border-border">
                {core.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE_EXPO }}
              >
                <MemberDialogBody member={selected} />
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Team() {
  return <TeamInner />;
}
