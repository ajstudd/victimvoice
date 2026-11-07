"use client";
import Link from "next/link";
import { useState } from "react";
import { LogOut, Phone, Shield } from "lucide-react";
import { signOut } from "@/lib/supabase";
import { statusCopy } from "@/shared/support-copy";

export function DashboardShell({
  back,
  children,
}: {
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const [error, setError] = useState("");
  return (
    <div className="vv-dash">
      <header className="vv-dash-top">
        <Link href="/dashboard" className="vv-dash-brand">
          <span>
            <Shield size={18} />
          </span>
          Victim Voice
        </Link>
        <nav>
          <a className="vv-help-link" href="tel:112">
            <Phone size={15} /> In danger? Call 112
          </a>
          <button
            className="vv-ghost"
            onClick={async () => {
              try {
                await signOut();
                window.location.href = "/login";
              } catch {
                setError("Sign-out failed. Please try again.");
              }
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </nav>
      </header>
      <main className="vv-dash-main">
        {back && (
          <Link href={back.href} className="vv-back">
            ← {back.label}
          </Link>
        )}
        {error && (
          <p role="alert" className="vv-error">
            {error}
          </p>
        )}
        {children}
      </main>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const copy = statusCopy(status);
  return <span className={`vv-pill is-${copy.tone}`}>{copy.label}</span>;
}
