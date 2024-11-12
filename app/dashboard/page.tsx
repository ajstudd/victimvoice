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

// Mock data for testing
const MOCK_REQUESTS = [
  {
    id: "REQ001",
    title: "Online Harassment Case",
    type: "cyber_harassment",
    status: "in_progress",
    priority: "high",
    createdAt: "2024-03-20",
    lastUpdate: "Admin responded to your case",
    description: "Receiving threatening messages on social media...",
    unreadMessages: 2,
  },
  {
    id: "REQ002",
    title: "Workplace Harassment",
    type: "workplace_harassment",
    status: "pending",
    priority: "medium",
    createdAt: "2024-03-18",
    lastUpdate: "Case submitted successfully",
    description: "Facing inappropriate behavior at workplace...",
    unreadMessages: 0,
  },
];

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500",
  in_progress: "bg-blue-500/10 text-blue-500",
  resolved: "bg-green-500/10 text-green-500",
  closed: "bg-gray-500/10 text-gray-500",
};

export default function Dashboard() {
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
              <Button variant="ghost" asChild>
                <Link href="/login">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {MOCK_REQUESTS.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-1">{request.title}</CardTitle>
                    <CardDescription>Request ID: {request.id}</CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className={statusColors[request.status as keyof typeof statusColors]}
                  >
                    {request.status.replace("_", " ")}
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
                      <span>Submitted on {request.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">Priority: {request.priority}</span>
                    </div>
                    {request.unreadMessages > 0 && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span>{request.unreadMessages} new messages</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      Last update: {request.lastUpdate}
                    </p>
                    <Button asChild>
                      <Link href={`/dashboard/requests/${request.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {MOCK_REQUESTS.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Requests Yet</h3>
                <p className="text-muted-foreground text-center mb-6">
                  You haven't submitted any support requests yet.
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
        </div>
      </main>
    </div>
  );
}