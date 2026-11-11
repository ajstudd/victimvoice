import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: "Staff workspace | Victim Voice",
  robots: { index: false, follow: false },
};
export default function StaffLayout({ children }: { children: ReactNode }) {
  return children;
}
