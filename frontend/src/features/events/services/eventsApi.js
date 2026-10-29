import { api } from "@/config/api";

export async function fetchEvents(scope = "upcoming", limit) {
  const { data } = await api.get("/events", {
    params: { status: scope, ...(limit ? { limit } : {}) },
  });
  return data;
}

export async function fetchEvent(id) {
  const { data } = await api.get(`/events/${id}`);
  return data;
}

/** Admin detail — includes check_in_token for the attendance QR. */
export async function fetchEventAdmin(id) {
  const { data } = await api.get(`/admin/events/${id}`);
  return data;
}

export async function createEvent(payload) {
  const { data } = await api.post("/admin/events", payload);
  return data;
}

export async function updateEvent(id, payload) {
  const { data } = await api.patch(`/admin/events/${id}`, payload);
  return data;
}

/** Permanently deletes the event, its registrations and stored media. */
export async function deleteEvent(id) {
  const { data } = await api.delete(`/admin/events/${id}`);
  return data;
}

/** Force an event into Past (e.g. it finished early). */
export async function endEvent(id) {
  const { data } = await api.post(`/admin/events/${id}/end`);
  return data;
}

/** Undo 'End event' — allowed for 24h after ending. */
export async function reopenEvent(id) {
  const { data } = await api.post(`/admin/events/${id}/reopen`);
  return data;
}

/** Locks attendance; editable for 24h after submission, then frozen. */
export async function submitAttendance(id) {
  const { data } = await api.post(`/admin/events/${id}/attendance/submit`);
  return data;
}

async function uploadFiles(id, kind, files) {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  const { data } = await api.post(
    `/admin/events/${id}/${kind}`,
    form
  );
  return data;
}

export const uploadEventPhotos = (id, files) => uploadFiles(id, "photos", files);
export const uploadEventVideos = (id, files) => uploadFiles(id, "videos", files);

export async function uploadEventCover(id, file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/admin/events/${id}/cover`, form);
  return data;
}

export async function removeEventCover(id) {
  const { data } = await api.delete(`/admin/events/${id}/cover`);
  return data;
}

export async function removeEventMedia(id, urls, type) {
  const { data } = await api.delete(`/admin/events/${id}/media`, {
    data: { urls, type },
  });
  return data;
}

/**
 * Register a participant for an event.
 * Payload: { name, email, phone?, college?, roll_no? }
 */
export async function registerParticipantAdmin(eventId, payload) {
  const { data } = await api.post(`/admin/events/${eventId}/register`, payload);
  return data;
}

/** Same flow, public website (no auth). Subject to backend rate limiting. */
export async function registerParticipantPublic(eventId, payload) {
  const { data } = await api.post(`/events/${eventId}/register`, payload);
  return data;
}

export async function fetchRegistrations(eventId, status) {
  const { data } = await api.get(`/admin/events/${eventId}/registrations`, {
    params: status ? { status } : {},
  });
  return data;
}

export async function updateRegistration(eventId, registrationId, payload) {
  const { data } = await api.patch(
    `/admin/events/${eventId}/registrations/${registrationId}`,
    payload
  );
  return data;
}

export async function cancelRegistration(eventId, registrationId) {
  const { data } = await api.delete(
    `/admin/events/${eventId}/registrations/${registrationId}`
  );
  return data;
}

// --- Public QR check-in (no auth) ---

/** Info shown on the check-in page before the participant enters their email. */
export async function fetchCheckInInfo(token) {
  const { data } = await api.get(`/check-in/${token}`);
  return data;
}

/** Marks the participant present; only works while the event is ongoing. */
export async function submitCheckIn(token, email) {
  const { data } = await api.post(`/check-in/${token}`, { email });
  return data;
}
