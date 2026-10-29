import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  college: "",
  roll_no: "",
};

/**
 * Shared participant signup form.
 * Used by the admin registrations panel and the public event page.
 * When `paymentEvent` is provided (admin flow on a paid event), a
 * cash-in-person choice (received / waived) appears before submit.
 */
export function ParticipantFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  title = "Register participant",
  description = "Enter the participant's details below.",
  submitLabel = "Register",
  paymentEvent = null,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [paymentChoice, setPaymentChoice] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setErrors({});
      setPaymentChoice("");
      setReference("");
    }
  }, [open]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (paymentEvent && !["paid", "waived"].includes(paymentChoice)) {
      next.payment =
        "Choose whether the fee was received or is waived.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildPayload() {
    const clean = (v) => v.trim() || undefined;
    return {
      name: form.name.trim(),
      email: form.email.trim(),
      ...(clean(form.phone) ? { phone: clean(form.phone) } : {}),
      ...(clean(form.college) ? { college: clean(form.college) } : {}),
      ...(clean(form.roll_no) ? { roll_no: clean(form.roll_no) } : {}),
      ...(paymentEvent && {
        payment_status: paymentChoice,
        ...(paymentChoice === "paid" && clean(reference)
          ? { payment_reference: clean(reference) }
          : {}),
      }),
    };
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(buildPayload());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="participant-name">Full name *</Label>
            <Input
              id="participant-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Riya Sharma"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="participant-email">Email *</Label>
            <Input
              id="participant-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="riya@example.com"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="participant-phone">Phone</Label>
              <Input
                id="participant-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="9876543210"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="participant-roll">Roll no.</Label>
              <Input
                id="participant-roll"
                value={form.roll_no}
                onChange={(e) => set("roll_no", e.target.value)}
                placeholder="22CS048"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="participant-college">College</Label>
            <Input
              id="participant-college"
              value={form.college}
              onChange={(e) => set("college", e.target.value)}
              placeholder="XYZ Institute of Technology"
            />
          </div>

          {paymentEvent && (
            <div className="flex flex-col gap-1.5 rounded-md border bg-muted p-3">
              <Label>
                Payment — fee is ₹{Number(paymentEvent.fee_amount)}
              </Label>
              <div className="inline-flex w-fit overflow-hidden rounded-md border">
                <Button
                  type="button"
                  size="sm"
                  variant={paymentChoice === "paid" ? "default" : "ghost"}
                  className="rounded-none"
                  onClick={() => setPaymentChoice("paid")}
                >
                  Cash received
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={paymentChoice === "waived" ? "secondary" : "ghost"}
                  className="rounded-none border-l"
                  onClick={() => setPaymentChoice("waived")}
                >
                  Waive fee
                </Button>
              </div>
              {errors.payment && (
                <p className="text-xs text-destructive">{errors.payment}</p>
              )}
              {paymentChoice === "paid" && (
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Reference (optional) — UPI ID, receipt no…"
                />
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
