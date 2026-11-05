"use client";

import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Send, Clock, AlertCircle, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { Comments } from "@/components/comments";
import { EvidencePanel } from "@/components/evidence-panel";
import { SupportConsent } from "@/components/support-consent";
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
                    <h3 className="font-medium mb-2">Accused&apos;s Name</h3>
                    <p className="text-muted-foreground">
                      {request.accusedName}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Accused&apos;s Address</h3>
                    <p className="text-muted-foreground">
                      {request.accusedAddress}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Your Address</h3>
                    <p className="text-muted-foreground">
                      {request.userAddress}
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
                <Comments requestId={request._id} />
                <SupportConsent key={`consent:${request._id}`} requestId={request._id} />
                <EvidencePanel key={`evidence:${request._id}`} requestId={request._id} owner />
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
                  <p className="text-muted-foreground">{request._id}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1.5">Category</h3>
                  <p className="capitalize text-muted-foreground">
                    {request.harassmentType.replace("_", " ")}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1.5">Priority</h3>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="capitalize text-muted-foreground">
                      {request.severityLevel}
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
                  112
                </div>
                <Button className="w-full" variant="outline">
                  <Link href="https://shebox.wcd.gov.in/">
                    View Safety Resources
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}