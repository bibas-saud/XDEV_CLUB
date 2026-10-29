import { useRef, useState } from "react";
import { Film, ImagePlus, Loader2, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  VIDEO_MAX_BYTES,
  VIDEO_TYPES,
} from "@/features/events/constants";
import { useRemoveEventMedia, useUploadEventMedia } from "@/features/events/hooks/useEvents";
import { toast } from "sonner";

function validateFiles(files, kinds, maxBytes, label) {
  for (const file of files) {
    if (!kinds.includes(file.type)) {
      toast.error(`"${file.name}" is not a supported ${label} format.`);
      return false;
    }
    if (file.size > maxBytes) {
      toast.error(
        `"${file.name}" exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`
      );
      return false;
    }
  }
  return true;
}

function MediaGrid({ urls, kind, onRemove, canRemove }) {
  if (!urls.length) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        {kind === "photos" ? <ImagePlus className="size-4" /> : <Video className="size-4" />}
        No {kind} yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {urls.map((url) => (
        <div
          key={url}
          className="group relative overflow-hidden rounded-lg border bg-muted"
        >
          {kind === "photos" ? (
            <img src={url} alt="" className="aspect-video w-full object-cover" />
          ) : (
            <video src={url} controls className="aspect-video w-full bg-black" />
          )}
          {canRemove && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1.5 right-1.5 size-7 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => onRemove(url)}
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">Remove</span>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export function MediaManager({ event }) {
  const photoInput = useRef(null);
  const videoInput = useRef(null);
  const [pendingKind, setPendingKind] = useState(null);

  const uploadPhotos = useUploadEventMedia(event.id, "photos");
  const uploadVideos = useUploadEventMedia(event.id, "videos");
  const removeMedia = useRemoveEventMedia(event.id);

  const isUploading = uploadPhotos.isPending || uploadVideos.isPending;

  function handlePick(kind) {
    const input = kind === "photos" ? photoInput : videoInput;
    input.current?.click();
  }

  function handleChange(kind, e) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const ok =
      kind === "photos"
        ? validateFiles(files, IMAGE_TYPES, IMAGE_MAX_BYTES, "image")
        : validateFiles(files, VIDEO_TYPES, VIDEO_MAX_BYTES, "video");
    if (!ok) return;

    setPendingKind(kind);
    const mutation = kind === "photos" ? uploadPhotos : uploadVideos;
    mutation.mutate(files, { onSettled: () => setPendingKind(null) });
  }

  function handleRemove(url) {
    const type = event.photos.includes(url)
      ? "photos"
      : event.videos.includes(url)
        ? "videos"
        : null;
    if (!type) return;
    removeMedia.mutate({ urls: [url], type });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Film className="size-4 text-muted-foreground" />
          Event media
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => handlePick("photos")}
          >
            {uploadPhotos.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            Add photos
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => handlePick("videos")}
          >
            {uploadVideos.isPending ? <Loader2 className="animate-spin" /> : <Video />}
            Add videos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <input
          ref={photoInput}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => handleChange("photos", e)}
        />
        <input
          ref={videoInput}
          type="file"
          accept={VIDEO_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => handleChange("videos", e)}
        />

        <section className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Photos ({event.photos.length})
          </h4>
          <MediaGrid
            urls={event.photos}
            kind="photos"
            onRemove={handleRemove}
            canRemove={!removeMedia.isPending}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Videos ({event.videos.length})
          </h4>
          <MediaGrid
            urls={event.videos}
            kind="videos"
            onRemove={handleRemove}
            canRemove={!removeMedia.isPending}
          />
        </section>

        {pendingKind && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Uploading {pendingKind}…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
