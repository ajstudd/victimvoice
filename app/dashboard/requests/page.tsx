"use client";
import { useState, useEffect } from 'react';
import { RequestDetailClient } from './request-detail-client';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';
import { usePathname, useSearchParams } from "next/navigation";
import { RequestType } from '@/lib/types';
import { useParams } from 'next/navigation'; // Import useParams from next/navigation

export default function RequestDetail() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queries = Object.fromEntries(searchParams.entries());
  const { id } = queries; // Dynamically fetch the 'id' from URL params using useParams
  const isAuthenticated = useAuth();
  const [request, setRequest] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !id) return; // Ensure 'id' exists before making the API call

    const fetchRequestData = async () => {
      try {
        const response = await axios.get(`/support-requests/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
          },
        });
        setRequest(response.data);
      } catch (err) {
        setError('Failed to load request');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestData();
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
