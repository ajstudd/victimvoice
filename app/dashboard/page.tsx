"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, MessageCircle, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listRequests, PAGE_SIZE } from "@/lib/requests";
import { RequestType } from "@/lib/types";
import { DashboardShell, StatusPill } from "@/components/dashboard-shell";
import { timeAgo } from "@/shared/support-copy";

export default function Dashboard() {
  const isAuthenticated = useAuth();
  const [requests, setRequests] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setLoading(true);
    setError("");
    listRequests(page)
      .then((result) => {
        if (active) {
          setRequests(result.requests);
          setCount(result.count);
        }
      })
      .catch(() => {
        if (active) setError("Your conversations couldn’t load. Please refresh to try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, page]);

  if (!isAuthenticated) return null;

  return (
    <DashboardShell>
      <div className="vv-heading-row">
        <div>
          <h1 className="vv-title">Your conversations</h1>
          <p className="vv-lead">
            Private messages between you and the support team. Replies aren’t instant —
            if you’re in danger right now, call 112.
          </p>
        </div>
        {count > 0 && (
          <Link className="vv-button" href="/dashboard/new-request">
            <Plus size={18} /> New conversation
          </Link>
        )}
      </div>
      {error && <p role="alert" className="vv-error">{error}</p>}
      {loading ? (
        <p role="status">Loading…</p>
      ) : error ? null : requests.length ? (
        <div className="vv-list">
          {requests.map((request) => (
            <Link
              key={request._id}
              className="vv-row"
              href={`/dashboard/requests?id=${request._id}`}
            >
              <span className="vv-row-top">
                <StatusPill status={request.status} />
                <span>Started {timeAgo(request.createdAt)}</span>
                {request.commentCount > 0 && (
                  <span>
                    {request.commentCount} {request.commentCount === 1 ? "message" : "messages"}
                  </span>
                )}
              </span>
              <p>{request.description}</p>
              <ChevronRight className="vv-row-arrow" size={20} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="vv-empty">
          <MessageCircle size={34} />
          <h2>Talk to someone on our team</h2>
          <p>
            Write in your own words — a few lines is enough. Only you and the support
            team can read it.
          </p>
          <Link className="vv-button" href="/dashboard/new-request">
            Start a conversation
          </Link>
        </div>
      )}
      {count > PAGE_SIZE && (
        <div className="vv-pages">
          <button className="vv-button-outline" disabled={loading || page === 0} onClick={() => setPage(page - 1)}>
            Newer
          </button>
          <span>
            Page {page + 1} of {Math.ceil(count / PAGE_SIZE)}
          </span>
          <button
            className="vv-button-outline"
            disabled={loading || (page + 1) * PAGE_SIZE >= count}
            onClick={() => setPage(page + 1)}
          >
            Older
          </button>
        </div>
      )}
    </DashboardShell>
  );
}
