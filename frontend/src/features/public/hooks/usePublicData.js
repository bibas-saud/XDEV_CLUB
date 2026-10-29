import { useQuery } from "@tanstack/react-query";
import { fetchEvents, fetchEvent } from "@/features/events/services/eventsApi";
import { fetchMembers } from "@/features/members/services/membersApi";

/**
 * Public site data hooks. The underlying endpoints are public — no
 * admin cookie required. Longer staleTime keeps the marketing pages
 * calm; data still refetches on mount after 60s.
 */

export function usePublicEvents(status = "upcoming", limit = 20) {
  return useQuery({
    queryKey: ["public-events", status, limit],
    queryFn: () => fetchEvents(status, limit),
    staleTime: 60_000,
  });
}

export function usePublicEvent(id) {
  return useQuery({
    queryKey: ["public-event", id],
    queryFn: () => fetchEvent(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useActiveMembers() {
  return useQuery({
    queryKey: ["members", "active"],
    queryFn: () => fetchMembers("active"),
    staleTime: 60_000,
  });
}
