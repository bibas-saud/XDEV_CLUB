import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useMarkAllRead, useNotifications } from "@/features/notifications/hooks/useNotifications";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationsPanel() {
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const items = data?.items ?? [];
  const unread = data?.unread_count ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" />
            Notifications
            {unread > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {unread}
              </span>
            )}
          </CardTitle>
          <CardDescription>Latest activity across the club</CardDescription>
        </div>
        <div className="flex items-center gap-1.5">
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark read
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" className="gap-1 text-destructive hover:opacity-80">
            <Link to="/admin/notifications">
              View all
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-10 text-center">
            <Bell className="size-5 text-zinc-300" />
            <p className="text-sm font-medium">Nothing yet</p>
            <p className="max-w-[220px] text-xs text-muted-foreground">
              Club activity will show up here — new members, departures, role changes and more.
            </p>
          </div>
        ) : (
          <>
            {/* fixed height + scroll so the panel never stretches the page */}
            <div className="scrollbar-thin max-h-[180px] overflow-y-auto pr-1 [&>*+*]:border-t">
              {items.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
            <Link
              to="/admin/notifications"
              className="mt-2 inline-flex items-center gap-1 border-t pt-3 text-sm font-medium text-foreground hover:underline sm:hidden"
            >
              View all notifications
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
