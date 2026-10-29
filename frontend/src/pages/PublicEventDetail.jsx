import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  Trophy,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/Logo";
import { fetchEvent } from "@/features/events/services/eventsApi";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  PLACE_LABELS,
} from "@/features/events/constants";
import { useRegisterParticipant } from "@/features/events/hooks/useEvents";
import { ParticipantFormDialog } from "@/features/events/components/ParticipantFormDialog";
import { apiError } from "@/config/api";
import { formatDate, formatFee, formatTime } from "@/utils/format";

export default function PublicEventDetail() {
  const { id } = useParams();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registeredName, setRegisteredName] = useState(null);
  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-event", id],
    queryFn: () => fetchEvent(id),
    retry: false,
    staleTime: 60_000,
  });
  const register = useRegisterParticipant(id);

  const canRegister =
    event &&
    event.status === "upcoming" &&
    event.registration_open &&
    event.spots_left > 0;

  function handleRegister(payload) {
    register.mutate(payload, {
      onSuccess: (registration) => {
        setRegisteredName(registration.participant_name);
        setRegisterOpen(false);
      },
    });
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        <Logo />
        <Button variant="ghost" size="sm" asChild>
          <Link to="/public/events">
            <ArrowLeft /> All events
          </Link>
        </Button>
      </header>

      <main className="animate-page-in mx-auto w-full max-w-4xl flex-1 p-4 pb-16 md:p-8">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : error || !event ? (
          <Card className="mx-auto max-w-md text-center">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <p className="font-semibold">Event not found</p>
              <p className="text-sm text-muted-foreground">
                {error ? apiError(error) : "It may have been removed."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <article className="flex flex-col gap-6">
            {/* Banner — whole image visible, blurred fill keeps it polished */}
            {event.cover_image_url && (
              <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-xl border shadow-sm md:h-80">
                {/* blurred backdrop from the same image */}
                <img
                  src={event.cover_image_url}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl"
                />
                {/* crisp, uncropped image */}
                <img
                  src={event.cover_image_url}
                  alt={`${event.name} banner`}
                  className="relative z-10 max-h-full w-auto max-w-full object-contain"
                />
              </div>
            )}

            {/* Title block */}
            <header className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{EVENT_TYPE_LABELS[event.type]}</Badge>
                <Badge variant="secondary">
                  {EVENT_STATUS_LABELS[event.status]}
                </Badge>
                <Badge variant={event.is_free ? "secondary" : "destructive"}>
                  {formatFee(event.fee_amount, event.currency, event.is_free)}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>

              {registeredName ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  <CheckCircle2 className="size-5 shrink-0 text-green-600" />
                  <span>
                    You're registered{registeredName ? `, ${registeredName}` : ""}!
                    A confirmation email is on its way. See you there!
                  </span>
                </div>
              ) : (
                canRegister && (
                  <Button
                    size="lg"
                    className="self-start"
                    onClick={() => setRegisterOpen(true)}
                  >
                    <Users /> Register for this event
                  </Button>
                )
              )}

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {formatDate(event.event_date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {formatTime(event.start_time)}
                  {event.end_time ? ` – ${formatTime(event.end_time)}` : ""}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {event.venue}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" />
                  {event.spots_left} spot(s) left
                </span>
              </div>
            </header>

            {/* Description */}
            <Card>
              <CardContent className="py-5 text-sm leading-relaxed whitespace-pre-wrap">
                {event.description}
              </CardContent>
            </Card>

            {/* Prizes */}
            {event.prizes && Object.keys(event.prizes).length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Trophy className="size-4" /> Prizes
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.entries(event.prizes)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([place, info]) => (
                      <Card key={place}>
                        <CardContent className="py-4 text-center">
                          <p className="font-medium">
                            {PLACE_LABELS[Number(place)] ?? `Place ${place}`}
                          </p>
                          <p className="mt-1 text-xl font-bold">
                            {formatFee(info.amount, event.currency)}
                          </p>
                          {info.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {info.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
                {event.has_certificates && (
                  <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <GraduationCap className="size-4" />
                    {event.certificate_details ||
                      "Certificates for participants."}
                  </p>
                )}
              </section>
            )}

            {/* Media */}
            {event.photos.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Photos
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {event.photos.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      loading="lazy"
                      className="aspect-video w-full rounded-lg border object-cover"
                    />
                  ))}
                </div>
              </section>
            )}

            {event.videos.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Videos
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {event.videos.map((url) => (
                    <video
                      key={url}
                      src={url}
                      controls
                      preload="metadata"
                      className="aspect-video w-full rounded-lg border bg-black"
                    />
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </main>

      {event && (
        <ParticipantFormDialog
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          title={`Register for ${event.name}`}
          description="Fill in your details to secure a spot. You'll get a confirmation email."
          submitLabel="Confirm registration"
          onSubmit={handleRegister}
          isPending={register.isPending}
        />
      )}
    </div>
  );
}
