import { Clock, Loader2, Mail, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, timeUntil } from "@/utils/format";

export function PendingInvitationCard({ invitation, onCancel, isCancelling }) {
  const expired = invitation.is_expired;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          {expired ? (
            <Clock className="size-5 text-amber-600" />
          ) : (
            <Mail className="size-5 text-amber-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">Pending invitation</p>
            <Badge variant={expired ? "secondary" : "destructive"}>
              {expired ? "Expired" : "Awaiting response"}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            Sent to <span className="font-medium text-foreground">{invitation.invitee_email}</span>{" "}
            on {formatDate(invitation.created_at)} ·{" "}
            {expired
              ? "this link is no longer valid"
              : `expires ${timeUntil(invitation.expires_at)}`}
          </p>
        </div>

        <Button variant="outline" onClick={onCancel} disabled={isCancelling}>
          {isCancelling ? <Loader2 className="animate-spin" /> : <XCircle />}
          Cancel invite
        </Button>
      </CardContent>
    </Card>
  );
}
