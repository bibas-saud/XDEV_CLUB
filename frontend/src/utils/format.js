const DATE_OPTS = { year: "numeric", month: "short", day: "numeric" };

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", DATE_OPTS);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-US", DATE_OPTS)} · ${d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function timeUntil(value) {
  if (!value) return "";
  const diff = new Date(value).getTime() - Date.now();
  const hours = Math.floor(diff / 3_600_000);
  if (diff <= 0) return "expired";
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60_000))}m left`;
  if (hours < 48) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/** "HH:MM:SS" (or "HH:MM") -> "10:00 AM"; returns "—" for null. */
export function formatTime(value) {
  if (!value) return "—";
  const [h, m] = String(value).split(":").map(Number);
  if (Number.isNaN(h)) return "—";
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

/** Backend fee (string/number/null) + currency -> "₹100" | "Free". */
export function formatFee(amount, currency = "INR", isFree = false) {
  if (isFree || amount === null || amount === undefined) return "Free";
  const symbols = { INR: "₹", USD: "$", EUR: "€" };
  const symbol = symbols[currency] ?? `${currency} `;
  return `${symbol}${Number(amount)}`;
}
