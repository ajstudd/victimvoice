// Plain-language wording for support conversations, shared by the app and website.

export type CaseStatus = "pending" | "in_progress" | "resolved" | "closed";

export const STATUS_COPY: Record<
  CaseStatus,
  { label: string; detail: string; tone: "waiting" | "active" | "done" }
> = {
  pending: {
    label: "Waiting for a reply",
    detail: "Your message was received. The support team hasn’t replied yet.",
    tone: "waiting",
  },
  in_progress: {
    label: "In conversation",
    detail: "The support team is working with you on this.",
    tone: "active",
  },
  resolved: {
    label: "Resolved",
    detail: "Marked as resolved. You can still send a message anytime.",
    tone: "done",
  },
  closed: {
    label: "Closed",
    detail: "This conversation is closed. Start a new one if you need help.",
    tone: "done",
  },
};

export function statusCopy(status: string) {
  return (
    STATUS_COPY[status as CaseStatus] || {
      label: status.replace(/_/g, " "),
      detail: "",
      tone: "waiting" as const,
    }
  );
}

// Values match the support_requests.harassment_type check constraint.
export const TOPICS = [
  ["cyber_harassment", "Online"],
  ["workplace_harassment", "Work"],
  ["stalking", "Being followed"],
  ["verbal_abuse", "Verbal abuse"],
  ["physical_threat", "Physical threat"],
  ["other", "Something else"],
] as const;

export function topicLabel(value: string) {
  return TOPICS.find(([key]) => key === value)?.[1] || "Something else";
}

// Values match support_requests.severity_level; worded as the reply the person wants.
export const URGENCY = [
  ["low", "Whenever someone can"],
  ["medium", "In the next day or so"],
  ["high", "As soon as possible"],
] as const;

export function urgencyLabel(value: string) {
  return (
    URGENCY.find(([key]) => key === value)?.[1] ||
    (value === "critical" ? "As soon as possible" : value)
  );
}

export function shortRef(id: string) {
  return id.slice(0, 6).toUpperCase();
}

export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
