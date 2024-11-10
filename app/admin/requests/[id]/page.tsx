"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Shield, ArrowLeft, Send, Clock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Mock data - replace with actual API call
const MOCK_REQUEST = {
  id: "REQ001",
  phone: "+1234567890",
  status: "in_progress",
  createdAt: "2024-03-20",
  priority: "high",
  type: "harassment",
  description: "I have been receiving threatening messages...",
  location: "123 Main St, City, State",
  evidence: ["evidence1.jpg", "evidence2.jpg"],
  comments: [
    {
      id: 1,
      author: "Admin",
      content: "Case has been reviewed. Contacting local authorities.",
      timestamp: "2024-03-20 14:30",
    },
  ],
};

export default function RequestDetail({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState(MOCK_REQUEST.status);
  const [comment, setComment] = useState("");
  const { toast } = useToast();

  const handleStatusUpdate = async (newStatus: string) => {
    // TODO: Implement actual API call
    setStatus(newStatus);
    toast({
      title: "Status updated",
      description: `Request status has been updated to ${newStatus}`,
    });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual API call
    toast({
      title: "Comment added",
      description: "Your comment has been added to the request",
    });
    setComment("");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold">Request Details</span>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Information</CardTitle>
                <CardDescription>
                  Submitted on {MOCK_REQUEST.createdAt}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">
                    {MOCK_REQUEST.description}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Location</h3>
                  <p className="text-muted-foreground">{MOCK_REQUEST.location}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Evidence Files</h3>
                  <div className="flex gap-2">
                    {MOCK_REQUEST.evidence.map((file) => (
                      <Badge key={file} variant="secondary">
                        {file}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comments & Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_REQUEST.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                    >
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{comment.author}</span>
                          <span className="text-sm text-muted-foreground">
                            {comment.timestamp}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}

                  <form onSubmit={handleAddComment} className="space-y-4">
                    <Textarea
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button type="submit" className="bg-primary hover:bg-primary/90">
                      <Send className="mr-2 h-4 w-4" />
                      Add Comment
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Current Status
                  </label>
                  <Select
                    value={status}
                    onValueChange={handleStatusUpdate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1.5">Contact Info</h3>
                  <p className="text-muted-foreground">{MOCK_REQUEST.phone}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1.5">Request Type</h3>
                  <p className="capitalize text-muted-foreground">
                    {MOCK_REQUEST.type}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1.5">Priority</h3>
                  <p className="capitalize text-muted-foreground">
                    {MOCK_REQUEST.priority}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline">
                  Download Evidence
                </Button>
                <Button className="w-full" variant="outline">
                  Print Report
                </Button>
                <Button className="w-full bg-destructive hover:bg-destructive/90">
                  Mark as Urgent
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}