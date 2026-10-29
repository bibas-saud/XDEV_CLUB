export const MEMBER_ROLES = [
  { value: "member", label: "Member" },
  { value: "president", label: "President" },
  { value: "vice-president", label: "Vice President" },
  { value: "secretary", label: "Secretary" },
  { value: "treasurer", label: "Treasurer" },
  { value: "faculty-advisor", label: "Faculty Advisor" },
];

const LABEL_MAP = Object.fromEntries(MEMBER_ROLES.map((r) => [r.value, r.label]));

export function roleLabel(role) {
  return LABEL_MAP[role] ?? role;
}

/** Deactivated members are alumni: their role gets an "Ex " prefix. */
export function displayRole(role, isActive) {
  const label = roleLabel(role);
  return isActive ? label : `Ex ${label}`;
}

export function isLeadershipRole(role) {
  return role !== "member";
}
