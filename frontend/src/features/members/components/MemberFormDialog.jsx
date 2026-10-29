import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MEMBER_ROLES } from "@/utils/roleLabels";
import { isValidEmail } from "@/utils/validators";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_FORM = {
  full_name: "",
  email: "",
  role: "member",
  department: "",
  course: "",
  semester: "",
  roll_no: "",
  phone: "",
  description: "",
  facebook_url: "",
  instagram_url: "",
  linkedin_url: "",
  twitter_url: "",
};

/** ISO string (or null) -> yyyy-mm-dd for <input type="date"> */
function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

/** yyyy-mm-dd -> naive midnight ISO; no timezone conversion so the picked
 *  calendar date survives the round trip exactly. */
function toNaiveIso(dateStr) {
  return `${dateStr}T00:00:00`;
}

const TODAY_LOCAL = (() => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
    t.getDate()
  ).padStart(2, "0")}`;
})();

function clean(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function MemberFormDialog({ open, onOpenChange, member, onSubmit, isPending }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [joinedDate, setJoinedDate] = useState("");
  const [leftDate, setLeftDate] = useState("");
  const [errors, setErrors] = useState({});
  const isEdit = Boolean(member);

  useEffect(() => {
    if (open) {
      setForm({
        full_name: member?.full_name ?? "",
        email: member?.email ?? "",
        role: member?.role ?? "member",
        department: member?.department ?? "",
        course: member?.course ?? "",
        semester: member?.semester ?? "",
        roll_no: member?.roll_no ?? "",
        phone: member?.phone ?? "",
        description: member?.description ?? "",
        facebook_url: member?.facebook_url ?? "",
        instagram_url: member?.instagram_url ?? "",
        linkedin_url: member?.linkedin_url ?? "",
        twitter_url: member?.twitter_url ?? "",
      });
      setJoinedDate(toDateInput(member?.joined_at));
      setLeftDate(toDateInput(member?.left_at));
      setErrors({});
    }
  }, [open, member]);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.full_name.trim()) next.full_name = "Full name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";

    if (form.semester !== "") {
      const sem = Number(form.semester);
      if (!Number.isInteger(sem) || sem < 1 || sem > 12)
        next.semester = "Semester must be a number between 1 and 12.";
    }

    if (isEdit && !joinedDate) next.joined_at = "Joined date is required.";
    if (isEdit && !member.is_active && !leftDate)
      next.left_at = "Past members need a left date.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    const semesterNum =
      form.semester === "" ? null : Number.parseInt(form.semester, 10);

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      role: form.role,
      department: clean(form.department),
      course: clean(form.course),
      semester: semesterNum,
      roll_no: clean(form.roll_no),
      phone: clean(form.phone),
      description: clean(form.description),
      facebook_url: clean(form.facebook_url),
      instagram_url: clean(form.instagram_url),
      linkedin_url: clean(form.linkedin_url),
      twitter_url: clean(form.twitter_url),
    };

    if (isEdit) {
      payload.joined_at = toNaiveIso(joinedDate);
      if (!member.is_active) {
        payload.left_at = toNaiveIso(leftDate);
      }
    }
    onSubmit(payload);
  }

  const fieldClass = "grid gap-2";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit member" : "Add member"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this member's details."
              : "Add a new member to the club roster."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          {/* Basics */}
          <div className="grid gap-4">
            <SectionLabel>Basics</SectionLabel>
            <div className={fieldClass}>
              <Label htmlFor="member-name">Full name</Label>
              <Input
                id="member-name"
                placeholder="Jane Doe"
                value={form.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name}</p>
              )}
            </div>

            <div className={fieldClass}>
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="jane@xdev.club"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setField("role", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="member-roll">Roll no</Label>
                <Input
                  id="member-roll"
                  placeholder="e.g. PUL021BCT001"
                  value={form.roll_no}
                  onChange={(e) => setField("roll_no", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Academic */}
          <div className="grid gap-4">
            <SectionLabel>Academic</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="member-department">Department</Label>
                <Input
                  id="member-department"
                  placeholder="Computer Engineering"
                  value={form.department}
                  onChange={(e) => setField("department", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="member-semester">Semester</Label>
                <Input
                  id="member-semester"
                  type="number"
                  min={1}
                  max={12}
                  placeholder="e.g. 4"
                  value={form.semester}
                  onChange={(e) => setField("semester", e.target.value)}
                />
                {errors.semester && (
                  <p className="text-xs text-destructive">{errors.semester}</p>
                )}
              </div>
            </div>

            <div className={fieldClass}>
              <Label htmlFor="member-course">Course</Label>
              <Input
                id="member-course"
                placeholder="BCT"
                value={form.course}
                onChange={(e) => setField("course", e.target.value)}
              />
            </div>
          </div>

          {/* Contact & about */}
          <div className="grid gap-4">
            <SectionLabel>Contact &amp; about</SectionLabel>
            <div className={fieldClass}>
              <Label htmlFor="member-phone">Phone number</Label>
              <Input
                id="member-phone"
                type="tel"
                placeholder="+977 98XXXXXXXX"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="member-description">Description</Label>
              <textarea
                id="member-description"
                rows={3}
                placeholder="Short bio shown on the member's profile..."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="flex min-h-[72px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {(isEdit || true) && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="member-facebook">Facebook URL</Label>
                  <Input
                    id="member-facebook"
                    type="url"
                    placeholder="facebook.com/jane"
                    value={form.facebook_url}
                    onChange={(e) => setField("facebook_url", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="member-instagram">Instagram URL</Label>
                  <Input
                    id="member-instagram"
                    type="url"
                    placeholder="instagram.com/jane"
                    value={form.instagram_url}
                    onChange={(e) => setField("instagram_url", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="member-linkedin">LinkedIn URL</Label>
                  <Input
                    id="member-linkedin"
                    type="url"
                    placeholder="linkedin.com/in/jane"
                    value={form.linkedin_url}
                    onChange={(e) => setField("linkedin_url", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="member-twitter">X (Twitter) URL</Label>
                  <Input
                    id="member-twitter"
                    type="url"
                    placeholder="x.com/jane"
                    value={form.twitter_url}
                    onChange={(e) => setField("twitter_url", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          {isEdit && (
            <div className="grid gap-4">
              <SectionLabel>Dates</SectionLabel>
              <div className={member.is_active ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
                <div className="grid gap-2">
                  <Label htmlFor="member-joined">Joined date</Label>
                  <Input
                    id="member-joined"
                    type="date"
                    max={TODAY_LOCAL}
                    value={joinedDate}
                    onChange={(e) => {
                      setJoinedDate(e.target.value);
                      setErrors((er) => ({ ...er, joined_at: undefined }));
                    }}
                  />
                  {errors.joined_at && (
                    <p className="text-xs text-destructive">{errors.joined_at}</p>
                  )}
                </div>

                {!member.is_active && (
                  <div className="grid gap-2">
                    <Label htmlFor="member-left">Left date</Label>
                    <Input
                      id="member-left"
                      type="date"
                      min={joinedDate}
                      value={leftDate}
                      onChange={(e) => {
                        setLeftDate(e.target.value);
                        setErrors((er) => ({ ...er, left_at: undefined }));
                      }}
                    />
                    {errors.left_at && (
                      <p className="text-xs text-destructive">{errors.left_at}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
