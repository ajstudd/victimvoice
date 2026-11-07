"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  FileImage,
  Link2,
  Paperclip,
  ShieldCheck,
  X,
  ExternalLink,
  Eye,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { supportError, reviewEvidence } from "@/lib/support";
import {
  addEvidenceLink,
  listEvidence,
  openEvidence,
  uploadEvidence,
} from "@/shared/case-evidence";
import {
  EVIDENCE_TYPES,
  EvidenceItem,
  evidenceSize,
  validateEvidenceFile,
} from "@/shared/evidence";

type Preview = { item: EvidenceItem; blobUrl?: string; link?: string };
export function EvidencePanel({
  requestId,
  owner = false,
  reviewer = false,
  watermark = "Private case",
}: {
  requestId: string;
  owner?: boolean;
  reviewer?: boolean;
  watermark?: string;
}) {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const generation = useRef(0);
  const blobUrl = useRef<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const clearPreview = useCallback(() => {
    generation.current++;
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    blobUrl.current = null;
    setPreview(null);
  }, []);
  const refresh = useCallback(async () => {
    try {
      setItems(await listEvidence(getSupabase(), requestId));
      setError("");
    } catch (e) {
      setError(supportError(e));
    }
  }, [requestId]);
  useEffect(() => {
    void refresh();
    const protect = () => {
      if (document.hidden) clearPreview();
    };
    document.addEventListener("visibilitychange", protect);
    window.addEventListener("blur", clearPreview);
    return () => {
      clearPreview();
      document.removeEventListener("visibilitychange", protect);
      window.removeEventListener("blur", clearPreview);
    };
  }, [refresh, clearPreview]);
  useEffect(() => {
    if (!preview) return;
    let active = true;
    const timer = setInterval(() => {
      void getSupabase()
        .rpc("vv_open_evidence", { p_evidence_id: preview.item.id })
        .then(({ error }) => {
          if (active && error) {
            clearPreview();
            setError("Evidence access has changed.");
          }
        });
    }, 20_000);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearPreview();
    };
    document.addEventListener("keydown", escape);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("keydown", escape);
    };
  }, [preview, clearPreview]);
  async function share() {
    if (busy) return;
    setBusy(true);
    setError("");
    let name = label.trim() || file?.name.slice(0, 160) || "";
    if (!name) {
      try {
        name = new URL(link.trim()).hostname;
      } catch {}
    }
    try {
      if (file) {
        validateEvidenceFile(file.size, file.type, name);
        const bytes = await file.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const hash = Array.from(new Uint8Array(digest), (n) =>
          n.toString(16).padStart(2, "0"),
        ).join("");
        await uploadEvidence(
          getSupabase(),
          requestId,
          name,
          file.type,
          bytes,
          hash,
        );
      } else
        await addEvidenceLink(getSupabase(), requestId, name, link.trim());
      setFile(null);
      setLink("");
      setLabel("");
      setLinkMode(false);
      if (input.current) input.current.value = "";
      await refresh();
    } catch (e) {
      setError(supportError(e));
    } finally {
      setBusy(false);
    }
  }
  async function view(item: EvidenceItem) {
    clearPreview();
    const attempt = generation.current;
    setBusy(true);
    setError("");
    try {
      const opened = await openEvidence(getSupabase(), item.id);
      if (generation.current !== attempt) return;
      if (opened.kind === "link") setPreview({ item, link: opened.url });
      else {
        const hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              await opened.blob.arrayBuffer(),
            ),
          ),
          (n) => n.toString(16).padStart(2, "0"),
        ).join("");
        if (generation.current !== attempt) return;
        if (hash !== opened.sha256)
          throw new Error(
            "The file fingerprint does not match. Do not use this copy as evidence.",
          );
        const url = URL.createObjectURL(opened.blob);
        blobUrl.current = url;
        setPreview({ item, blobUrl: url });
      }
    } catch (e) {
      if (generation.current === attempt) setError(supportError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="evidence-panel"
      aria-label={owner ? "Files and links" : "Shared evidence"}
    >
      <div className="support-section-heading">
        <div>
          {!owner && <p className="support-eyebrow">Shared with this case</p>}
          <h3>
            {owner ? "Files & links" : "Evidence library"}{" "}
            <span className="support-count">{items.length}</span>
          </h3>
        </div>
        <button className="support-text-button" onClick={refresh}>
          Refresh
        </button>
      </div>
      {!owner && (
        <p className="support-helper">
          <ShieldCheck size={14} /> Private originals. Access is recorded.
          Review status does not establish authenticity.
        </p>
      )}
      {error && (
        <p role="alert" className="support-error">
          {error}
        </p>
      )}
      {!items.length && !error && (
        <div className="support-empty-inline">
          <Paperclip size={24} />
          <p>{owner ? "Nothing shared yet." : "No evidence shared yet."}</p>
          <span>
            {owner
              ? "Screenshots, photos, voice notes or links can help the team understand."
              : "Only material the owner chooses to share appears here."}
          </span>
        </div>
      )}
      <div className="evidence-grid">
        {items.map((item) => (
          <article className="evidence-card" key={item.id}>
            <div className="evidence-file-icon">
              {item.kind === "link" ? <Link2 /> : <FileImage />}
            </div>
            <div className="evidence-card-content">
              <strong>{item.label}</strong>
              <span>
                {item.kind === "link"
                  ? "External link"
                  : `${item.mime_type?.split("/")[0]} · ${evidenceSize(item.byte_size)}`}
              </span>
              <small>{new Date(item.created_at).toLocaleString()}</small>
            </div>
            <button
              className="support-icon-button"
              title={`View ${item.label}`}
              aria-label={`View ${item.label}`}
              onClick={() => view(item)}
              disabled={busy}
            >
              <Eye size={18} />
            </button>
            {reviewer ? (
              <label className="evidence-review">
                Review status
                <select
                  value={item.review_status}
                  disabled={busy}
                  onChange={async (e) => {
                    setBusy(true);
                    try {
                      await reviewEvidence(
                        item.id,
                        e.target.value as EvidenceItem["review_status"],
                      );
                      await refresh();
                    } catch (err) {
                      setError(supportError(err));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <option value="new">Not reviewed</option>
                  <option value="under_review">Under review</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </label>
            ) : (
              <span className="support-pill">
                {item.review_status.replaceAll("_", " ")}
              </span>
            )}
          </article>
        ))}
      </div>
      {owner && (
        <div className="evidence-upload">
          <h4>Share something new</h4>
          {linkMode ? (
            <>
              <label>
                Link
                <input
                  type="url"
                  value={link}
                  disabled={busy}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label>
                Short description <small>(optional)</small>
                <input
                  value={label}
                  maxLength={160}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="support-text-button"
                onClick={() => {
                  setLinkMode(false);
                  setLink("");
                }}
              >
                Choose a file instead
              </button>
            </>
          ) : (
            <>
              <label>
                Photo, video or audio file
                <input
                  ref={input}
                  type="file"
                  accept={EVIDENCE_TYPES.join(",")}
                  disabled={busy}
                  onChange={(e) => {
                    const next = e.target.files?.[0] || null;
                    setFile(next);
                    if (next && !label) setLabel(next.name.slice(0, 160));
                  }}
                />
              </label>
              {file ? (
                <label>
                  Name it so you can find it later
                  <input
                    value={label}
                    maxLength={160}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </label>
              ) : (
                <button
                  type="button"
                  className="support-text-button"
                  onClick={() => setLinkMode(true)}
                >
                  Share a link instead
                </button>
              )}
            </>
          )}
          {(file || linkMode) && (
            <button
              className="support-primary-button"
              disabled={busy || (!file && !link.trim())}
              onClick={share}
            >
              {busy ? "Sharing…" : "Share with support team"}
            </button>
          )}
          <p className="support-helper">
            Up to 10 MB each. Your support team can open what you share, and
            each view is recorded. Shared files can’t be changed afterwards.
          </p>
        </div>
      )}
      {preview && (
        <div
          className="evidence-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={preview.item.label}
          onKeyDown={(e) => {
            if (e.key === "Escape") clearPreview();
            if (e.key === "Tab") {
              const controls = Array.from(
                e.currentTarget.querySelectorAll<HTMLElement>(
                  "button:not(:disabled),a[href],audio[controls],video[controls]",
                ),
              );
              const first = controls[0];
              const last = controls[controls.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <section
            className="evidence-viewer"
            onContextMenu={(e) => e.preventDefault()}
          >
            <header>
              <div>
                <span className="support-eyebrow">
                  Controlled evidence view
                </span>
                <h3>{preview.item.label}</h3>
              </div>
              <button
                className="support-icon-button"
                autoFocus
                onClick={clearPreview}
                aria-label="Close evidence"
              >
                <X />
              </button>
            </header>
            <p className="support-helper">
              This access is logged. Keep this material inside the case. Browser
              capture cannot be blocked.
            </p>
            {preview.link ? (
              <div className="external-evidence">
                <Link2 size={30} />
                <p>
                  This link opens an external website. Its owner may see your
                  visit. Screenshot protection does not apply there.
                </p>
                <code>{preview.link}</code>
                <a
                  className="support-primary-button"
                  href={preview.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  Open external website <ExternalLink size={16} />
                </a>
              </div>
            ) : (
              <div className="evidence-media">
                {preview.item.mime_type?.startsWith("image/") ? (
                  <Image
                    src={preview.blobUrl!}
                    alt={preview.item.label}
                    width={900}
                    height={600}
                    unoptimized
                    draggable={false}
                  />
                ) : preview.item.mime_type?.startsWith("video/") ? (
                  <video
                    src={preview.blobUrl}
                    controls
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                  />
                ) : (
                  <audio
                    src={preview.blobUrl}
                    controls
                    controlsList="nodownload noremoteplayback"
                  />
                )}
                <div className="evidence-watermarks" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <span key={i}>
                      {watermark} · #{requestId.slice(0, 8)}
                      <br />
                      {new Date().toLocaleDateString()} · Private evidence
                    </span>
                  ))}
                </div>
              </div>
            )}
            <footer>
              Original fingerprint:{" "}
              <code>
                {preview.item.sha256 || "External source; contents may change"}
              </code>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
