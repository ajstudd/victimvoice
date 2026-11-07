"use client";
import { useCallback, useEffect, useRef, useState, FormEvent } from "react";
import { addComment, listComments, COMMENT_PAGE_SIZE } from "@/lib/requests";
import { useConversationSync } from "@/hooks/useConversationSync";
import { Button } from "@/components/ui/button";

export function Comments({
  requestId,
  staff = false,
  onSent,
}: {
  requestId: string;
  staff?: boolean;
  onSent?: () => void;
}) {
  return (
    <Conversation
      key={requestId}
      requestId={requestId}
      staff={staff}
      onSent={onSent}
    />
  );
}

function Conversation({
  requestId,
  staff,
  onSent,
}: {
  requestId: string;
  staff: boolean;
  onSent?: () => void;
}) {
  const [data, setData] = useState<
    (Awaited<ReturnType<typeof listComments>> & { page: number }) | null
  >(null);
  const [page, setPage] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [accessChanged, setAccessChanged] = useState(false);
  const history = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const load = useCallback(
    async (signal: AbortSignal) => ({
      ...(await listComments(requestId, page, signal)),
      page,
    }),
    [requestId, page],
  );
  const receive = useCallback((value: Awaited<ReturnType<typeof load>>) => {
    setData(value);
    setSyncError("");
  }, []);
  const failed = useCallback(() => {
    setSyncError(
      "Could not check for replies. We will retry automatically when connected.",
    );
  }, []);
  const accountChanged = useCallback(() => {
    setData(null);
    setText("");
    setAccessChanged(true);
    setSyncError(
      "Your account changed. Return to sign-in to reopen this conversation.",
    );
  }, []);
  const refresh = useConversationSync(load, receive, failed, accountChanged);
  const comments = data?.page === page ? data.comments : [];
  const count = data?.count || 0;
  const loading = data?.page !== page && !syncError;
  useEffect(() => {
    const node = history.current;
    if (node && nearBottom.current) node.scrollTop = node.scrollHeight;
  }, [data]);
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!text.trim() || sending || accessChanged) return;
    setSending(true);
    setError("");
    try {
      await addComment(requestId, text);
      setText("");
      nearBottom.current = true;
      onSent?.();
      if (page === 0) refresh();
      else setPage(0);
    } catch {
      setError("Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="case-chat">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {syncError && (
        <div role="status" className="text-sm text-destructive">
          {syncError}{" "}
          <Button variant="link" onClick={refresh}>
            Check again
          </Button>
        </div>
      )}
      <div
        className="case-chat-history"
        ref={history}
        onScroll={(event) => {
          const node = event.currentTarget;
          nearBottom.current =
            node.scrollHeight - node.scrollTop - node.clientHeight < 60;
        }}
      >
        {loading ? (
          <p role="status">Loading messages…</p>
        ) : (
          <>
            {data?.page === page && comments.length === 0 ? (
              <p className="case-chat-caption">
                {staff
                  ? "No replies yet. The survivor is waiting to hear from the team."
                  : "Sent. The support team’s reply will appear here — new replies show up automatically while this page is open."}
              </p>
            ) : (
              comments.length > 0 && (
                <>
                  {page > 0 && (
                    <p className="case-chat-caption">Earlier messages</p>
                  )}
                  {comments
                    .slice()
                    .reverse()
                    .map((message) => (
                      <div
                        key={message.id}
                        className={`case-chat-message ${(staff ? message.sender === "admin" : message.sender === "user") ? "is-outgoing" : ""}`}
                      >
                        <span className="case-chat-message-label">
                          {message.sender === "admin"
                            ? "Support team"
                            : staff
                              ? "Survivor"
                              : "You"}
                        </span>
                        <p className="case-chat-bubble">{message.content}</p>
                        <time dateTime={message.timestamp}>
                          {new Date(message.timestamp).toLocaleString(
                            undefined,
                            { dateStyle: "medium", timeStyle: "short" },
                          )}
                        </time>
                      </div>
                    ))}
                </>
              )
            )}
            {count > COMMENT_PAGE_SIZE && (
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Newer messages
                </Button>
                <Button
                  variant="outline"
                  disabled={(page + 1) * COMMENT_PAGE_SIZE >= count}
                  onClick={() => setPage(page + 1)}
                >
                  Earlier messages
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <form onSubmit={submit} className="case-chat-composer">
        <label htmlFor="reply">
          {staff ? "Reply to the survivor" : "Write a message"}
        </label>
        <textarea
          id="reply"
          placeholder={
            staff
              ? "Listen, acknowledge, and suggest a next step…"
              : "Write what you feel comfortable sharing…"
          }
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
              void submit();
          }}
          maxLength={5000}
          disabled={accessChanged}
          required
        />
        <div className="case-chat-composer-footer">
          <span>
            {staff
              ? "Visible to the survivor · Ctrl/⌘ + Enter to send"
              : "Only your support team can read this · Ctrl/⌘ + Enter to send"}
          </span>
          <button
            className="support-primary-button"
            disabled={sending || !text.trim() || accessChanged}
            type="submit"
          >
            {sending ? "Sending…" : staff ? "Send reply" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
