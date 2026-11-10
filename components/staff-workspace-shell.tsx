"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Shield,
  Inbox,
  Radio,
  Users,
  LockKeyhole,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
export function StaffWorkspaceShell({
  children,
  active,
  role,
}: {
  children: ReactNode;
  active: "emergency" | "team";
  role: string;
}) {
  return (
    <div className="tm-shell">
      <aside className="tm-sidebar">
        <Link className="tm-brand" href="/">
          <span>
            <Shield size={23} />
          </span>
          <div>
            Victim Voice<small>SUPPORT WORKSPACE</small>
          </div>
        </Link>
        <p className="tm-nav-caption">WORKSPACE</p>
        <nav aria-label="Workspace">
          <Link href="/admin/dashboard">
            <Inbox size={18} />
            Support inbox
          </Link>
          <Link
            href="/admin/emergency"
            aria-current={active === "emergency" ? "page" : undefined}
          >
            <Radio size={18} />
            Emergency desk
            {active === "emergency" && <span className="tm-nav-dot" />}
          </Link>
          <Link
            href="/team"
            aria-current={active === "team" ? "page" : undefined}
          >
            <Users size={18} />
            Team & access{active === "team" && <span className="tm-nav-dot" />}
          </Link>
        </nav>
        <div className="tm-sidebar-bottom">
          <div className="tm-sidebar-note">
            <LockKeyhole size={18} />
            <p>Access follows each person’s role and assignments.</p>
          </div>
          <button onClick={() => void getSupabase().auth.signOut()}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="tm-workspace">
        <header className="tm-topbar">
          <span>
            Workspace <span className="tm-slash">/</span>
            {active === "emergency" ? "Emergency desk" : "Team & access"}
          </span>
          <div>
            <Link className="ed-team-link" href="/team">
              Team & access <ArrowUpRight size={13} />
            </Link>
            <span className="tm-role">
              <Shield size={13} />
              {role}
            </span>
            <button
              className="ed-mobile-signout tm-icon-button"
              aria-label="Sign out"
              onClick={() => void getSupabase().auth.signOut()}
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>
        <main className="tm-content">{children}</main>
      </div>
    </div>
  );
}
