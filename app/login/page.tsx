"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import Image from "next/image";
import { count } from "console";

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const history = useRouter();
  const { toast } = useToast();
  const handleSendCode = async (e: any) => {
    e.preventDefault();

    const response = await fetch('/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: `${countryCode}${phoneNumber}` })
    });

    const data = await response.json();

    if (response.ok) {
      setShowVerification(true);
      toast({ title: data.message });
    } else {
      toast({ title: "Error", description: data.error });
    }
  };

  const handleVerify = async (e: any) => {
    e.preventDefault();

    const response = await fetch('/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, otp: verificationCode })
    });

    const data = await response.json();

    if (data.success && data.token) {
      localStorage.setItem('jwtToken', data.token); // Save token to localStorage
      history.push('/dashboard'); // Redirect to a protected route
    } else {
      console.error(data.error);
    }
  };


  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-secondary">
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
          <Button variant="ghost" asChild className="group">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex justify-center mb-8">
            <Shield className="h-12 w-12 text-primary animate-float" />
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">
            Welcome to VictimVoice
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Your safe space for sharing and healing
          </p>

          {!showVerification ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="flex flex-row w-full justify-between gap-1">
                <div className="space-y-2 w-1/6">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone Number
                  </label>
                  <Input
                    id="countrycode"
                    type="tel"
                    placeholder="+91"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>
                <div className="pt-8 mt-6 w-5/6">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90">
                Send Verification Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">
                  Verification Code
                </label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="h-12"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90">
                Verify & Continue
              </Button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}