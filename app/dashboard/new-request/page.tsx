"use client";

import { useState } from "react";
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

export default function NewRequest() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Request submitted successfully",
        description: "We'll review your case and respond as soon as possible.",
      });
      router.push("/dashboard");
    }, 1500);
  };

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
                  <Input placeholder="Enter your full address" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Accused's Address</label>
                  <Input placeholder="Enter the accused's address" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type of Harassment</label>
                <Select required>
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
                <Select required>
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
                <Textarea
                  placeholder="Please describe the situation in detail..."
                  className="min-h-[150px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Evidence Links</label>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Screenshots of conversations (URLs)
                    </p>
                    <Input placeholder="Enter URL to screenshot evidence" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Video evidence (URLs)
                    </p>
                    <Input placeholder="Enter URL to video evidence" />
                  </div>
                </div>
              </div>

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