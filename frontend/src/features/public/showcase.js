/**
 * Showcase reel media — auto-detected from src/assets/showcase.
 *
 * Drop images (.jpg/.jpeg/.png/.webp/.avif) or videos (.mp4/.webm) into
 * that folder and they appear in the homepage card tunnel. Filename order
 * is the play order, so prefix files to control it: `01-hackathon.mp4`,
 * `02-build-night.jpg`, … Display titles are derived from the filename;
 * override any of them via `showcaseTitles` in content.js.
 */

import { showcaseTitles } from "./content";

const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;
const VIDEO_RE = /\.(mp4|webm)$/i;

const modules = import.meta.glob(
  "../../assets/showcase/*.{jpg,jpeg,png,webp,avif,mp4,webm}",
  { eager: true, query: "?url", import: "default" },
);

/** "02-spring_build-night.jpg" → "Spring build night" */
function titleFromFilename(file) {
  const base = file.replace(/\.[^.]+$/, "");
  const cleaned = base
    .replace(/^[\d\s_\-.]+/, "")
    .replace(/[_\-.]+/g, " ")
    .trim();
  if (!cleaned) return base;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export const showcaseItems = Object.entries(modules)
  .sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  )
  .map(([path, src]) => {
    const file = path.split("/").pop();
    return {
      src,
      type: VIDEO_RE.test(file) ? "video" : IMAGE_RE.test(file) ? "image" : null,
      title:
        showcaseTitles[file.replace(/\.[^.]+$/, "")] ?? titleFromFilename(file),
    };
  })
  .filter((item) => item.type !== null);
