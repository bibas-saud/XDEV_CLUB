import { api } from "@/config/api";

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IDCARD_MAX_BYTES = 5 * 1024 * 1024;
export const IDCARD_TYPES = ["image/png"];

export async function fetchMembers(scope = "active") {
  const path = scope === "past" ? "/members/past" : scope === "all" ? "/members/all" : "/members";
  const { data } = await api.get(path);
  return data;
}

export async function fetchMember(id) {
  const { data } = await api.get(`/members/${id}`);
  return data;
}

export async function createMember(payload) {
  const { data } = await api.post("/members", payload);
  return data;
}

export async function updateMember(id, payload) {
  const { data } = await api.patch(`/members/${id}`, payload);
  return data;
}

export async function deactivateMember(id) {
  const { data } = await api.delete(`/members/${id}`);
  return data;
}

export async function purgeMember(id) {
  const { data } = await api.delete(`/members/${id}/purge`);
  return data;
}

export async function reactivateMember(id) {
  const { data } = await api.post(`/members/${id}/reactivate`);
  return data;
}

export async function uploadMemberPhoto(id, file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/members/${id}/photo`, form);
  return data;
}

export async function uploadIdCard(id, file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/members/${id}/id-card`, form);
  return data;
}

export async function fetchIdCardUrl(id) {
  const { data } = await api.get(`/members/${id}/id-card`);
  return data;
}
