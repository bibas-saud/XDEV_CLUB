import { useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  GraduationCap,
  ImagePlus,
  Loader2,
  MapPin,
  RefreshCw,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminEvent,
  useRemoveEventCover,
  useUploadEventCover,
} from "@/features/events/hooks/useEvents";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  PLACE_LABELS,
} from "@/features/events/constants";
import { MediaManager } from "@/features/events/components/MediaManager";
import { RegistrationsPanel } from "@/features/events/components/RegistrationsPanel";
import { formatDate, formatFee, formatTime } from "@/utils/format";

const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COVER_MAX_BYTES = 5 * 1024 * 1024;

function CoverStrip({ event }) {
  const inputRef = useRef(null);
  const upload = useUploadEventCover(event.id);
  const remove = useRemoveEventCover(event.id);

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!COVER_TYPES.includes(file.type)) {
      toast.error("Cover must be a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      toast.error("Cover exceeds the 5 MB limit.");
      return;
    }
    // Landscape only — keeps the public banner layout predictable.
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= img.height) {
        toast.error("Cover must be a landscape image (wider than tall).");
        return;
      }
      upload.mutate(file);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Could not read that image file.");
    };
    img.src = url;
  }

  const busy = upload.isPending || remove.isPending;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {event.cover_image_url ? (
        <div className="group relative">
          <div className="relative flex h-48 items-center justify-center overflow-hidden bg-zinc-100 md:h-64">
            <img
              src={event.cover_image_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl"
            />
            <img
              src={event.cover_image_url}
              alt={`${event.name} cover`}
              className="relative z-10 max-h-full w-auto max-w-full object-contain"
            />
          </div>
          <div className="absolute top-2 right-2 z-20 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {upload.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Replace
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => remove.mutate()}
            >
              <Trash2 /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-28 w-full flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 md:h-32"
        >
          {upload.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ImagePlus className="size-5" />
          )}
          Add cover image
          <span className="text-xs">Landscape JPG, PNG or WebP · max 5 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={COVER_TYPES.join(",")}
        hidden
        onChange={handleFile}
      />
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const { data: event, isLoading, error } = useAdminEvent(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-semibold">Event not found</p>
        <p className="text-sm text-muted-foreground">It may have been removed.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/events">
            <ArrowLeft /> Back to events
          </Link>
        </Button>
      </div>
    );
  }

  const prizeEntries = event.prizes
    ? Object.entries(event.prizes).sort((a, b) => Number(a[0]) - Number(b[0]))
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to="/admin/events">
              <ArrowLeft /> All events
            </Link>
          </Button>
          <h2 className="text-xl font-bold tracking-tight">{event.name}</h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge variant="outline">{EVENT_TYPE_LABELS[event.type]}</Badge>
                <Badge>{EVENT_STATUS_LABELS[event.status]}</Badge>
            <Badge variant={event.is_free ? "secondary" : "destructive"}>
              {formatFee(event.fee_amount, event.currency, event.is_free)}
            </Badge>
            {event.has_certificates && (
              <Badge variant="secondary">
                <GraduationCap className="size-3" /> Certificates
              </Badge>
            )}
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          {event.registration_count}/{event.max_capacity} registered
        </span>
      </div>

      {/* Cover */}
      <CoverStrip event={event} />

      {/* Info card */}
      <Card>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <span className="inline-flex items-center gap-2 text-sm">
            <CalendarDays className="size-4 text-muted-foreground" />
            {formatDate(event.event_date)}
          </span>
          <span className="inline-flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            {formatTime(event.start_time)}
            {event.end_time ? ` – ${formatTime(event.end_time)}` : ""}
          </span>
          <span className="inline-flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            {event.venue}
          </span>
          <span className="inline-flex items-center gap-2 text-sm">
            <Users className="size-4 text-muted-foreground" />
            {event.spots_left} spot(s) left
          </span>
          <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
            {event.description}
          </p>

          {prizeEntries.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-4">
              <h4 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Trophy className="size-3.5" /> Prizes
              </h4>
              <ul className="flex flex-col gap-1 text-sm">
                {prizeEntries.map(([place, info]) => (
                  <li key={place}>
                    <strong>{PLACE_LABELS[Number(place)] ?? `Place ${place}`}:</strong>{" "}
                    {formatFee(info.amount, event.currency)}
                    {info.description ? ` — ${info.description}` : ""}
                  </li>
                ))}
              </ul>
              {event.certificate_details && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  🎓 {event.certificate_details}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media + registrations */}
      <MediaManager event={event} />
      <RegistrationsPanel event={event} />
    </div>
  );
}
