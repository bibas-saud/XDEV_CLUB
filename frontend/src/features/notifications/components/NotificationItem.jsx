import { Bell, RefreshCcw, Trash2, UserCog, UserMinus, UserPlus } from "lucide-react";
import { cn } from "@/utils/cn";

export const NOTIFICATION_TYPE_META = {
  member_added: { icon: UserPlus, className: "bg-muted text-foreground" },
  member_removed: { icon: UserMinus, className: "bg-zinc-100 text-zinc-600" },
  member_deactivated: { icon: UserMinus, className: "bg-zinc-100 text-zinc-600" },
  member_reactivated: { icon: RefreshCcw, className: "bg-green-50 text-green-600" },
  member_updated: { icon: UserCog, className: "bg-blue-50 text-blue-600" },
  member_deleted: { icon: Trash2, className: "bg-destructive/10 text-destructive" },
};

export function timeAgo(value) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationItem({ notification }) {
  const meta = NOTIFICATION_TYPE_META[notification.type] ?? {
    icon: Bell,
    className: "bg-zinc-100 text-zinc-600",
  };
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-3 rounded-md p-2">
      <span
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-full",
          meta.className
        )}
      >
        <Icon className="size-3.5" />
        {!notification.is_read && (
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            notification.is_read ? "text-muted-foreground" : "font-medium"
          )}
          title={notification.message}
        >
          {notification.message}
        </p>
        <time className="text-xs text-muted-foreground sm:hidden">
          {timeAgo(notification.created_at)}
        </time>
      </div>
      <time className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:block">
        {timeAgo(notification.created_at)}
      </time>
    </div>
  );
}
