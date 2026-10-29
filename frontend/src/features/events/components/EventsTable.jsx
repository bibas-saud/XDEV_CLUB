import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/features/events/constants";
import { formatDate, formatFee, formatTime, timeUntil } from "@/utils/format";
import { EventRowActions } from "@/features/events/components/EventRowActions";

export function EventsTable({ events, onEdit, onEnd, onReopen, onDelete }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Timing</TableHead>
            <TableHead className="hidden md:table-cell">Venue</TableHead>
            <TableHead className="hidden lg:table-cell">Capacity</TableHead>
            <TableHead className="hidden sm:table-cell">Fee</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <Link
                  to={`/admin/events/${event.id}`}
                  className="font-medium hover:underline"
                >
                  {event.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <Badge variant="outline">{EVENT_TYPE_LABELS[event.type]}</Badge>
                  <Badge variant="default">{EVENT_STATUS_LABELS[event.status]}</Badge>
                </div>
              </TableCell>
              <TableCell>
                <p className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
                  <CalendarDays className="size-3.5 text-muted-foreground" />
                  {formatDate(event.event_date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(event.start_time)}
                  {event.end_time ? ` – ${formatTime(event.end_time)}` : ""}
                </p>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <p className="inline-flex items-center gap-1.5 text-sm">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {event.venue}
                </p>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <p className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
                  <Users className="size-3.5 text-muted-foreground" />
                  {event.registration_count}/{event.max_capacity}
                </p>
                <p className="text-xs text-muted-foreground">
                  {event.status === "upcoming"
                    ? `${timeUntil(`${event.event_date}T${event.start_time}`)}`
                    : `${event.spots_left} spot(s) left`}
                </p>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm">
                {formatFee(event.fee_amount, event.currency, event.is_free)}
              </TableCell>
              <TableCell>
                <EventRowActions
                  event={event}
                  onEdit={onEdit}
                  onEnd={onEnd}
                  onReopen={onReopen}
                  onDelete={onDelete}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function EmptyEvents({ scope }) {
  const messages = {
    upcoming: "No upcoming events yet. Create one to get started.",
    ongoing: "Nothing is happening right now.",
    past: "No past events recorded.",
  };
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
      <p className="font-medium">No events found</p>
      <p className="text-sm text-muted-foreground">{messages[scope]}</p>
    </div>
  );
}
