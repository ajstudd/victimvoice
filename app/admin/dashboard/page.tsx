"use client";
import { SupportWorkspace } from "@/components/support-workspace";
import Link from "next/link";
export default function AdminDashboard() {
  return (
    <>
      <Link
        href="/admin/emergency"
        style={{
          display: "block",
          padding: 12,
          background: "#E3EEE8",
          color: "#30253D",
          textAlign: "center",
        }}
      >
        Open emergency response workspace · Bhopal, Tripura & Bhubaneswar
      </Link>
      <SupportWorkspace />
    </>
  );
}
