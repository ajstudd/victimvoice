import type { Metadata } from "next";
import { SupportWorkspace } from "@/components/support-workspace";
export const metadata: Metadata = { title: "Support inbox | Victim Voice" };
export default function AdminDashboard() {
  return <SupportWorkspace />;
}
