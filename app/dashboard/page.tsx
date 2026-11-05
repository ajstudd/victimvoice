"use client";

import { Button } from "@/components/ui/button";
import { Shield, Plus, LogOut, Clock, AlertCircle, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { listRequests, PAGE_SIZE } from "@/lib/requests";
import { signOut } from "@/lib/supabase";
import { RequestType } from "@/lib/types";

// Status colors for requests
const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500",
  in_progress: "bg-blue-500/10 text-blue-500",
  resolved: "bg-green-500/10 text-green-500",
  closed: "bg-gray-500/10 text-gray-500",
};

export default function Dashboard() {
  const isAuthenticated = useAuth();
  const [requests, setRequests] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);


  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setLoading(true); setError("");
    listRequests(page).then(result => {
      if (active) { setRequests(result.requests); setCount(result.count); }
    }).catch(() => { if (active) setError("Requests could not load. Please refresh to try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated, page]);

  const logout = async () => {
    try { await signOut(); window.location.href = "/login"; }
    catch { setError("Sign-out failed. Please try again."); }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold">My Support Requests</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button className="bg-primary hover:bg-primary/90" asChild>
                <Link href="/dashboard/new-request">
                  <Plus className="mr-2 h-4 w-4" />
                  New Request
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => logout()} >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {error && <p role="alert" className="text-destructive">{error}</p>}
          {loading ? (
            <p>Loading requests...</p>
          ) : !error ? (
            <>
              {requests.length > 0 ? (
                requests.map((request) => (
                  <Card key={request._id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl mb-1">{request.description}</CardTitle>
                          <CardDescription>Request ID: {request._id}</CardDescription>
                        </div>
                        <Badge
                          variant="secondary"
                          className={statusColors[request.status as keyof typeof statusColors] || "bg-gray-500/10 text-gray-500"}
                        >
                          {request.status?.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-muted-foreground line-clamp-2">
                          {request.description}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>Submitted on {new Date(request.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">Priority: {request.severityLevel}</span>
                          </div>
                          {request.commentCount > 0 && (
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-primary" />
                              <span>{request.commentCount} messages</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-4">
                          <p className="text-sm text-muted-foreground">
                            Open your request to read updates.
                          </p>
                          <Button asChild>
                            <Link href={`/dashboard/requests?id=${request._id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Requests Yet</h3>
                    <p className="text-muted-foreground text-center mb-6">
                      You haven&apos;t submitted any support requests yet.
                    </p>
                    <Button className="bg-primary hover:bg-primary/90" asChild>
                      <Link href="/dashboard/new-request">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Request
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="outline" disabled={loading || page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm">Page {page + 1} of {Math.max(1, Math.ceil(count / PAGE_SIZE))}</span>
          <Button variant="outline" disabled={loading || (page + 1) * PAGE_SIZE >= count} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </main>
    </div>
  );
}
