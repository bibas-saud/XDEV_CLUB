import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { PHOTO_TYPES } from "@/features/members/services/membersApi";
import { useUploadPhoto } from "@/features/members/hooks/useMembers";
import { ProfilePhotoCropper } from "@/features/members/components/ProfilePhotoCropper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/utils/format";
import { withPhotoBust } from "@/features/members/photoBust";

export function PhotoUploader({ member }) {
  const inputRef = useRef(null);
  const upload = useUploadPhoto(member.id);
  const [preview, setPreview] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);

  function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      alert("Photo must be a JPEG, PNG, or WebP image.");
      return;
    }
    setPendingImage({ url: URL.createObjectURL(file), file });
  }

  function handleCloseCropper() {
    if (pendingImage) URL.revokeObjectURL(pendingImage.url);
    setPendingImage(null);
  }

  const shownSrc = preview ?? withPhotoBust(member);

  return (
    <div className="relative inline-block">
      <Avatar className="size-20 border">
        {shownSrc && <AvatarImage src={shownSrc} alt={member.full_name} />}
        <AvatarFallback className="text-lg">{initials(member.full_name)}</AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        aria-label="Upload photo"
        className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-destructive disabled:opacity-60 cursor-pointer"
      >
        {upload.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Camera className="size-3.5" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        onChange={handleFile}
        hidden
      />

      <ProfilePhotoCropper
        open={Boolean(pendingImage)}
        onOpenChange={(open) => !open && handleCloseCropper()}
        image={pendingImage?.url}
        memberId={member.id}
        onUploaded={() => {
          if (preview) URL.revokeObjectURL(preview);
          setPreview(null);
        }}
      />
    </div>
  );
}
