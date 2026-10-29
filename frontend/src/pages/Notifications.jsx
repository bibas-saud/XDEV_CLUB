import { Link } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { useMarkAllRead, useNotificationsFeed } from "@/features/notifications/hooks/useNotifications";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Notifications() {
  const feed = useNotificationsFeed();
  const markAllRead = useMarkAllRead();
  const items = feed.data?.items ?? [];
  const unread = feed.data?.unread_count ?? 0;

  return (
    <div className="mx-auto flex h-[calc(100svh-5.5rem)] max-w-2xl flex-col gap-4 md:h-[calc(100svh-6.5rem)] lg:h-[calc(100svh-7.5rem)]">
      <Link
        to="/admin"
        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="flex-row items-start justify-between space-y-0 border-b">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="size-5" />
              All Notifications
              {unread > 0 && (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                  {unread} new
                </span>
              )}
            </CardTitle>
            <CardDescription>Everything that has happened in your club, newest first.</CardDescription>
          </div>
          {unread > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {feed.isLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-20 text-center">
              <Bell className="size-6 text-muted-foreground/40" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="max-w-[260px] text-xs text-muted-foreground">
                When members join, leave, or get updated, the activity will appear here.
              </p>
            </div>
          ) : (
            <div className="[&>*+*]:border-t [&>*]:py-1">
              {items.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
