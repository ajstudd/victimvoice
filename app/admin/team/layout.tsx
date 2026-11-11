import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: "Team & access | Victim Voice",
  robots: { index: false, follow: false },
};
export default function TeamLayout({ children }: { children: ReactNode }) {
  return children;
}
