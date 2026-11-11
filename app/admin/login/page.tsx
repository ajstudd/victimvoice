"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getSupabase,
  isSupabaseConfigured,
  signInWithGoogle,
  signOut,
} from "@/lib/supabase";
import { staffLanding } from "@/lib/support";
import {
  authenticatedLoginDestination,
  consumeLoginDestination,
  rememberLoginDestination,
} from "@/lib/staff-routing";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const requested = consumeLoginDestination(window.location.search);
      const destination = authenticatedLoginDestination(
        requested,
        true,
        requested === "/join" ? null : await staffLanding(),
      );
      if (!destination) {
        await signOut();
        throw new Error(
          "This account has not been approved for support access.",
        );
      }
      router.replace(destination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const googleLogin = async () => {
    setBusy(true);
    setError("");
    try {
      rememberLoginDestination();
      await signInWithGoogle(true);
    } catch {
      setError("Google sign-in could not start. Please try again.");
      setBusy(false);
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

        <h1 className="text-2xl font-bold text-center mb-2">Staff sign-in</h1>
        <p className="text-center text-muted-foreground mb-8">
          Use your staff account. Access follows your role, service area and
          assignments.
        </p>

        {!isSupabaseConfigured && (
          <p role="status" className="mb-4 text-sm">
            Sign-in is being set up. Please check back soon.
          </p>
        )}
        <Button
          className="mb-6 w-full"
          onClick={googleLogin}
          disabled={busy || !isSupabaseConfigured}
        >
          Continue with Google
        </Button>
        <p className="mb-4 text-sm text-muted-foreground">
          Or sign in with your staff email and password.
        </p>
        <form method="post" onSubmit={handleLogin} className="space-y-6">
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

          <Button
            disabled={busy || !isSupabaseConfigured}
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
          >
            {busy ? "Signing in…" : "Login"}
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 text-center">
          <Link
            href="/join"
            className="block mb-4 text-sm text-primary hover:underline"
          >
            Have a staff invitation? Accept it here.
          </Link>
          <Link href="/" className="text-sm text-primary hover:underline">
            Return to home page
          </Link>
        </div>
      </div>
    </div>
  );
}
