import { api } from "@/config/api";

export async function fetchPendingInvitation() {
  try {
    const { data } = await api.get("/ownership/invitation");
    return data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

export async function inviteSuccessor(email) {
  const { data } = await api.post("/ownership/invitation", { email });
  return data;
}

export async function cancelInvitation() {
  const { data } = await api.delete("/ownership/invitation");
  return data;
}

export async function acceptTransfer({ token, full_name, password }) {
  const { data } = await api.post("/ownership/invitation/accept", {
    token,
    full_name,
    password,
  });
  return data;
}
