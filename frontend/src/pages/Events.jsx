import { useState } from "react";
import { CalendarPlus, Loader2, TriangleAlert } from "lucide-react";
import {
  useCreateEvent,
  useDeleteEvent,
  useEndEvent,
  useEvents,
  useReopenEvent,
  useUpdateEvent,
} from "@/features/events/hooks/useEvents";
import { EventFormDialog } from "@/features/events/components/EventFormDialog";
import { EmptyEvents, EventsTable } from "@/features/events/components/EventsTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "past", label: "Ended" },
];

export default function Events() {
  const [scope, setScope] = useState("upcoming");
  const { data: page, isLoading } = useEvents(scope);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const endEvent = useEndEvent();
  const reopenEvent = useReopenEvent();
  const deleteEvent = useDeleteEvent();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const events = page?.items ?? [];

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(event) {
    setEditing(event);
    setFormOpen(true);
  }

  function handleFormChange(open) {
    setFormOpen(open);
    if (!open) setEditing(null);
  }

  function handleSubmit(payload) {
    if (editing) {
      updateEvent.mutate(
        { id: editing.id, payload },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createEvent.mutate(payload, { onSuccess: () => setFormOpen(false) });
    }
  }

  return (
    <div className="flex h-[calc(100svh-5.5rem)] flex-col gap-4 md:h-[calc(100svh-6.5rem)] lg:h-[calc(100svh-7.5rem)]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Events</h2>
          <p className="text-sm text-muted-foreground">
            Create events, manage participants and track attendance.
          </p>
        </div>
        <Button onClick={openCreate}>
          <CalendarPlus /> New event
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
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : events.length ? (
          <EventsTable
            events={events}
            onEdit={openEdit}
            onEnd={(event) => endEvent.mutate(event.id)}
            onReopen={(event) => reopenEvent.mutate(event.id)}
            onDelete={(event) => setPendingDelete(event)}
          />
        ) : (
          <EmptyEvents scope={scope} />
        )}
      </div>

      <EventFormDialog
        open={formOpen}
        onOpenChange={handleFormChange}
        event={editing}
        onSubmit={handleSubmit}
        isPending={createEvent.isPending || updateEvent.isPending}
      />

      {/* Permanent delete confirmation */}
      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-5" /> Delete permanently?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong>"{pendingDelete?.name}"</strong> along with all of its
              registrations and uploaded media. Past events lose their history
              too. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteEvent.isPending}
              onClick={() =>
                deleteEvent.mutate(pendingDelete.id, {
                  onSuccess: () => setPendingDelete(null),
                })
              }
            >
              {deleteEvent.isPending && <Loader2 className="animate-spin" />}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
