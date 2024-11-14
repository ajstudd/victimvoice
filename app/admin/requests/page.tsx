"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import axios from 'axios';
import { usePathname, useSearchParams } from "next/navigation";
import { RequestType } from '@/lib/types';
import { useParams } from 'next/navigation';
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
import { Shield, ArrowLeft, Send, Clock, LinkIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function RequestDetail() {
  const { toast } = useToast();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queries = Object.fromEntries(searchParams.entries());
  const { id } = queries; // Dynamically fetch the 'id' from URL params using useParams
  const isAuthenticated = useAdminAuth();
  const [comment, setComment] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [request, setRequest] = useState<RequestType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !id) return; // Ensure 'id' exists before making the API call

    const fetchRequestData = async () => {
      try {
        const response = await axios.get(`/support-requests/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        });
        setRequest(response.data);
        setStatus(response.data.status)
      } catch (err) {
        setError('Failed to load request');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestData();
  }, [isAuthenticated, id]); // Dependency on 'id' from useParams

  if (!isAuthenticated) return null;

  const handleStatusUpdate = async (newStatus: any) => {
    setStatus(newStatus);

    try {
      const token = localStorage.getItem("adminToken");
      const response = await axios.put(
        `/update-status/${id}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "Status updated",
          description: `Request status has been updated to ${newStatus}`,
        });
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to update status.",
        });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "An error occurred while updating the status.",
      });
    }
  };

  const handleAddComment = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Get JWT token from the authentication context
      const token = localStorage.getItem("adminToken"); // Assuming the token is stored in localStorage

      // Make the API call with the token in the headers
      const response = await axios.post(`/support-requests/${request?._id}/comment`, { text: comment }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        toast({
          title: "Comment added successfully",
          description: "We'll let the user know about your comment.",
        });
      }
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "There was an issue submitting your reply. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
    setComment("");
  };

  const handleDownloadEvidence = async () => {
    if (!request?.evidence || request.evidence.length === 0) return;

    for (const file of request.evidence) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.url.split("/").pop() || 'default_filename'; // Use the file name from the URL
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrintReport = async () => {
    const reportElement = document.getElementById("report-content");
    if (!reportElement) return;

    const canvas = await html2canvas(reportElement);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("Support_Request_Report.pdf");
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

      <div id="report-content">
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Request Information</CardTitle>
                  <CardDescription>
                    Submitted on {request?.createdAt}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-muted-foreground">
                      {request?.description}
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium mb-2">Accused&apos;s Name</h3>
                      <p className="text-muted-foreground">
                        {request?.accusedName}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Accused&apos;s Address</h3>
                      <p className="text-muted-foreground">
                        {request?.accusedAddress}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">User Address</h3>
                      <p className="text-muted-foreground">
                        {request?.userAddress}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Evidence Files</h3>
                    <div className="space-y-2">
                      {request?.evidence.map((file, index) => (
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
                      {request?.evidence.length === 0 && (
                        <p className="text-sm text-muted-foreground">No evidence files uploaded</p>
                      )}
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
                    {request?.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                      >
                        <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{comment?.sender}</span>
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
                    <p className="text-muted-foreground">{request?.phone}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-1.5">Request Type</h3>
                    <p className="capitalize text-muted-foreground">
                      {request?.harassmentType}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-1.5">Priority</h3>
                    <p className="capitalize text-muted-foreground">
                      {request?.severityLevel}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={handleDownloadEvidence} className="w-full" variant="outline">
                    Download Evidence
                  </Button>
                  <Button onClick={handlePrintReport} className="w-full bg-destructive hover:bg-destructive/90">
                    Print Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}