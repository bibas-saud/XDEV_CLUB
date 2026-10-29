import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiError } from "@/config/api";
import {
  fetchNotifications,
  markAllNotificationsRead,
} from "@/features/notifications/services/notificationsApi";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(20),
    refetchInterval: 30_000,
  });
}

/** Full feed for the /notifications page — requests up to 100 items. */
export function useNotificationsFeed() {
  return useQuery({
    queryKey: ["notifications", "feed"],
    queryFn: () => fetchNotifications(100),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => toast.error(apiError(error)),
  });
}
