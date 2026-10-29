import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  UserX,
} from "lucide-react";
import {
  useDeactivateMember,
  usePurgeMember,
  useReactivateMember,
} from "@/features/members/hooks/useMembers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MemberRowActions({ member, onEdit }) {
  const deactivate = useDeactivateMember();
  const reactivate = useReactivateMember();
  const purge = usePurgeMember();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);

  function handleDeactivate() {
    deactivate.mutate(member.id, { onSettled: () => setConfirmOpen(false) });
  }

  function handlePurge() {
    purge.mutate(member.id, { onSettled: () => setPurgeOpen(false) });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.full_name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {member.is_active && onEdit && (
            <>
              <DropdownMenuItem onClick={() => onEdit(member)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem asChild>
            <Link to={`/admin/members/${member.id}`}>
              <Eye /> View details
            </Link>
          </DropdownMenuItem>

          {member.is_active ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmOpen(true)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <UserX /> Deactivate
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => reactivate.mutate(member.id)}
                disabled={reactivate.isPending}
              >
                {reactivate.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                Reactivate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setPurgeOpen(true)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 /> Delete permanently
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deactivate confirmation */}
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
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactivate.isPending}>
              {deactivate.isPending && <Loader2 className="animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirmation */}
      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent className="max-w-sm border-destructive/30">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete permanently?</DialogTitle>
            <DialogDescription>
              This will erase <span className="font-semibold text-foreground">{member.full_name}</span>{" "}
              along with their profile photo from the club records forever. Consider deactivating
              instead if you might need their history later.
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
    </>
  );
}
