import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { fetchEvents } from "@/features/events/services/eventsApi";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
} from "@/features/events/constants";
import { formatDate, formatFee, formatTime } from "@/utils/format";

const TABS = ["upcoming", "ongoing", "past"];

function EventCard({ event }) {
  return (
    <Link to={`/public/events/${event.id}`} className="group">
      <Card className="lift h-full overflow-hidden">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight group-hover:underline">
              {event.name}
            </h3>
            <Badge variant={event.status === "ongoing" ? "secondary" : "outline"}>
              {EVENT_STATUS_LABELS[event.status]}
            </Badge>
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {formatDate(event.event_date)} · {formatTime(event.start_time)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {event.venue}
            </span>
            {event.type === "competitive" && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" />
                {event.spots_left} spot(s) left
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center gap-1.5 pt-2">
            <Badge variant="outline">{EVENT_TYPE_LABELS[event.type]}</Badge>
            <Badge variant={event.is_free ? "secondary" : "destructive"}>
              {formatFee(event.fee_amount, event.currency, event.is_free)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function PublicEvents() {
  const [scope, setScope] = useState("upcoming");
  const { data: page, isLoading } = useQuery({
    queryKey: ["public-events", scope],
    queryFn: () => fetchEvents(scope),
    staleTime: 30_000,
  });

  const events = page?.items ?? [];

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        <Logo />
      </header>

      <main className="animate-page-in mx-auto w-full max-w-5xl flex-1 p-4 pb-16 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Club Events</h1>
            <p className="text-sm text-muted-foreground">
              Workshops and competitions hosted by XDEV Club.
            </p>
          </div>
          <Tabs value={scope} onValueChange={setScope}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t} className="capitalize">
                  {EVENT_STATUS_LABELS[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        ) : !events.length ? (
          <div className="rounded-lg border border-dashed bg-card py-16 text-center">
            <p className="font-medium">Nothing here yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {scope === "upcoming"
                ? "No upcoming events announced — check back soon!"
                : `No ${scope} events.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
