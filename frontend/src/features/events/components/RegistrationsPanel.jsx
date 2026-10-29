import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, ClipboardCheck, Loader2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ATTENDANCE_LABELS,
  PAYMENT_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
} from "@/features/events/constants";
import {
  useCancelRegistration,
  useRegisterParticipantAdmin,
  useRegistrations,
  useUpdateRegistration,
} from "@/features/events/hooks/useEvents";
import { ParticipantFormDialog } from "@/features/events/components/ParticipantFormDialog";
import { formatDate } from "@/utils/format";

const REG_VARIANT = {
  registered: "default",
  attended: "secondary",
  cancelled: "outline",
};

const PAY_VARIANT = {
  paid: "secondary",
  pending: "destructive",
  waived: "outline",
};

function MarkPaidDialog({
  registration,
  onClose,
  onConfirm,
  isPending,
}) {
  return (
    <Dialog open={Boolean(registration)} onOpenChange={(o) => !o && onClose()}>
      {/* key forces a fresh mount per registration → reference seeds cleanly */}
      {registration && (
        <MarkPaidForm
          key={registration.id}
          registration={registration}
          onClose={onClose}
          onConfirm={onConfirm}
          isPending={isPending}
        />
      )}
    </Dialog>
  );
}

function MarkPaidForm({ registration, onClose, onConfirm, isPending }) {
  const [reference, setReference] = useState(
    () => registration.payment_reference ?? ""
  );

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Mark payment as received</DialogTitle>
        <DialogDescription>
          Optionally record a transaction reference (UPI ID, receipt no…).
        </DialogDescription>
      </DialogHeader>
      <Input
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="UPI-1234567890"
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={isPending}
          onClick={() => onConfirm(reference.trim() || null)}
        >
          {isPending && <Loader2 className="animate-spin" />}
          Confirm payment
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function RegistrationsPanel({ event }) {
  const { data: registrations = [], isLoading } = useRegistrations(event.id);
  const updateRegistration = useUpdateRegistration(event.id);
  const cancelRegistration = useCancelRegistration(event.id);
  const registerParticipant = useRegisterParticipantAdmin(event.id);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(null);

  const activeCount =
    registrations.filter((r) => r.status !== "cancelled").length ?? 0;
  const isFull = activeCount >= event.max_capacity;
  // Cancel disappears once the event finished AND attendance was submitted.
  const cancelAllowed = !(
    event.status === "past" && event.attendance_submitted_at
  );

  function handleMarkPaid(reference) {
    if (!markingPaid) return;
    updateRegistration.mutate(
      {
        registrationId: markingPaid.id,
        payload: {
          payment_status: "paid",
          ...(reference ? { payment_reference: reference } : {}),
        },
      },
      { onSuccess: () => setMarkingPaid(null) }
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="size-4 text-muted-foreground" />
          Participants ({activeCount}/{event.max_capacity})
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/events/${event.id}/attendance`}>
              <ClipboardCheck /> Attendance
            </Link>
          </Button>
          {event.registration_open && event.status === "upcoming" && (
            <Button
              size="sm"
              disabled={isFull}
              onClick={() => setPickerOpen(true)}
            >
              <UserPlus />
              {isFull ? "Event full" : "Register participant"}
            </Button>
          )}
          {(!event.registration_open || event.status !== "upcoming") &&
            event.status === "upcoming" && (
              <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                Registration closed
              </span>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : !registrations.length ? (
          <p className="py-6 text-sm text-muted-foreground">
            Nobody registered yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead className="hidden md:table-cell">Details</TableHead>
                <TableHead className="hidden sm:table-cell">Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell>
                    <p className="font-medium">{reg.participant_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {reg.participant_email}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {[reg.participant_phone, reg.participant_college, reg.participant_roll_no]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDate(reg.registered_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant={REG_VARIANT[reg.status] ?? "outline"}>
                        {REGISTRATION_STATUS_LABELS[reg.status]}
                      </Badge>
                      {reg.attendance !== "pending" && (
                        <Badge
                          variant={reg.attendance === "present" ? "secondary" : "outline"}
                        >
                          {ATTENDANCE_LABELS[reg.attendance]}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.is_free ? (
                      <Badge variant="secondary">Free Entry</Badge>
                    ) : (
                      <Badge variant={PAY_VARIANT[reg.payment_status] ?? "outline"}>
                        {PAYMENT_STATUS_LABELS[reg.payment_status]}
                        {Number(reg.fee_amount) > 0 && ` · ${Number(reg.fee_amount)}`}
                        {reg.payment_reference ? ` · ${reg.payment_reference}` : ""}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {reg.payment_status === "pending" && reg.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMarkingPaid(reg)}
                        >
                          Mark paid
                        </Button>
                      )}
                      {cancelAllowed &&
                        reg.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:opacity-80"
                            disabled={cancelRegistration.isPending}
                            onClick={() => cancelRegistration.mutate(reg.id)}
                          >
                            Cancel
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ParticipantFormDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Register participant"
        description="Enter the participant's details. They'll receive a confirmation email."
        submitLabel="Register"
        paymentEvent={event.is_free ? null : event}
        onSubmit={(payload) =>
          registerParticipant.mutate(payload, {
            onSuccess: () => setPickerOpen(false),
          })
        }
        isPending={registerParticipant.isPending}
      />

      <MarkPaidDialog
        registration={markingPaid}
        onClose={() => setMarkingPaid(null)}
        onConfirm={handleMarkPaid}
        isPending={updateRegistration.isPending}
      />
    </Card>
  );
}
