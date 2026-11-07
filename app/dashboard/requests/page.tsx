"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RequestDetailClient } from "./request-detail-client";
import { useAuth } from "@/hooks/useAuth";
import { getRequest } from "@/lib/requests";
import { RequestType } from "@/lib/types";
import { DashboardShell } from "@/components/dashboard-shell";

export default function RequestDetail() {
  return (
    <Suspense fallback={null}>
      <RequestDetailContent />
    </Suspense>
  );
}

function RequestDetailContent() {
  const id = useSearchParams().get("id");
  const isAuthenticated = useAuth();
  const [request, setRequest] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!id) {
      setError("No conversation was selected.");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    getRequest(id)
      .then((data) => {
        if (active) setRequest(data);
      })
      .catch(() => {
        if (active) setError("This conversation couldn’t be opened. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, id]);

  if (!isAuthenticated) return null;
  if (request && !loading) return <RequestDetailClient request={request} />;
  return (
    <DashboardShell back={{ href: "/dashboard", label: "Your conversations" }}>
      {loading ? (
        <p role="status">Opening conversation…</p>
      ) : (
        <p role="alert" className="vv-error">
          {error || "This conversation couldn’t be found."}
        </p>
      )}
    </DashboardShell>
  );
}
