import { api } from "@/config/api";

export async function loginApi(credentials) {
  return api.post("/auth/login", credentials);
}

export async function logoutApi() {
  return api.post("/auth/logout");
}

export async function meApi() {
  return api.get("/auth/me");
}
