"use client";
import { Suspense, useState, useEffect } from 'react';
import { RequestDetailClient } from './request-detail-client';
import { useAuth } from '@/hooks/useAuth';
import { getRequest } from '@/lib/requests';
import { useSearchParams } from "next/navigation";
import { RequestType } from '@/lib/types';

export default function RequestDetail() {
  return <Suspense fallback={<div>Loading request…</div>}><RequestDetailContent /></Suspense>;
}

function RequestDetailContent() {
  const searchParams = useSearchParams();
  const queries = Object.fromEntries(searchParams.entries());
  const { id } = queries; // Dynamically fetch the 'id' from URL params using useParams
  const isAuthenticated = useAuth();
  const [request, setRequest] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!id) { setError('No request ID provided.'); setLoading(false); return; }

    let active = true;
    setLoading(true); setError(null);
    const fetchRequestData = async () => {
      try {
        const data = await getRequest(id);
        if (active) setRequest(data);
      } catch (err) {
        if (active) setError('Failed to load request');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRequestData();
    return () => { active = false; };
  }, [isAuthenticated, id]); // Dependency on 'id' from useParams

  if (!isAuthenticated) return null;

  // Handle loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Handle error state
  if (error) {
    return <div>{error}</div>;
  }

  // Handle no requests case
  if (!request) {
    return <div>No requests found.</div>;
  }

  return <RequestDetailClient request={request} />;
}
