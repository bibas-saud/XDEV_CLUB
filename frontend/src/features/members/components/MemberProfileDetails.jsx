import { useState } from "react";
import {
  Building2,
  GraduationCap,
  Hash,
  Layers,
  Phone,
  UserRound,
} from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/ui/brand-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SOCIALS = [
  { key: "facebook_url", label: "Facebook", Icon: FacebookIcon },
  { key: "instagram_url", label: "Instagram", Icon: InstagramIcon },
  { key: "linkedin_url", label: "LinkedIn", Icon: LinkedInIcon },
  { key: "twitter_url", label: "X (Twitter)", Icon: XIcon },
];

const DESC_LIMIT = 100;

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <p className="min-w-0">
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium break-words">{value}</span>
      </p>
    </div>
  );
}

function SocialLinks({ member }) {
  const socials = SOCIALS.filter(({ key }) => member[key]);
  if (!socials.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
      {socials.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={member[key]}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          aria-label={label}
          className="inline-flex size-8 items-center justify-center rounded-md border bg-card text-zinc-600 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon className="size-4" />
        </a>
      ))}
    </div>
  );
}

/** Rows + description (+ optional truncation with view-more hook) + socials */
function DetailsBody({ member, truncated = false, onViewMore }) {
  const rows = [
    { icon: Building2, label: "Department", value: member.department },
    { icon: GraduationCap, label: "Course", value: member.course },
    { icon: Layers, label: "Semester", value: member.semester },
    { icon: Hash, label: "Roll no", value: member.roll_no },
    { icon: Phone, label: "Phone", value: member.phone },
  ];

  const hasRows = rows.some((r) => r.value);
  const desc = member.description;
  const isLong = Boolean(desc && desc.length > DESC_LIMIT);
  const shown =
    truncated && isLong ? `${desc.slice(0, DESC_LIMIT).trimEnd()}\u2026` : desc;

  if (!hasRows && !desc && !SOCIALS.some(({ key }) => member[key])) {
    return (
      <p className="text-xs text-muted-foreground">
        No additional details yet. Use Edit to add academic info, phone, bio
        and social links.
      </p>
    );
  }

  return (
    <>
      {hasRows && (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <DetailRow key={row.label} {...row} />
          ))}
        </div>
      )}

      {shown && (
        <p className="whitespace-pre-line border-t pt-3 text-sm leading-relaxed text-zinc-700">
          {shown}
        </p>
      )}

      {truncated && isLong && (
        <button
          type="button"
          onClick={onViewMore}
          className="self-start text-xs font-semibold text-destructive hover:underline cursor-pointer"
        >
          View more
        </button>
      )}

      <SocialLinks member={member} />
    </>
  );
}

export function MemberProfileDetails({ member }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="px-4 pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-3.5 text-muted-foreground" />
            Profile details
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 px-4 pb-4 pt-0">
          <DetailsBody
            member={member}
            truncated
            onViewMore={() => setExpanded(true)}
          />
        </CardContent>
      </Card>

      {/* Full profile details popup */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" />
              Profile details
            </DialogTitle>
            <DialogDescription>{member.full_name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <DetailsBody member={member} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
