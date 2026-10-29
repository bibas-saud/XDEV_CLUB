import { useState } from "react";
import { AlertTriangle, ArrowLeftRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  useCancelInvitation,
  useInviteSuccessor,
  usePendingInvitation,
} from "@/features/ownership/hooks/useOwnership";
import { InviteSuccessorDialog } from "@/features/ownership/components/InviteSuccessorDialog";
import { PendingInvitationCard } from "@/features/ownership/components/PendingInvitationCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Security() {
  const { admin } = useAuth();
  const invitation = usePendingInvitation();
  const invite = useInviteSuccessor();
  const cancel = useCancelInvitation();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Security & Ownership</h2>
        <p className="text-sm text-muted-foreground">
          This club has a single admin account. Ownership is handed over securely by email —
          there is no way to recover it without the successor's acceptance.
        </p>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="size-4 text-muted-foreground" />
            How ownership transfer works
          </CardTitle>
          <CardDescription>
            Currently signed in as <span className="font-medium text-foreground">{admin?.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 text-sm">
            {[
              "You invite a successor by entering their email below.",
              "They receive a one-time link valid for 48 hours.",
              "On accepting, they set their name and password — and become the admin.",
              `Your account (${admin?.email}) is permanently deleted. Log out happens automatically on your next action.`,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Pending invitation status */}
      {invitation.isLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : invitation.data ? (
        <PendingInvitationCard
          invitation={invitation.data}
          onCancel={() => cancel.mutate()}
          isCancelling={cancel.isPending}
        />
      ) : null}

      {/* Danger zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="size-4" /> Danger zone
          </CardTitle>
          <CardDescription>
            Transferring ownership cannot be undone. Only send an invitation if you are certain
            who should take over.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {invitation.data
              ? "A pending invitation exists. Cancel it before inviting someone else."
              : "No pending invitation."}
          </p>
          <Button
            onClick={() => setInviteOpen(true)}
            disabled={Boolean(invitation.data)}
            title={
              invitation.data
                ? "Cancel the current invitation first"
                : "Invite a successor"
            }
          >
            Transfer ownership
          </Button>
        </CardContent>
      </Card>

      <InviteSuccessorDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={(email) =>
          invite.mutate(email, { onSuccess: () => setInviteOpen(false) })
        }
        isPending={invite.isPending}
      />
    </div>
  );
}
