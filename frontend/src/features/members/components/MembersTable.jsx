import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberRowActions } from "@/features/members/components/MemberRowActions";
import { formatDate, initials } from "@/utils/format";
import { displayRole } from "@/utils/roleLabels";
import { withPhotoBust } from "@/features/members/photoBust";

function StatusBadge({ isActive }) {
  return isActive ? (
    <Badge variant="success">Active</Badge>
  ) : (
    <Badge variant="secondary">Alumni</Badge>
  );
}

function RoleBadge({ member }) {
  const leadership = member.role !== "member";
  return (
    <Badge variant={leadership ? "destructive" : "outline"}>{displayRole(member.role, member.is_active)}</Badge>
  );
}

export function MembersTable({ members, showLeftDate = false, onEdit }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden rounded-lg border bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              {showLeftDate && <TableHead>Left</TableHead>}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Link to={`/admin/members/${m.id}`} className="flex items-center gap-3 group">
                    <Avatar>
                      {withPhotoBust(m) && <AvatarImage src={withPhotoBust(m)} alt={m.full_name} />}
                      <AvatarFallback>{initials(m.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium group-hover:underline">
                        {m.full_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <RoleBadge member={m} />
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={m.is_active} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(m.joined_at)}</TableCell>
                {showLeftDate && (
                  <TableCell className="text-muted-foreground">{formatDate(m.left_at)}</TableCell>
                )}
                <TableCell>
                  <MemberRowActions member={m} onEdit={onEdit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-2 sm:hidden">
        {members.map((m) => (
          <div key={m.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/admin/members/${m.id}`} className="flex min-w-0 items-center gap-3">
                <Avatar>
                  {withPhotoBust(m) && <AvatarImage src={withPhotoBust(m)} alt={m.full_name} />}
                  <AvatarFallback>{initials(m.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
              </Link>
              <MemberRowActions member={m} onEdit={onEdit} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <RoleBadge member={m} />
              <StatusBadge isActive={m.is_active} />
              <span className="ml-auto inline-flex items-center gap-1">
                Joined {formatDate(m.joined_at)} <ChevronRight className="size-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {!members.length && null}
    </>
  );
}

export function EmptyMembers({ scope }) {
  const message =
    scope === "past"
      ? "No alumni yet. Members who leave the club will appear here."
      : "No members yet. Add your first club member.";
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card py-16 text-center">
      <p className="text-sm font-medium">Nothing here yet</p>
      <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
      <ArrowRight className="size-4 text-zinc-300" />
    </div>
  );
}
