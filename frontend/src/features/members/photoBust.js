/**
 * Photo cache-busting: re-uploads overwrite the same Supabase path, so the
 * URL string stays identical and browsers/CDN serve stale images. We keep a
 * per-member version token (session-scoped) appended at render time.
 */

const bustTokens = new Map();

/** Call after a successful photo upload for this member id. */
export function markPhotoUploaded(id) {
  bustTokens.set(String(id), Date.now());
}

/** Returns photo_url with a cache-busting param when a re-upload happened. */
export function withPhotoBust(member) {
  if (!member?.photo_url) return null;
  const token = bustTokens.get(String(member.id));
  if (!token) return member.photo_url;
  const sep = member.photo_url.includes("?") ? "&" : "?";
  return `${member.photo_url}${sep}v=${token}`;
}
