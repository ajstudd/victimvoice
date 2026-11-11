"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  getSupabase,
  isSupabaseConfigured,
  phoneLoginEnabled,
  signInWithGoogle,
} from "@/lib/supabase";
import {
  authenticatedLoginDestination,
  consumeLoginDestination,
  rememberLoginDestination,
  requestedLoginDestination,
} from "@/lib/staff-routing";

export default function LoginPage() {
  const [joining, setJoining] = useState(false);
  useEffect(
    () =>
      setJoining(requestedLoginDestination(window.location.search) === "/join"),
    [],
  );
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"google" | "phone" | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function googleLogin() {
    setError("");
    setBusy("google");
    try {
      rememberLoginDestination();
      await signInWithGoogle();
    } catch {
      setError("Google sign-in could not start. Please try again.");
      setBusy(null);
    }
  }
  async function phoneLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy("phone");
    try {
      const supabase = getSupabase();
      if (sentTo) {
        const { error } = await supabase.auth.verifyOtp({
          phone: sentTo,
          token: code.trim(),
          type: "sms",
        });
        if (error) throw error;
        router.replace(
          authenticatedLoginDestination(
            consumeLoginDestination(window.location.search),
            false,
            null,
          )!,
        );
      } else {
        const normalized = phone.replace(/[\s()-]/g, "");
        if (!/^\+[1-9]\d{7,14}$/.test(normalized))
          throw new Error(
            "Enter a full phone number with country code, such as +91 98765 43210.",
          );
        const { error } = await supabase.auth.signInWithOtp({
          phone: normalized,
        });
        if (error) throw error;
        setSentTo(normalized);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Phone sign-in failed. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=2069&auto=format&fit=crop"
          alt="Supportive community"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent" />
        <div className="absolute top-8 left-8">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
      <main className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 sm:p-8">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex justify-center mb-6">
            <Shield className="h-12 w-12 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">
            {joining ? "Sign in to join your team" : "Welcome to VictimVoice"}
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {joining
              ? "Use the account your staff invitation was issued for. You’ll return to your invitation after sign-in."
              : "Sign in to ask for support and follow your requests."}
          </p>
          {!isSupabaseConfigured && (
            <p role="status" className="mb-6 rounded-md border p-4 text-sm">
              Sign-in is being set up. Please check back soon.
            </p>
          )}
          <Button
            className="w-full h-12"
            onClick={googleLogin}
            disabled={Boolean(busy) || !isSupabaseConfigured}
          >
            {busy === "google" && (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {busy === "google"
              ? "Connecting to Google…"
              : "Continue with Google"}
          </Button>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            No phone number needed with Google.
          </p>
          {phoneLoginEnabled && (
            <>
              <div className="my-7 flex items-center gap-4" aria-hidden="true">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-muted-foreground">
                  or use your phone
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <form method="post" onSubmit={phoneLogin} className="space-y-4">
                {sentTo ? (
                  <div className="space-y-2">
                    <label htmlFor="code" className="text-sm font-medium">
                      Verification code
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Enter the code sent to {sentTo}.
                    </p>
                    <Input
                      id="code"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Phone number
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12"
                      aria-describedby="phone-help"
                      required
                    />
                    <p
                      id="phone-help"
                      className="text-sm text-muted-foreground"
                    >
                      Include your country code. We’ll send a verification code.
                    </p>
                  </div>
                )}
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full h-12"
                  disabled={Boolean(busy) || !isSupabaseConfigured}
                >
                  {busy === "phone" && (
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {busy === "phone"
                    ? "Please wait…"
                    : sentTo
                      ? "Verify & Continue"
                      : "Send Verification Code"}
                </Button>
                {sentTo && (
                  <Button
                    type="button"
                    variant="link"
                    className="w-full"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      setSentTo("");
                      setCode("");
                      setError("");
                    }}
                  >
                    Change number or request a new code
                  </Button>
                )}
              </form>
            </>
          )}
          {error && (
            <p role="alert" className="mt-5 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
