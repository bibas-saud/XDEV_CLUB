import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/Logo";
import {
  useCheckInInfo,
  useSubmitCheckIn,
} from "@/features/events/hooks/useEvents";
import { apiError } from "@/config/api";
import { formatDate, formatTime } from "@/utils/format";

export default function PublicCheckIn() {
  const { token } = useParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const { data: event, isLoading, error: infoError } = useCheckInInfo(token);
  const checkIn = useSubmitCheckIn(token);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    checkIn.mutate(email.trim(), {
      onSuccess: setResult,
      onError: (err) => setError(apiError(err)),
    });
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        <Logo />
      </header>

      <main className="animate-page-in flex flex-1 items-start justify-center p-4 pt-10 md:p-8">
        <div className="w-full max-w-md">
          {isLoading ? (
            <Card>
              <CardContent className="flex flex-col gap-3 py-10">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </CardContent>
            </Card>
          ) : infoError || !event ? (
            <Card className="text-center">
              <CardContent className="py-12">
                <p className="font-semibold">Invalid check-in code</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {infoError ? apiError(infoError) : "This QR code is not valid."}
                </p>
              </CardContent>
            </Card>
          ) : result ? (
            /* Success */
            <Card className="overflow-hidden border-green-200 text-center">
              <div className="h-2 bg-green-500" />
              <CardContent className="flex flex-col items-center gap-3 py-10">
                <CheckCircle2 className="size-14 text-green-600" />
                <p className="text-xl font-bold">You're marked present!</p>
                <p className="text-sm text-muted-foreground">
                  {result.already_checked_in
                    ? `You were already checked in, ${result.participant_name}. See you inside!`
                    : `Thanks, ${result.participant_name}! Enjoy the event.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            /* Check-in form */
            <Card>
              <CardContent className="flex flex-col gap-5 py-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    {event.event_name}
                  </h1>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4" />
                      {formatDate(event.event_date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-4" />
                      {formatTime(event.start_time)} onwards
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4" />
                      {event.venue}
                    </span>
                  </div>
                </div>

                {event.status !== "ongoing" ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Check-in is currently closed. It opens when the event is
                    ongoing — please try again at the venue.
                  </p>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="checkin-email">
                        Enter the email you registered with
                      </Label>
                      <Input
                        id="checkin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoFocus
                      />
                      {error && (
                        <p className="text-xs text-destructive">{error}</p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={checkIn.isPending}
                      className="w-full"
                    >
                      {checkIn.isPending && (
                        <Loader2 className="animate-spin" />
                      )}
                      Mark me present
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
