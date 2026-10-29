import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Trophy,
  Users,
  X as CloseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { registerParticipantPublic } from "@/features/events/services/eventsApi";
import { usePublicEvent } from "@/features/public/hooks/usePublicData";
import { apiError } from "@/config/api";
import { formatDate, formatFee, formatTime } from "@/utils/format";
import {
  EASE_EXPO,
  ImageReveal,
  Magnetic,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/site/motion";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/* Registration dialog                                                 */
/* ------------------------------------------------------------------ */

const EMPTY_FORM = { name: "", email: "", phone: "", college: "", roll_no: "" };

function RegisterDialog({ event, open, onOpenChange }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [registered, setRegistered] = useState(null);

  const mutation = useMutation({
    mutationFn: (payload) => registerParticipantPublic(event.id, payload),
    onSuccess: (registration) => setRegistered(registration),
    onError: (error) => {
      const status = error.response?.status;
      if (status === 409) {
        toast.error("This email is already registered for the event.");
      } else if (status === 429) {
        toast.error("Too many attempts. Wait a minute and try again.");
      } else {
        toast.error(apiError(error));
      }
    },
  });

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Full name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      college: form.college.trim() || null,
      roll_no: form.roll_no.trim() || null,
    });
  }

  function close() {
    onOpenChange(false);
    setTimeout(() => {
      setForm(EMPTY_FORM);
      setErrors({});
      setRegistered(null);
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="rounded-none sm:max-w-md">
        <AnimatePresence mode="wait">
          {registered ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE_EXPO }}
              className="py-6 text-center"
              role="status"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3, delay: 0.1 }}
                className="mx-auto grid h-14 w-14 place-items-center bg-signal text-white"
              >
                <Check size={24} aria-hidden="true" />
              </motion.span>
              <h3 className="display-tight mt-6 text-3xl tracking-tight uppercase">
                You're in.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
                {registered.participant_name}, your spot at{" "}
                <span className="font-medium text-foreground">{event.name}</span>{" "}
                is confirmed{event.is_free ? "" : " pending payment"} — see you
                there.
              </p>
              <Button
                onClick={close}
                variant="outline"
                className="mt-7 rounded-none font-mono text-xs tracking-[0.16em] uppercase"
              >
                Done
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              noValidate
            >
              <DialogTitle asChild>
                <h3 className="display-tight text-2xl tracking-tight uppercase">
                  Register
                </h3>
              </DialogTitle>
              <p className="mt-2 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                {event.name} · {formatFee(event.fee_amount, event.currency, event.is_free)}{" "}
                · {event.spots_left} spots left
              </p>

              <div className="mt-7 grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="reg-name" className="font-mono text-[10px] tracking-[0.18em] uppercase">
                    Full name *
                  </Label>
                  <Input
                    id="reg-name"
                    name="name"
                    autoComplete="name"
                    placeholder="Ada Lovelace…"
                    className="rounded-none"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reg-email" className="font-mono text-[10px] tracking-[0.18em] uppercase">
                    Email *
                  </Label>
                  <Input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    inputMode="email"
                    placeholder="you@college.edu…"
                    className="rounded-none"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="reg-phone" className="font-mono text-[10px] tracking-[0.18em] uppercase">
                      Phone
                    </Label>
                    <Input
                      id="reg-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="+91 98765 43210…"
                      className="rounded-none"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-college" className="font-mono text-[10px] tracking-[0.18em] uppercase">
                      College
                    </Label>
                    <Input
                      id="reg-college"
                      name="college"
                      autoComplete="organization"
                      placeholder="Your college…"
                      className="rounded-none"
                      value={form.college}
                      onChange={(e) => setField("college", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reg-roll" className="font-mono text-[10px] tracking-[0.18em] uppercase">
                    Roll no.
                  </Label>
                  <Input
                    id="reg-roll"
                    name="roll_no"
                    spellCheck={false}
                    placeholder="21CS001…"
                    className="rounded-none"
                    value={form.roll_no}
                    onChange={(e) => setField("roll_no", e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="mt-7 w-full rounded-none bg-foreground py-4 font-mono text-xs tracking-[0.18em] uppercase hover:bg-signal active:scale-[0.99]"
              >
                {mutation.isPending ? "Registering…" : "Confirm my spot"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Lightbox                                                            */
/* ------------------------------------------------------------------ */

function Lightbox({ photos, index, onClose }) {
  return (
    <Dialog open={index !== -1} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] max-w-4xl overflow-hidden border-border bg-transparent p-0 [&>button]:hidden"
      >
        <DialogTitle asChild>
          <span className="sr-only">Event photo viewer</span>
        </DialogTitle>
        <AnimatePresence mode="wait">
          {index !== -1 && (
            <motion.img
              key={photos[index]}
              src={photos[index]}
              alt={`Event photo ${index + 1} of ${photos.length}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_EXPO }}
              className="max-h-[92vh] w-full object-contain"
            />
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo viewer"
          className="absolute top-3 right-3 grid h-9 w-9 place-items-center bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CloseIcon size={16} aria-hidden="true" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Prizes — hairline cells                                             */
/* ------------------------------------------------------------------ */

const PLACE_META = {
  first: { label: "First place", accent: true },
  second: { label: "Second place", accent: false },
  third: { label: "Third place", accent: false },
};

function Prizes({ prizes }) {
  const entries = Object.entries(prizes ?? {}).filter(([, v]) => v);
  if (!entries.length) return null;
  return (
    <Stagger className="grid gap-px border border-border bg-border sm:grid-cols-3" gap={0.08}>
      {entries.map(([place, prize]) => {
        const meta = PLACE_META[place] ?? { label: place, accent: false };
        return (
          <StaggerItem key={place} className="bg-card">
            <div className="h-full p-6">
              <Trophy
                size={18}
                aria-hidden="true"
                className={meta.accent ? "text-signal" : "text-muted-foreground"}
              />
              <p className="mt-4 font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                {meta.label}
              </p>
              <p className="display-tight mt-2 text-3xl tracking-tight tabular-nums">
                {formatFee(prize.amount)}
              </p>
              {prize.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {prize.description}
                </p>
              )}
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function EventShowcase() {
  const { id } = useParams();
  const { data: event, isLoading, isError } = usePublicEvent(id);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(-1);

  if (isError || (!isLoading && !event)) {
    return (
      <section className="grid min-h-svh place-items-center px-5 pt-24 text-center">
        <div>
          <p className="font-mono text-[11px] tracking-[0.24em] text-signal uppercase">
            404 · not found
          </p>
          <h1 className="display-tight mt-5 text-4xl tracking-tight uppercase sm:text-6xl">
            This event has left the repo.
          </h1>
          <Button
            asChild
            variant="outline"
            className="mt-9 rounded-none font-mono text-xs tracking-[0.16em] uppercase"
          >
            <Link to="/events">
              <ArrowLeft aria-hidden="true" /> Back to events
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <div className="pt-16">
        <div className="h-[52svh] w-full animate-pulse bg-muted" />
        <div className="mx-auto max-w-[110rem] space-y-6 px-5 py-12 sm:px-8">
          <div className="h-12 w-2/3 animate-pulse bg-muted" />
          <div className="h-4 w-1/3 animate-pulse bg-muted" />
        </div>
      </div>
    );
  }

  const canRegister =
    event.status !== "past" &&
    event.registration_open &&
    event.spots_left > 0;

  const metaCells = [
    { icon: CalendarDays, label: "Date", value: formatDate(event.event_date) },
    {
      icon: Clock,
      label: "Time",
      value: `${formatTime(event.start_time)}${event.end_time ? ` – ${formatTime(event.end_time)}` : ""}`,
    },
    { icon: MapPin, label: "Venue", value: event.venue },
    {
      icon: Users,
      label: "Capacity",
      value: `${event.registration_count}/${event.max_capacity} · ${event.spots_left} left`,
    },
  ];

  return (
    <>
      {/* Cover — curtain reveal, meta strip below */}
      <section className="pt-16">
        <ImageReveal
          src={
            event.cover_image_url ??
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%23e5e5e5'/%3E%3C/svg%3E"
          }
          className="h-[52svh] min-h-[360px] w-full border-b border-border"
        />
        <div className="mx-auto max-w-[110rem] px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8, ease: EASE_EXPO }}
            className="pt-10"
          >
            <Link
              to="/events"
              className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              <ArrowLeft size={13} aria-hidden="true" /> All events
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.2em] uppercase">
              <span
                className={cn(
                  event.status === "ongoing" ? "text-signal" : "text-muted-foreground"
                )}
              >
                {event.status === "ongoing" ? "● live" : event.status}
              </span>
              <span className="text-muted-foreground">{event.type}</span>
              <span className="text-foreground">
                {formatFee(event.fee_amount, event.currency, event.is_free)}
              </span>
            </div>

            <h1 className="display-tight mt-4 max-w-5xl text-[clamp(2.6rem,7vw,5.5rem)] text-balance">
              {event.name}
            </h1>
          </motion.div>

          {/* meta strip */}
          <Reveal delay={0.2} className="mt-10">
            <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {metaCells.map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-card p-5">
                  <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                    <Icon size={13} aria-hidden="true" className="text-signal" />
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-medium break-words">{value}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto grid max-w-[110rem] gap-14 px-5 pt-16 pb-32 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-16">
          <Reveal>
            <p className="max-w-2xl whitespace-pre-line text-lg leading-relaxed text-foreground/85 text-pretty">
              {event.description}
            </p>
          </Reveal>

          {(event.prizes || event.has_certificates) && (
            <Reveal>
              <h2 className="flex items-center gap-4 font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
                <span className="text-signal">01</span> On the line
              </h2>
              <div className="mt-6 space-y-6">
                <Prizes prizes={event.prizes} />
                {event.has_certificates && (
                  <div className="flex items-start gap-4 border border-dashed border-border p-5">
                    <span className="mt-0.5 h-2 w-2 shrink-0 bg-signal" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold">
                        Certificates for participants
                      </p>
                      {event.certificate_details && (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {event.certificate_details}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {event.photos?.length > 0 && (
            <Reveal>
              <h2 className="flex items-center gap-4 font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
                <span className="text-signal">02</span> Moments
              </h2>
              <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-3">
                {event.photos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setPhotoIndex(i)}
                    aria-label={`Open photo ${i + 1}`}
                    className="group relative aspect-[4/3] overflow-hidden bg-card focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <img
                      src={url}
                      alt={`Event moment ${i + 1}`}
                      loading="lazy"
                      width="480"
                      height="360"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </Reveal>
          )}

          {event.videos?.length > 0 && (
            <Reveal>
              <h2 className="flex items-center gap-4 font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
                <span className="text-signal">03</span> Recordings
              </h2>
              <div className="mt-6 space-y-6">
                {event.videos.map((url) => (
                  <video
                    key={url}
                    src={url}
                    controls
                    preload="metadata"
                    playsInline
                    className="w-full border border-border bg-black"
                  />
                ))}
              </div>
            </Reveal>
          )}
        </div>

        {/* Registration rail */}
        <aside>
          <Reveal delay={0.15}>
            <div className="sticky top-24 border border-border">
              <div className="border-b border-border p-6">
                <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                  Entry
                </p>
                <p className="display-tight mt-2 text-4xl tracking-tight tabular-nums">
                  {formatFee(event.fee_amount, event.currency, event.is_free)}
                </p>
              </div>

              <div className="border-b border-border p-6">
                <div className="flex items-baseline justify-between font-mono text-[11px] tracking-wide uppercase">
                  <span className="text-muted-foreground">Filled</span>
                  <span className="tabular-nums">
                    {event.registration_count}/{event.max_capacity}
                  </span>
                </div>
                <div
                  role="img"
                  aria-label={`${Math.round((event.registration_count / Math.max(1, event.max_capacity)) * 100)}% full`}
                  className="mt-3 h-1 w-full bg-muted"
                >
                  <div
                    className={cn(
                      "h-full",
                      event.spots_left === 0 ? "bg-destructive" : "bg-signal"
                    )}
                    style={{
                      width: `${Math.min(100, (event.registration_count / Math.max(1, event.max_capacity)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-6">
                {canRegister ? (
                  <Magnetic strength={0.08} className="block w-full">
                    <button
                      type="button"
                      onClick={() => setRegisterOpen(true)}
                      className="group flex w-full items-center justify-between bg-foreground px-6 py-4 font-mono text-xs tracking-[0.18em] text-background uppercase transition-colors duration-200 hover:bg-signal hover:text-white active:scale-[0.99]"
                    >
                      Register now
                      <ArrowUpRight
                        size={16}
                        aria-hidden="true"
                        className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </button>
                  </Magnetic>
                ) : (
                  <p className="bg-muted px-4 py-3 text-center font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                    {event.spots_left <= 0
                      ? "Fully booked"
                      : event.registration_open
                        ? "Opens soon"
                        : "Registration closed"}
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        </aside>
      </div>

      <RegisterDialog
        event={event}
        open={registerOpen}
        onOpenChange={setRegisterOpen}
      />
      <Lightbox
        photos={event.photos ?? []}
        index={photoIndex}
        onClose={() => setPhotoIndex(-1)}
      />
    </>
  );
}
