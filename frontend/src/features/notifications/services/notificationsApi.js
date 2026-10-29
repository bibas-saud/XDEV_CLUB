import { api } from "@/config/api";

export async function fetchNotifications(limit = 20) {
  const { data } = await api.get("/notifications", { params: { limit } });
  return data; // { items, unread_count }
}

export async function markAllNotificationsRead() {
  const { data } = await api.post("/notifications/mark-read");
  return data;
}
