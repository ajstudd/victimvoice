"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Shield, ArrowLeft, Send, Clock, AlertCircle, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequestType } from "@/lib/types";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500",
  in_progress: "bg-blue-500/10 text-blue-500",
  resolved: "bg-green-500/10 text-green-500",
  closed: "bg-gray-500/10 text-gray-500",
};

export function RequestDetailClient({ request }: { request: RequestType }) {
  const [reply, setReply] = useState("");
  const { toast } = useToast();

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    toast({
      title: "Reply sent",
      description: "Your message has been sent to the support team.",
    });
    setReply("");
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
              <Link href="/dashboard">
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
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{request.title}</CardTitle>
                    <CardDescription>
                      Submitted on {request.createdAt}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      statusColors[
                      request.status as keyof typeof statusColors
                      ]
                    }
                  >
                    {request.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">
                    {request.description}
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Your Address</h3>
                    <p className="text-muted-foreground">
                      {request.userAddress}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Accused&apos;s Address</h3>
                    <p className="text-muted-foreground">
                      {request.accusedAddress}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Evidence Files</h3>
                  <div className="space-y-2">
                    {request.evidence.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <LinkIcon className="h-4 w-4 text-primary" />
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {file.type === "screenshot"
                            ? "Screenshot Evidence"
                            : "Video Evidence"}{" "}
                          #{index + 1}
                        </a>
                      </div>
                    ))}
                    {request.evidence.length === 0 && (
                      <p className="text-sm text-muted-foreground">No evidence files uploaded</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {request.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-4 p-4 rounded-lg ${message.sender === "Admin"
                        ? "bg-muted/50"
                        : "bg-primary/10"
                        }`}
                    >
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{message.sender}</span>
                          <span className="text-sm text-muted-foreground">
                            {message.timestamp}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}

                  {request.messages.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No messages yet. Start the conversation by sending a message below.
                    </p>
                  )}

                  <form onSubmit={handleSendReply} className="space-y-4">
                    <Textarea
                      placeholder="Type your reply..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button type="submit" className="bg-primary hover:bg-primary/90">
                      <Send className="mr-2 h-4 w-4" />
                      Send Reply
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-1.5">Request ID</h3>
                  <p className="text-muted-foreground">{request.id}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1.5">Category</h3>
                  <p className="capitalize text-muted-foreground">
                    {request.type.replace("_", " ")}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1.5">Priority</h3>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="capitalize text-muted-foreground">
                      {request.priority}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Immediate Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  If you&apos;re in immediate danger, please contact emergency services:
                </p>
                <div className="text-lg font-bold text-primary text-center">
                  911
                </div>
                <Button className="w-full" variant="outline">
                  View Safety Resources
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}