import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiError } from "@/config/api";
import {
  createMember,
  deactivateMember,
  fetchIdCardUrl,
  fetchMember,
  fetchMembers,
  purgeMember,
  reactivateMember,
  updateMember,
  uploadIdCard,
  uploadMemberPhoto,
} from "@/features/members/services/membersApi";
import { markPhotoUploaded, withPhotoBust } from "@/features/members/photoBust";

/** Instantly swap the new photo into every cached member copy. */
function patchPhotoIntoCaches(queryClient, id) {
  const single = queryClient.getQueryData(["member", id]);
  const busted = withPhotoBust({ id, photo_url: single?.photo_url ?? null });
  if (single && busted) {
    queryClient.setQueryData(["member", id], { ...single, photo_url: busted });
  }
  for (const scope of ["active", "past", "all"]) {
    const list = queryClient.getQueryData(["members", scope]);
    if (Array.isArray(list)) {
      queryClient.setQueryData(["members", scope], list.map((m) =>
        m.id === id ? { ...m, photo_url: busted ?? m.photo_url } : m
      ));
    }
  }
}

export function useMembers(scope = "active") {
  return useQuery({
    queryKey: ["members", scope],
    queryFn: () => fetchMembers(scope),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Powers the dashboard (stats + Total joins chart). Polls lightly and
 * refetches on focus so joined-date edits / new members show up
 * automatically, even when the change happened in another tab or device.
 */
export function useAllMembers() {
  return useQuery({
    queryKey: ["members", "all"],
    queryFn: () => fetchMembers("all"),
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useMember(id) {
  return useQuery({
    queryKey: ["member", id],
    queryFn: () => fetchMember(id),
    enabled: Boolean(id),
  });
}

function useInvalidateMembers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["member"] });
    // member actions generate notifications; refresh the feed immediately
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
}

export function useCreateMember() {
  const invalidate = useInvalidateMembers();

  return useMutation({
    mutationFn: createMember,
    onSuccess: (member) => {
      invalidate();
      toast.success(`${member.full_name} added to the club.`);
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useUpdateMember() {
  const invalidate = useInvalidateMembers();

  return useMutation({
    mutationFn: ({ id, payload }) => updateMember(id, payload),
    onSuccess: (member) => {
      invalidate();
      toast.success(`Updated ${member.full_name}.`);
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useDeactivateMember() {
  const invalidate = useInvalidateMembers();

  return useMutation({
    mutationFn: deactivateMember,
    onSuccess: () => {
      invalidate();
      toast.success("Member deactivated. Moved to past members.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function usePurgeMember() {
  const invalidate = useInvalidateMembers();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purgeMember,
    onSuccess: (_data, id) => {
      invalidate();
      queryClient.removeQueries({ queryKey: ["member", id] });
      toast.success("Member permanently deleted. This cannot be undone.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useReactivateMember() {
  const invalidate = useInvalidateMembers();

  return useMutation({
    mutationFn: reactivateMember,
    onSuccess: () => {
      invalidate();
      toast.success("Member reactivated.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useUploadPhoto(id) {
  const invalidate = useInvalidateMembers();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file) => uploadMemberPhoto(id, file),
    onSuccess: () => {
      markPhotoUploaded(id);
      patchPhotoIntoCaches(queryClient, id);
      invalidate();
      toast.success("Photo updated.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useUploadIdCard(id) {
  const invalidate = useInvalidateMembers();

  return useMutation({
    mutationFn: (file) => uploadIdCard(id, file),
    onSuccess: () => {
      invalidate();
      toast.success("ID card uploaded.");
    },
    onError: (error) => toast.error(apiError(error)),
  });
}

export function useIdCardUrl(id) {
  return useQuery({
    queryKey: ["id-card", id],
    queryFn: () => fetchIdCardUrl(id),
    enabled: Boolean(id),
    staleTime: 30 * 60_000,
  });
}
