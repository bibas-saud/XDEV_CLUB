import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiError } from "@/config/api";
import {
  cancelRegistration,
  createEvent,
  deleteEvent,
  endEvent,
  fetchCheckInInfo,
  fetchEvent,
  fetchEventAdmin,
  fetchEvents,
  fetchRegistrations,
  registerParticipantAdmin,
  registerParticipantPublic,
  removeEventCover,
  removeEventMedia,
  reopenEvent,
  submitAttendance,
  submitCheckIn,
  updateEvent,
  updateRegistration,
  uploadEventCover,
  uploadEventPhotos,
  uploadEventVideos,
} from "@/features/events/services/eventsApi";

const SCOPES = ["upcoming", "ongoing", "past"];

export function useEvents(scope = "upcoming") {
  return useQuery({
    queryKey: ["events", scope],
    queryFn: () => fetchEvents(scope),
    staleTime: 10_000,
    refetchInterval: 60_000, // statuses auto-sync server-side; light polling keeps tabs fresh
  });
}

export function useEvent(id) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEvent(id),
    enabled: Boolean(id),
  });
}

/** Admin-only event detail (adds check_in_token for the attendance QR). */
export function useAdminEvent(id) {
  return useQuery({
    queryKey: ["event-admin", id],
    queryFn: () => fetchEventAdmin(id),
    enabled: Boolean(id),
  });
}

function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return () => {
    for (const scope of SCOPES) {
      queryClient.invalidateQueries({ queryKey: ["events", scope] });
    }
    queryClient.invalidateQueries({ queryKey: ["event"] });
    queryClient.invalidateQueries({ queryKey: ["event-admin"] });
    // event actions generate notifications; refresh the feed immediately
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: createEvent,
    onSuccess: (event) => {
      invalidate();
      toast.success(`Event "${event.name}" created.`);
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useUpdateEvent() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: ({ id, payload }) => updateEvent(id, payload),
    onSuccess: (event) => {
      invalidate();
      toast.success(`Updated "${event.name}".`);
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useEndEvent() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: endEvent,
    onSuccess: (event) => {
      invalidate();
      toast.success(`"${event.name}" ended. Moved to past events.`);
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useReopenEvent() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: reopenEvent,
    onSuccess: (event) => {
      invalidate();
      toast.success(`"${event.name}" reopened.`);
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

/** Lock in attendance — editable for 24h after, then frozen. */
export function useSubmitAttendance(eventId) {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: () => submitAttendance(eventId),
    onSuccess: () => {
      invalidate();
      toast.success("Attendance submitted. Editable for the next 24 hours.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEvents();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      invalidate();
      queryClient.removeQueries({ queryKey: ["event"] });
      toast.success("Event permanently deleted. This cannot be undone.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

function useInvalidateEventDetail() {
  const invalidateEvents = useInvalidateEvents();
  const queryClient = useQueryClient();
  return (eventId) => {
    invalidateEvents();
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    queryClient.invalidateQueries({ queryKey: ["public-event", eventId] });
    queryClient.invalidateQueries({ queryKey: ["registrations"] });
  };
}

export function useUploadEventMedia(eventId, kind) {
  const invalidate = useInvalidateEventDetail();
  const upload = kind === "photos" ? uploadEventPhotos : uploadEventVideos;

  return useMutation({
    mutationFn: (files) => upload(eventId, files),
    onSuccess: (_data, files) => {
      invalidate(eventId);
      toast.success(
        `${files.length} ${kind === "photos" ? "photo(s)" : "video(s)"} uploaded.`
      );
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useRemoveEventMedia(eventId) {
  const invalidate = useInvalidateEventDetail();

  return useMutation({
    mutationFn: ({ urls, type }) => removeEventMedia(eventId, urls, type),
    onSuccess: () => {
      invalidate(eventId);
      toast.success("Media removed.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useUploadEventCover(eventId) {
  const invalidate = useInvalidateEventDetail();

  return useMutation({
    mutationFn: (file) => uploadEventCover(eventId, file),
    onSuccess: () => {
      invalidate(eventId);
      toast.success("Cover image updated.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useRemoveEventCover(eventId) {
  const invalidate = useInvalidateEventDetail();

  return useMutation({
    mutationFn: () => removeEventCover(eventId),
    onSuccess: () => {
      invalidate(eventId);
      toast.success("Cover image removed.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useRegistrations(eventId) {
  return useQuery({
    queryKey: ["registrations", eventId],
    queryFn: () => fetchRegistrations(eventId),
    enabled: Boolean(eventId),
  });
}

/** Admin panel: register a participant by entering their details manually. */
export function useRegisterParticipantAdmin(eventId) {
  const invalidate = useInvalidateEventDetail();

  return useMutation({
    mutationFn: (payload) => registerParticipantAdmin(eventId, payload),
    onSuccess: (registration) => {
      invalidate(eventId);
      toast.success(`${registration.participant_name} registered.`);
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

/** Public website: participant signs themselves up. */
export function useRegisterParticipant(eventId) {
  const invalidate = useInvalidateEventDetail();

  return useMutation({
    mutationFn: (payload) => registerParticipantPublic(eventId, payload),
    onSuccess: () => {
      invalidate(eventId);
      toast.success("Registration successful!");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useUpdateRegistration(eventId) {
  const invalidate = useInvalidateEventDetail();

  return useMutation({
    mutationFn: ({ registrationId, payload }) =>
      updateRegistration(eventId, registrationId, payload),
    onSuccess: () => {
      invalidate(eventId);
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useCancelRegistration(eventId) {
  const invalidate = useInvalidateEventDetail();

  return useMutation({
    mutationFn: (registrationId) => cancelRegistration(eventId, registrationId),
    onSuccess: () => {
      invalidate(eventId);
      toast.success("Registration cancelled.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

// --- Public check-in page ---

export function useCheckInInfo(token) {
  return useQuery({
    queryKey: ["check-in-info", token],
    queryFn: () => fetchCheckInInfo(token),
    enabled: Boolean(token),
    retry: false,
    staleTime: 30_000,
  });
}

export function useSubmitCheckIn(token) {
  return useMutation({
    mutationFn: (email) => submitCheckIn(token, email),
    onError: (error) => toast.error(apiError(error)),
  });
}
