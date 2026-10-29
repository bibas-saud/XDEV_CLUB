import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, UserCheck, Users } from "lucide-react";
import { useAllMembers } from "@/features/members/hooks/useMembers";
import { usePendingInvitation } from "@/features/ownership/hooks/useOwnership";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { NotificationsPanel } from "@/features/notifications/components/NotificationsPanel";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ icon: Icon, label, value, sub, loading }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-14" />
          ) : (
            <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          )}
          {sub && !loading && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/** Total club joinings for the CURRENT year, grouped by month (resets Jan 1) */
function JoinsChart({ members }) {
  const counts = useMemo(() => {
    const year = new Date().getFullYear();
    const arr = new Array(12).fill(0);
    for (const m of members ?? []) {
      if (!m.joined_at) continue;
      const d = new Date(m.joined_at);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() !== year) continue; // reset every new year
      arr[d.getMonth()]++;
    }
    return arr;
  }, [members]);

  const max = Math.max(1, ...counts);

  return (
    <div className="flex h-24 items-stretch gap-[3px] sm:gap-1.5 px-1">
      {counts.map((count, idx) => (
        <div
          key={idx}
          className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
        >
          <span className="text-[9px] font-semibold tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {count}
          </span>
          <div className="flex h-14 w-full items-end">
            <div
              className="animate-bar-grow h-14 w-full origin-bottom rounded-t-md bg-zinc-200 transition-[transform,background-color] duration-300 ease-out group-hover:bg-primary dark:bg-zinc-800"
              style={{
                transform: `scaleY(${Math.max(4, (count / max) * 56) / 56})`,
                animationDelay: `${idx * 30}ms`,
              }}
              title={`${count} joined in ${MONTH_LABELS[idx]}`}
            />
          </div>
          <span className="text-[9px] font-medium leading-none text-muted-foreground sm:text-[11px]">
            {MONTH_LABELS[idx]}
          </span>
        </div>
      ))}
    </div>
  );
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Dashboard() {
  const { data: members, isLoading } = useAllMembers();
  const invitation = usePendingInvitation();
  useNotifications(); // keep polling for the header-independent unread state

  const stats = useMemo(() => {
    const all = members ?? [];
    return {
      total: all.length,
      active: all.filter((m) => m.is_active).length,
      past: all.filter((m) => !m.is_active).length,
    };
  }, [members]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">
          A snapshot of your club at a glance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total members" value={stats.total} loading={isLoading} />
        <StatCard icon={UserCheck} label="Active" value={stats.active} loading={isLoading} />
        <StatCard icon={CalendarDays} label="Alumni" value={stats.past} loading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">
              Total Club Joinings - {new Date().getFullYear()}
            </CardTitle>
            <CardDescription>Grouped by the month they joined</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <JoinsChart members={members} />
            )}
          </CardContent>
          <div className="mt-auto border-t px-6 py-3 text-center text-xs text-muted-foreground">
            All time members count - {members?.length ?? 0}
          </div>
        </Card>

        {/* Notifications */}
        <NotificationsPanel />
      </div>

      {/* Ownership alert */}
      {!invitation.isLoading && invitation.data && !invitation.data.is_expired && (
        <Link to="/admin/security" className="block">
          <Card className="lift border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30">
            <CardContent className="flex items-center gap-3 p-4">
              <ShieldCheck className="size-5 shrink-0 text-foreground" />
              <p className="text-sm">
                An ownership transfer invitation is waiting for{" "}
                <span className="font-medium">{invitation.data.invitee_email}</span>. Manage it in{" "}
                <span className="font-semibold text-foreground underline underline-offset-2">
                  Security
                </span>
                .
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Quick link to full activity */}
      <Link
        to="/admin/members"
        className="inline-flex items-center gap-1 self-start text-sm font-medium text-foreground hover:underline"
      >
        Manage members <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
