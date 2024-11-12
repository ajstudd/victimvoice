import { MOCK_REQUESTS } from '@/lib/data';
import { RequestDetailClient } from './request-detail-client';

// This function is required for static site generation with dynamic routes
export function generateStaticParams() {
  return MOCK_REQUESTS.map((request) => ({
    id: request.id,
  }));
}

export default function RequestDetail({ params }: { params: { id: string } }) {
  // Find the specific request from mock data
  const request = MOCK_REQUESTS.find((r) => r.id === params.id) || MOCK_REQUESTS[0];
  
  return <RequestDetailClient request={request} />;
}