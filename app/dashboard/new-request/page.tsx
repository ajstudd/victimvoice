"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Shield, ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

export default function NewRequest() {
  const isAuthenticated = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    userAddress: "",
    accusedAddress: "",
    accusedName: "",
    accusedPhone: "",
    harassmentType: "",
    severityLevel: "",
    description: "",
    screenshotEvidence: "",
    videoEvidence: "",
  });

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Basic form validation
    const { userAddress, accusedAddress, accusedName, harassmentType, severityLevel, description, screenshotEvidence, videoEvidence, accusedPhone } = formData;
    if (!userAddress || !accusedAddress || !accusedName || !harassmentType || !severityLevel || !description || !screenshotEvidence || !videoEvidence) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get JWT token from the authentication context
      const token = localStorage.getItem("jwtToken"); // Assuming the token is stored in localStorage

      // Make the API call with the token in the headers
      const response = await axios.post("/support-requests", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        toast({
          title: "Request submitted successfully",
          description: "We'll review your case and respond as soon as possible.",
        });
        router.push("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "There was an issue submitting your request. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold">New Support Request</span>
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
        <Card>
          <CardHeader>
            <CardTitle>Submit Your Request</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help us understand your situation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Address</label>
                  <Input name="userAddress" placeholder="Enter your full address" required onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Accused&apos;s Address</label>
                  <Input name="accusedAddress" placeholder="Enter the accused's address" required onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Accused&apos;s Name</label>
                <Input name="accusedName" placeholder="Enter the accused's name" required onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Accused&apos;s Phone</label>
                <Input name="accusedPhone" placeholder="Enter the accused's phone number" required onChange={handleChange} />
              </div>


              <div className="space-y-2">
                <label className="text-sm font-medium">Type of Harassment</label>
                <Select required onValueChange={(value) => setFormData({ ...formData, harassmentType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cyber_harassment">Cyber Harassment</SelectItem>
                    <SelectItem value="workplace_harassment">Workplace Harassment</SelectItem>
                    <SelectItem value="stalking">Stalking</SelectItem>
                    <SelectItem value="verbal_abuse">Verbal Abuse</SelectItem>
                    <SelectItem value="physical_threat">Physical Threat</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Severity Level</label>
                <Select required onValueChange={(value) => setFormData({ ...formData, severityLevel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Concerning but not immediate threat</SelectItem>
                    <SelectItem value="medium">Medium - Escalating situation</SelectItem>
                    <SelectItem value="high">High - Immediate attention needed</SelectItem>
                    <SelectItem value="critical">Critical - Life-threatening situation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea name="description" placeholder="Please describe the situation in detail..." className="min-h-[150px]" required onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Evidence Links</label>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Screenshots of conversations (URLs)</p>
                    <Input name="screenshotEvidence" placeholder="Enter URL to screenshot evidence" onChange={handleChange} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Video evidence (URLs)</p>
                    <Input name="videoEvidence" placeholder="Enter URL to video evidence" onChange={handleChange} />
                  </div>
                </div>
              </div>

              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="link">How to : Upload files on Google Drive and share link</Button>
                </DialogTrigger>
                <DialogContent>
                  <iframe
                    width="460"
                    height="315"
                    src="https://www.youtube.com/embed/Lx0sozfFVv8?si=GdYXB82yVvw1sxHd"
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </DialogContent>
              </Dialog>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
