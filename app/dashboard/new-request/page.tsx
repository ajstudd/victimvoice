"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createRequest } from "@/lib/requests";
import { DashboardShell } from "@/components/dashboard-shell";
import { PILOT_REGIONS } from "@/shared/sos";
import { TOPICS, URGENCY } from "@/shared/support-copy";

export default function NewRequest() {
  const isAuthenticated = useAuth();
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("other");
  const [urgency, setUrgency] = useState("medium");
  const [scopeId, setScopeId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!description.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const id = await createRequest({
        description,
        harassmentType: topic,
        severityLevel: urgency,
        allowVolunteers: false,
        scopeId: scopeId || null,
      });
      router.replace(`/dashboard/requests?id=${id}`);
    } catch {
      setError(
        "Your message couldn’t be sent. Please check your connection and try again.",
      );
      setSending(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <DashboardShell back={{ href: "/dashboard", label: "Your conversations" }}>
      <h1 className="vv-title">What’s going on?</h1>
      <p className="vv-lead">
        Write it in your own words. A few lines is enough — you can add more,
        and share screenshots or files, once the conversation starts.
      </p>
      <form className="vv-form" onSubmit={submit}>
        <div>
          <label className="vv-field-label" htmlFor="message">
            Your message
          </label>
          <textarea
            id="message"
            value={description}
            maxLength={20000}
            required
            autoFocus
            placeholder="For example: someone keeps messaging me after I asked them to stop…"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <span className="vv-field-label" id="topic-label">
            What is it about?<small>Optional</small>
          </span>
          <div
            className="vv-chips"
            role="radiogroup"
            aria-labelledby="topic-label"
          >
            {TOPICS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={topic === value}
                onClick={() => setTopic(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="vv-field-label">
            When would you like a reply?
          </legend>
          <div className="vv-choices">
            {URGENCY.map(([value, label]) => (
              <label className="vv-choice" key={value}>
                <input
                  type="radio"
                  name="urgency"
                  value={value}
                  checked={urgency === value}
                  onChange={() => setUrgency(value)}
                />
                {label}
              </label>
            ))}
          </div>
          {urgency === "high" && (
            <div className="vv-urgent" role="note" style={{ marginTop: 10 }}>
              <strong>Are you in danger right now?</strong>
              <p>
                The support team will see this first, but replies aren’t
                instant. Calling emergency services is faster.
              </p>
              <a className="vv-button vv-coral" href="tel:112">
                Call 112
              </a>
            </div>
          )}
        </fieldset>

        <label className="vv-field-label">
          Service area (optional)
          <select
            value={scopeId}
            onChange={(e) => setScopeId(e.target.value)}
            style={{ display: "block", padding: 12, width: "100%" }}
          >
            <option value="">Not sure / another area</option>
            {PILOT_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <p>
          Assigned employees provide support here. Volunteers cannot access this
          conversation.
        </p>
        <p className="vv-note">
          <LockKeyhole size={15} />
          Sending shares this message with your assigned support team. Your
          account contact, private notes and trusted circle are not included.
        </p>
        {error && (
          <p role="alert" className="vv-error">
            {error}
          </p>
        )}
        <div className="vv-form-actions">
          <button
            className="vv-button"
            type="submit"
            disabled={sending || !description.trim()}
          >
            <Send size={17} /> {sending ? "Sending…" : "Send to support"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
