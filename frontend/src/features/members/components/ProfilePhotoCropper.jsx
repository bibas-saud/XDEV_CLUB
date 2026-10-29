import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Loader2, RotateCcw, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { PHOTO_MAX_BYTES } from "@/features/members/services/membersApi";
import { useUploadPhoto } from "@/features/members/hooks/useMembers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Bake the rotation into a data URL so crop coordinates stay valid. */
async function getRotatedImage(imageSrc, rotation) {
  if (!rotation) return imageSrc;
  const img = await loadImage(imageSrc);
  const rad = (rotation * Math.PI) / 180;
  const bw = Math.abs(img.width * Math.cos(rad)) + Math.abs(img.height * Math.sin(rad));
  const bh = Math.abs(img.width * Math.sin(rad)) + Math.abs(img.height * Math.cos(rad));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bw);
  canvas.height = Math.round(bh);
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return canvas.toDataURL("image/jpeg", 0.95);
}

const MAX_OUTPUT_DIMENSION = 1024;

async function createCroppedBlob(rotatedSrc, areaPixels) {
  const img = await loadImage(rotatedSrc);
  let { width, height } = areaPixels;
  const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    areaPixels.x,
    areaPixels.y,
    areaPixels.width,
    areaPixels.height,
    0,
    0,
    width,
    height
  );
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
}

export function ProfilePhotoCropper({ open, onOpenChange, image, memberId, onUploaded }) {
  const upload = useUploadPhoto(memberId);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const croppedAreaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setBusy(false);
      croppedAreaRef.current = null;
    }
  }, [open]);

  function handleCropComplete(_, areaPixels) {
    croppedAreaRef.current = areaPixels;
  }

  async function handleUpload() {
    if (!croppedAreaRef.current || !image) return;
    setBusy(true);
    try {
      const rotated = await getRotatedImage(image, rotation);
      const blob = await createCroppedBlob(rotated, croppedAreaRef.current);
      if (!blob || blob.size > PHOTO_MAX_BYTES) {
        toast.error("Cropped photo exceeds the 5 MB limit. Try a smaller zoom or source image.");
        return;
      }
      upload.mutate(new File([blob], "profile.jpg", { type: "image/jpeg" }), {
        onSuccess: () => {
          onOpenChange(false);
          onUploaded?.();
        },
        onSettled: () => setBusy(false),
      });
    } catch {
      toast.error("Could not process the selected image.");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust profile photo</DialogTitle>
          <DialogDescription>
            Drag to position · pinch or use the slider to zoom
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-zinc-900 sm:h-80">
          {image && (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={handleCropComplete}
              objectFit="horizontal-cover"
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Rotate left"
            onClick={() => setRotation((r) => (r + 270) % 360)}
            disabled={busy}
          >
            <RotateCcw />
          </Button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            aria-label="Zoom"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Rotate right"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            disabled={busy}
          >
            <RotateCw />
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={busy || upload.isPending}>
            {(busy || upload.isPending) && <Loader2 className="animate-spin" />}
            Crop &amp; upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
