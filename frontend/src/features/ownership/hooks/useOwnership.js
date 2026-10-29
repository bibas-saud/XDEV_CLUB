import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiError } from "@/config/api";
import {
  acceptTransfer,
  cancelInvitation,
  fetchPendingInvitation,
  inviteSuccessor,
} from "@/features/ownership/services/ownershipApi";

export function usePendingInvitation() {
  return useQuery({
    queryKey: ["ownership-invitation"],
    queryFn: fetchPendingInvitation,
    staleTime: 15_000,
  });
}

export function useInviteSuccessor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inviteSuccessor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownership-invitation"] });
      toast.success("Invitation sent. Your successor has been emailed an accept link.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownership-invitation"] });
      toast.success("Invitation cancelled.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useAcceptTransfer() {
  return useMutation({
    mutationFn: acceptTransfer,
    onError: (error) => toast.error(apiError(error)),
  });
}
