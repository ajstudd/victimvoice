"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios"; // Import axios

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Make the API call to the backend
      const response = await axios.post('/adminlogin', { email, password });

      if (response.data.success) {
        // Save the JWT token in localStorage
        localStorage.setItem("adminToken", response.data.token);

        // Show success toast notification
        toast({
          title: "Login successful",
          description: "Welcome back, admin!",
        });

        // Redirect to the admin dashboard
        router.push("/admin/dashboard");
      } else {
        // Show error toast for invalid credentials
        toast({
          title: "Login failed",
          description: response.data.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error logging in:", error);

      // Show error toast for any server or network issues
      toast({
        title: "Login failed",
        description: "Error logging in admin. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary">
      <div className="w-full max-w-md p-8 bg-card rounded-xl shadow-lg animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="p-3 rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">Admin Login</h1>
        <p className="text-center text-muted-foreground mb-8">
          Access the volunteer dashboard
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
            Login
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-primary hover:underline">
            Return to home page
          </Link>
        </div>
      </div>
    </div>
  );
}
