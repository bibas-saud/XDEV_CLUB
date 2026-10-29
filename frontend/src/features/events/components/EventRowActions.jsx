import { Link } from "react-router-dom";
import {
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Settings2,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { REOPEN_WINDOW_HOURS } from "@/features/events/constants";

/** Reopen is only offered within 24h of ending. */
function canReopen(event) {
  if (!event.ended_at) return false;
  const elapsed = Date.now() - new Date(event.ended_at).getTime();
  return elapsed < REOPEN_WINDOW_HOURS * 3_600_000;
}

export function EventRowActions({ event, onEdit, onEnd, onReopen, onDelete }) {
  const isPast = event.status === "past";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal />
          <span className="sr-only">Event actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {!isPast && (
          <>
            <DropdownMenuItem asChild>
              <Link to={`/admin/events/${event.id}`}>
                <Settings2 /> Manage event
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit?.(event)}>
              <Pencil /> Edit details…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onEnd?.(event)}>
              <XCircle /> End event
            </DropdownMenuItem>
          </>
        )}
        {isPast && canReopen(event) && (
          <DropdownMenuItem onSelect={() => onReopen?.(event)}>
            <RotateCcw /> Reopen
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onDelete?.(event)}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 /> Delete permanently…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
