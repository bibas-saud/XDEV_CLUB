import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Mail,
  Pencil,
  RotateCcw,
  Trash2,
  UserX,
} from "lucide-react";
import { apiError } from "@/config/api";
import {
  useDeactivateMember,
  useMember,
  usePurgeMember,
  useReactivateMember,
  useUpdateMember,
} from "@/features/members/hooks/useMembers";
import { MemberFormDialog } from "@/features/members/components/MemberFormDialog";
import { PhotoUploader } from "@/features/members/components/PhotoUploader";
import { IdCardGenerator } from "@/features/members/components/IdCardGenerator";
import { MemberProfileDetails } from "@/features/members/components/MemberProfileDetails";
import { withPhotoBust } from "@/features/members/photoBust";
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
import { formatDate } from "@/utils/format";
import { displayRole } from "@/utils/roleLabels";

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: member, isLoading, error } = useMember(id);
  const deactivate = useDeactivateMember();
  const reactivate = useReactivateMember();
  const updateMember = useUpdateMember();
  const purge = usePurgeMember();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[920px] flex-col gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-44 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="font-medium">Member not found</p>
        <p className="text-sm text-muted-foreground">
          {error ? apiError(error) : "This member may have been removed."}
        </p>
        <Button variant="outline" onClick={() => navigate("/admin/members")}>
          Back to members
        </Button>
      </div>
    );
  }

  function handleUpdate(payload) {
    updateMember.mutate(
      { id: member.id, payload },
      { onSuccess: () => setEditOpen(false) }
    );
  }

  function handlePurge() {
    purge.mutate(member.id, {
      onSuccess: () => {
        setPurgeOpen(false);
        navigate("/admin/members", { replace: true });
      },
    });
  }

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-3">
      <Link
        to="/admin/members"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All members
      </Link>

      {/* Profile header */}
      <Card>
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <PhotoUploader member={member} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold tracking-tight">{member.full_name}</h2>
              {member.is_active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Alumni</Badge>
              )}
            </div>
            <div className="mt-1.5">
              <Badge variant={member.role !== "member" ? "destructive" : "outline"}>
                {displayRole(member.role, member.is_active)}
              </Badge>
            </div>

            <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Mail className="size-3.5 shrink-0" /> {member.email}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-3.5 shrink-0" /> Joined{" "}
                {formatDate(member.joined_at)}
                {!member.is_active && member.left_at && <> · Left {formatDate(member.left_at)}</>}
              </span>
            </div>
          </div>

          <div className="flex flex-row flex-wrap gap-2 sm:flex-col">
            {member.is_active ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmOpen(true)}
                  disabled={deactivate.isPending}
                >
                  {deactivate.isPending ? <Loader2 className="animate-spin" /> : <UserX />}
                  Deactivate
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reactivate.mutate(member.id)}
                  disabled={reactivate.isPending}
                >
                  {reactivate.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                  Reactivate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setPurgeOpen(true)}
                  disabled={purge.isPending}
                >
                  {purge.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  Delete forever
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile photo + profile details, side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {member.photo_url ? (
              <img
                src={withPhotoBust(member)}
                alt={`Photo of ${member.full_name}`}
                className="mx-auto aspect-square w-full max-w-[240px] rounded-lg border object-cover"
              />
            ) : (
              <div className="mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center rounded-lg border border-dashed bg-muted text-xs text-muted-foreground">
                No photo yet
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {"Public photo shown on the club website and the generated ID card. JPEG/PNG/WebP - max 5 MB."}
            </p>
          </CardContent>
        </Card>

        <MemberProfileDetails member={member} />
      </div>

      {/* ID card generator - full width */}
      <IdCardGenerator member={member} />

      {/* Edit dialog */}
      <MemberFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        member={member}
        onSubmit={handleUpdate}
        isPending={updateMember.isPending}
      />

      {/* Deactivate confirm */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate member?</DialogTitle>
            <DialogDescription>
              {member.full_name} will move to the alumni section. Their profile and history are
              preserved and they can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deactivate.mutate(member.id, {
                  onSettled: () => setConfirmOpen(false),
                })
              }
              disabled={deactivate.isPending}
            >
              {deactivate.isPending && <Loader2 className="animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirm */}
      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent className="max-w-sm border-destructive/30">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete permanently?</DialogTitle>
            <DialogDescription>
              This will erase <span className="font-semibold text-foreground">{member.full_name}</span>{" "}
              along with their profile photo from the club records forever. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePurge} disabled={purge.isPending}>
              {purge.isPending && <Loader2 className="animate-spin" />}
              Yes, delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
