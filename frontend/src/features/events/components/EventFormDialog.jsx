import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  CURRENCIES,
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  PRIZE_STRUCTURES,
  PRIZE_STRUCTURE_LABELS,
} from "@/features/events/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_PRIZES = { amount: "", description: "" };

function buildInitialForm(event) {
  if (!event) {
    return {
      name: "",
      description: "",
      type: "workshop",
      venue: "",
      is_free: true,
      fee_amount: "",
      currency: "INR",
      max_capacity: "",
      prize_structure: "",
      has_certificates: false,
      certificate_details: "",
    };
  }
  return {
    name: event.name ?? "",
    description: event.description ?? "",
    type: event.type ?? "workshop",
    venue: event.venue ?? "",
    is_free: Boolean(event.is_free),
    fee_amount: event.fee_amount != null ? String(event.fee_amount) : "",
    currency: event.currency ?? "INR",
    max_capacity: event.max_capacity != null ? String(event.max_capacity) : "",
    prize_structure: event.prize_structure ?? "",
    has_certificates: Boolean(event.has_certificates),
    certificate_details: event.certificate_details ?? "",
  };
}

function clean(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function EventFormDialog({ open, onOpenChange, event, onSubmit, isPending }) {
  const [form, setForm] = useState(() => buildInitialForm(event));
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [prizes, setPrizes] = useState({});
  const [errors, setErrors] = useState({});
  const isEdit = Boolean(event);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm(event));
    setEventDate(event?.event_date ? String(event.event_date).slice(0, 10) : "");
    setStartTime(event?.start_time ? String(event.start_time).slice(0, 5) : "");
    setEndTime(event?.end_time ? String(event.end_time).slice(0, 5) : "");
    setPrizes(
      Object.fromEntries(
        Object.entries(event?.prizes ?? {}).map(([place, info]) => [
          place,
          {
            amount: info?.amount != null ? String(info.amount) : "",
            description: info?.description ?? "",
          },
        ])
      )
    );
    setErrors({});
  }, [open, event]);

  const prizePlaces = useMemo(
    () => (form.prize_structure ? PRIZE_STRUCTURES[form.prize_structure] : []),
    [form.prize_structure]
  );

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleTypeChange(type) {
    setForm((f) => ({
      ...f,
      type,
      // switching to workshop drops prize data entirely
      prize_structure: type === "workshop" ? "" : f.prize_structure || "first",
    }));
    if (type === "workshop") setPrizes({});
  }

  function handleStructureChange(structure) {
    set("prize_structure", structure);
    const next = {};
    for (const place of PRIZE_STRUCTURES[structure]) {
      next[place] = prizes[place] ?? { ...EMPTY_PRIZES };
    }
    setPrizes(next);
  }

  function setPrize(place, field, value) {
    setPrizes((p) => ({
      ...p,
      [place]: { ...p[place], [field]: value },
    }));
  }

  function validate() {
    const next = {};
    if (!clean(form.name)) next.name = "Name is required.";
    if (!clean(form.description)) next.description = "Description is required.";
    if (!clean(form.venue)) next.venue = "Venue is required.";
    if (!eventDate) next.event_date = "Date is required.";
    if (!startTime) next.start_time = "Start time is required.";
    const capacity = Number(form.max_capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      next.max_capacity = "Capacity must be a whole number of at least 1.";
    }
    if (!form.is_free && form.fee_amount === "") {
      next.fee_amount = "Fee is required for paid events.";
    }
    if (form.type === "competitive") {
      if (!form.prize_structure) {
        next.prize_structure = "Choose a prize structure.";
      }
      for (const place of prizePlaces) {
        const amount = Number(prizes[place]?.amount);
        if (prizes[place]?.amount === "" || Number.isNaN(amount) || amount < 0) {
          next[`prize_${place}`] = "Enter a valid amount.";
        }
      }
    }
    if (endTime && startTime && endTime <= startTime) {
      next.end_time = "End time must be after the start time.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildPayload() {
    const payload = {
      name: clean(form.name),
      description: clean(form.description),
      type: form.type,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime || null,
      venue: clean(form.venue),
      is_free: form.is_free,
      currency: form.currency,
      max_capacity: Number(form.max_capacity),
      has_certificates: form.has_certificates,
      certificate_details: form.has_certificates
        ? clean(form.certificate_details)
        : null,
    };

    if (!form.is_free) {
      payload.fee_amount = Number(form.fee_amount);
    }

    if (form.type === "competitive") {
      payload.prize_structure = form.prize_structure;
      payload.prizes = Object.fromEntries(
        prizePlaces.map((place) => [
          place,
          {
            amount: Number(prizes[place]?.amount),
            description: prizes[place]?.description?.trim() ?? "",
          },
        ])
      );
    }

    return payload;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(buildPayload());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit "${event?.name}"` : "Create event"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the event details below."
              : "Fill in the details for the new event."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SectionLabel>Basics</SectionLabel>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-name">Name</Label>
            <Input
              id="event-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="HackX Devs"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-description">Description</Label>
            <textarea
              id="event-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What is this event about?"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {EVENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-venue">Venue</Label>
              <Input
                id="event-venue"
                value={form.venue}
                onChange={(e) => set("venue", e.target.value)}
                placeholder="Main Auditorium"
              />
              {errors.venue && <p className="text-xs text-destructive">{errors.venue}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              {errors.event_date && (
                <p className="text-xs text-destructive">{errors.event_date}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-start">Starts</Label>
              <Input
                id="event-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              {errors.start_time && (
                <p className="text-xs text-destructive">{errors.start_time}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-end">Ends (opt.)</Label>
              <Input
                id="event-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              {errors.end_time && (
                <p className="text-xs text-destructive">{errors.end_time}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-capacity">Max capacity</Label>
              <Input
                id="event-capacity"
                type="number"
                min={1}
                value={form.max_capacity}
                onChange={(e) => set("max_capacity", e.target.value)}
                placeholder="50"
              />
              {errors.max_capacity && (
                <p className="text-xs text-destructive">{errors.max_capacity}</p>
              )}
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input
                id="event-free"
                type="checkbox"
                checked={form.is_free}
                onChange={(e) => set("is_free", e.target.checked)}
                className="size-4 cursor-pointer accent-primary transition-transform duration-100 active:scale-90"
              />
              <Label htmlFor="event-free" className="cursor-pointer">
                Free to join
              </Label>
            </div>
          </div>

          {!form.is_free && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-fee">Fee</Label>
                <Input
                  id="event-fee"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.fee_amount}
                  onChange={(e) => set("fee_amount", e.target.value)}
                  placeholder="100"
                />
                {errors.fee_amount && (
                  <p className="text-xs text-destructive">{errors.fee_amount}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => set("currency", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <SectionLabel>Certificates</SectionLabel>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                id="event-certs"
                type="checkbox"
                checked={form.has_certificates}
                onChange={(e) => set("has_certificates", e.target.checked)}
                className="size-4 cursor-pointer accent-primary transition-transform duration-100 active:scale-90"
              />
              <Label htmlFor="event-certs" className="cursor-pointer">
                Participation certificates included
              </Label>
            </div>
            {form.has_certificates && (
              <Input
                value={form.certificate_details}
                onChange={(e) => set("certificate_details", e.target.value)}
                placeholder="e.g. All participants receive certificates"
              />
            )}
          </div>

          {form.type === "competitive" && (
            <>
              <SectionLabel>Prizes</SectionLabel>
              <div className="flex flex-col gap-1.5">
                <Label>Prize structure</Label>
                <Select
                  value={form.prize_structure}
                  onValueChange={handleStructureChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="How many winners?" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIZE_STRUCTURE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.prize_structure && (
                  <p className="text-xs text-destructive">{errors.prize_structure}</p>
                )}
              </div>

              {prizePlaces.map((place) => (
                <div key={place} className="grid grid-cols-[7rem_1fr_1fr] gap-2">
                  <div className="flex items-center text-sm font-medium">
                    Place {place}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={prizes[place]?.amount ?? ""}
                      onChange={(e) => setPrize(place, "amount", e.target.value)}
                      placeholder="Amount"
                    />
                    {errors[`prize_${place}`] && (
                      <p className="text-xs text-destructive">
                        {errors[`prize_${place}`]}
                      </p>
                    )}
                  </div>
                  <Input
                    value={prizes[place]?.description ?? ""}
                    onChange={(e) => setPrize(place, "description", e.target.value)}
                    placeholder="Cash + Trophy (optional)"
                  />
                </div>
              ))}
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
