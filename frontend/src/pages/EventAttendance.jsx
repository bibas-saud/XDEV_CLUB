import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Lock,
  QrCode,
  X,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminEvent,
  useRegistrations,
  useSubmitAttendance,
  useUpdateRegistration,
} from "@/features/events/hooks/useEvents";
import { ATTENDANCE_LABELS } from "@/features/events/constants";
import { formatDateTime } from "@/utils/format";

const ATT_VARIANT = {
  present: "secondary",
  absent: "outline",
  pending: "destructive",
};

function CheckInQrDialog({ event, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);

  const checkInUrl = `${window.location.origin}/check-in/${event.check_in_token}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(checkInUrl, {
      width: 640,
      margin: 2,
      color: { dark: "#18181b", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [checkInUrl]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5" /> Check-in QR — {event.name}
          </DialogTitle>
          <DialogDescription>
            Display this on a screen at the venue. Participants scan it and
            enter their email to be marked present automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Check-in QR code"
              className="w-full max-w-xs rounded-lg border"
            />
          ) : (
            <Skeleton className="size-64 rounded-lg" />
          )}
          <p className="break-all text-center text-xs text-muted-foreground">
            {checkInUrl}
          </p>
        </div>

        <Button variant="outline" onClick={onClose}>
          <X /> Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function EventAttendance() {
  const { id } = useParams();
  const { data: event, isLoading: eventLoading, error: eventError } = useAdminEvent(id);
  const { data: registrations = [], isLoading: regsLoading } = useRegistrations(id);
  const updateRegistration = useUpdateRegistration(id);
  const submitAttendance = useSubmitAttendance(id);
  const [qrOpen, setQrOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  // Snapshot of attendance values as of page load / last submission.
  const [baseline, setBaseline] = useState(null);

  const submitted = Boolean(event?.attendance_submitted_at);
  const locked = Boolean(event?.attendance_locked);

  /** Resubmit activates only when something differs from the baseline. */
  const isDirty = useMemo(() => {
    if (!baseline || !submitted) return false;
    return registrations.some(
      (r) => r.status !== "cancelled" && baseline[r.id] !== r.attendance
    );
  }, [baseline, submitted, registrations]);

  // Fresh event → drop any previous baseline.
  useEffect(() => {
    setBaseline(null);
  }, [id]);

  // Once attendance is submitted and data has loaded, capture the baseline.
  useEffect(() => {
    if (!regsLoading && submitted && baseline === null) {
      setBaseline(
        Object.fromEntries(
          registrations
            .filter((r) => r.status !== "cancelled")
            .map((r) => [r.id, r.attendance])
        )
      );
    }
  }, [regsLoading, submitted, baseline, registrations]);

  const counts = useMemo(() => {
    const active = registrations.filter((r) => r.status !== "cancelled");
    return {
      present: active.filter((r) => r.attendance === "present").length,
      absent: active.filter((r) => r.attendance === "absent").length,
      pending: active.filter((r) => r.attendance === "pending").length,
      total: active.length,
    };
  }, [registrations]);

  if (eventLoading || !event) {
    if (eventError) {
      return (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Event not found.
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  function setAttendance(registrationId, attendance) {
    updateRegistration.mutate({ registrationId, payload: { attendance } });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to={`/admin/events/${id}`}>
              <ArrowLeft /> Back to event
            </Link>
          </Button>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <ClipboardCheck className="size-5 text-muted-foreground" />
            Attendance — {event.name}
          </h2>
        </div>
        <div className="flex gap-2">
          {!submitted && (
            <Button
              variant="outline"
              onClick={() => setConfirmSubmit(true)}
              disabled={updateRegistration.isPending}
            >
              <CheckCircle2 /> Submit attendance
            </Button>
          )}
          {submitted && !locked && (
            <Button
              variant={isDirty ? "default" : "outline"}
              disabled={!isDirty}
              title={
                isDirty
                  ? "Resubmit the edited attendance"
                  : "Make changes to enable resubmission"
              }
              onClick={() => setConfirmSubmit(true)}
              className={!isDirty ? "opacity-40 cursor-not-allowed" : ""}
            >
              <CheckCircle2 /> Resubmit attendance
            </Button>
          )}
          <Button onClick={() => setQrOpen(true)}>
            <QrCode /> Show check-in QR
          </Button>
        </div>
      </div>

      {/* Submission state banner */}
      {submitted && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            locked
              ? "border-zinc-300 bg-zinc-100 text-zinc-700"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {locked ? <Lock className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
          {locked ? (
            <span>Attendance submitted and locked. Records can no longer be modified.</span>
          ) : (
            <span>
              Attendance submitted — still editable until{" "}
              <strong>{formatDateTime(event.attendance_editable_until ?? null)}</strong>{" "}
              (24h after submission).
            </span>
          )}
        </div>
      )}

      {/* Counters */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Present", counts.present, "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400"],
          ["Absent", counts.absent, "border-destructive/30 bg-destructive/5 text-destructive"],
          [
            "Pending",
            counts.pending,
            "border-border bg-muted text-muted-foreground",
          ],
        ].map(([label, value, cls]) => (
          <Card key={label} className={cls}>
            <CardContent className="px-4 py-3">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">
                {label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Participants ({counts.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {regsLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !registrations.filter((r) => r.status !== "cancelled").length ? (
            <p className="py-6 text-sm text-muted-foreground">
              No participants to track yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead className="text-right">Mark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg) =>
                  reg.status === "cancelled" ? null : (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <p className="font-medium">{reg.participant_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {reg.participant_email}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ATT_VARIANT[reg.attendance] ?? "outline"}>
                          {ATTENDANCE_LABELS[reg.attendance]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex overflow-hidden rounded-md border">
                          <Button
                            size="sm"
                            variant={
                              reg.attendance === "present" ? "default" : "ghost"
                            }
                            className="rounded-none"
                            disabled={locked || updateRegistration.isPending}
                            onClick={() => setAttendance(reg.id, "present")}
                          >
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              reg.attendance === "absent"
                                ? "destructive"
                                : "ghost"
                            }
                            className="rounded-none border-l"
                            disabled={locked || updateRegistration.isPending}
                            onClick={() => setAttendance(reg.id, "absent")}
                          >
                            Absent
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}

          {updateRegistration.isPending && (
            <p className="mt-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Saving…
            </p>
          )}
        </CardContent>
      </Card>

      {qrOpen && <CheckInQrDialog event={event} onClose={() => setQrOpen(false)} />}

      {/* Submit / resubmit confirmation */}
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {submitted ? "Resubmit attendance?" : "Submit attendance?"}
            </DialogTitle>
            <DialogDescription>
              {submitted ? (
                <>
                  This overwrites the previously submitted attendance for all{" "}
                  {counts.total} participant(s). The edit deadline stays anchored
                  to your first submission — no extension.
                </>
              ) : (
                <>
                  This records attendance for all {counts.total} participant(s).
                  You'll still be able to make corrections and resubmit for 24
                  hours — after that, attendance is permanently locked.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>
              Cancel
            </Button>
            <Button
              disabled={submitAttendance.isPending}
              onClick={() =>
                submitAttendance.mutate(undefined, {
                  onSuccess: () => {
                    setConfirmSubmit(false);
                    // New baseline = current values → button dims until next edit
                    setBaseline(
                      Object.fromEntries(
                        registrations
                          .filter((r) => r.status !== "cancelled")
                          .map((r) => [r.id, r.attendance])
                      )
                    );
                  },
                })
              }
            >
              {submitAttendance.isPending && <Loader2 className="animate-spin" />}
              {submitted ? "Confirm resubmission" : "Confirm submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
