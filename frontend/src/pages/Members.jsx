import { useState } from "react";
import { UserPlus } from "lucide-react";
import {
  useCreateMember,
  useMembers,
  useUpdateMember,
} from "@/features/members/hooks/useMembers";
import { MemberFormDialog } from "@/features/members/components/MemberFormDialog";
import { EmptyMembers, MembersTable } from "@/features/members/components/MembersTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "active", label: "Active" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
];

export default function Members() {
  const [scope, setScope] = useState("active");
  const { data: members, isLoading } = useMembers(scope);
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  function openCreate() {
    setEditingMember(null);
    setFormOpen(true);
  }

  function openEdit(member) {
    setEditingMember(member);
    setFormOpen(true);
  }

  function handleFormChange(open) {
    setFormOpen(open);
    if (!open) setEditingMember(null);
  }

  function handleSubmit(payload) {
    if (editingMember) {
      updateMember.mutate(
        { id: editingMember.id, payload },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createMember.mutate(payload, { onSuccess: () => setFormOpen(false) });
    }
  }

  return (
    <div className="flex h-[calc(100svh-5.5rem)] flex-col gap-4 md:h-[calc(100svh-6.5rem)] lg:h-[calc(100svh-7.5rem)]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage your club roster and leadership positions.
          </p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus /> Add member
        </Button>
      </div>

      <Tabs value={scope} onValueChange={setScope} className="shrink-0">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : members?.length ? (
          <MembersTable
            members={members}
            showLeftDate={scope !== "active"}
            onEdit={openEdit}
          />
        ) : (
          <EmptyMembers scope={scope} />
        )}
      </div>

      <MemberFormDialog
        open={formOpen}
        onOpenChange={handleFormChange}
        member={editingMember}
        onSubmit={handleSubmit}
        isPending={createMember.isPending || updateMember.isPending}
      />
    </div>
  );
}
