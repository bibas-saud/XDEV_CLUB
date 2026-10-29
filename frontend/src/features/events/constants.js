export const EVENT_TYPES = ["workshop", "competitive"];

export const EVENT_TYPE_LABELS = {
  workshop: "Workshop",
  competitive: "Competitive",
};

/** Which prize places each structure includes, in display order. */
export const PRIZE_STRUCTURES = {
  first: ["1"],
  first_second: ["1", "2"],
  first_second_third: ["1", "2", "3"],
};

export const PRIZE_STRUCTURE_LABELS = {
  first: "1st place only",
  first_second: "1st + 2nd place",
  first_second_third: "1st + 2nd + 3rd place",
};

export const PLACE_LABELS = {
  1: "🥇 1st Place",
  2: "🥈 2nd Place",
  3: "🥉 3rd Place",
};

export const EVENT_STATUS_LABELS = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  past: "Ended",
};

export const REGISTRATION_STATUS_LABELS = {
  registered: "Registered",
  cancelled: "Cancelled",
};

export const ATTENDANCE_LABELS = {
  pending: "Pending",
  present: "Present",
  absent: "Absent",
};

/** Reopen is only allowed this many hours after an event was ended. */
export const REOPEN_WINDOW_HOURS = 24;

export const PAYMENT_STATUS_LABELS = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  waived: "Waived",
};

export const CURRENCIES = ["INR", "USD", "EUR"];

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
