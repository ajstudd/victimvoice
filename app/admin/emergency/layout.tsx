import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: "Emergency desk | Victim Voice",
  robots: { index: false, follow: false },
};
export default function EmergencyLayout({ children }: { children: ReactNode }) {
  return children;
}
