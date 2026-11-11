"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkforceSession } from "@/hooks/useWorkforceSession";
import {
  canManagePersonnel,
  legacyTeamDestination,
  staffHomeForRole,
} from "@/lib/staff-routing";

export function StaffRouteStatus({
  error,
  retry,
}: {
  error?: string;
  retry?: () => void;
}) {
  return (
    <main className="staff-route-status min-h-screen flex flex-col items-center justify-center gap-5 p-6 text-center">
      <h1 className="text-2xl font-semibold">Victim Voice staff workspace</h1>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <button className="tm-button" onClick={retry}>
            Try again
          </button>
          <Link href="/join">Accept a staff invitation</Link>
        </>
      ) : (
        <p role="status">Opening your workspace…</p>
      )}
    </main>
  );
}

export function StaffEntry({ legacy = false }: { legacy?: boolean }) {
  const state = useWorkforceSession();
  const router = useRouter();
  useEffect(() => {
    if (state.loading || state.error) return;
    const destination = legacy
      ? legacyTeamDestination(state.context?.role)
      : !state.userId
        ? "/admin/login?next=%2Fadmin"
        : staffHomeForRole(state.context?.role || "", state.responderRole) ||
          "/join";
    router.replace(destination);
  }, [
    state.loading,
    state.error,
    state.context,
    state.userId,
    state.responderRole,
    legacy,
    router,
  ]);
  return <StaffRouteStatus error={state.error} retry={state.retry} />;
}

export function PersonnelAccess({
  children,
}: {
  children: (userId: string) => ReactNode;
}) {
  const state = useWorkforceSession();
  const router = useRouter();
  const allowed =
    !!state.userId && canManagePersonnel(state.context?.role || "");
  useEffect(() => {
    if (state.loading || state.error || allowed) return;
    router.replace(
      !state.userId
        ? "/admin/login?next=%2Fadmin%2Fteam"
        : staffHomeForRole(state.context?.role || "", state.responderRole) ||
            "/join",
    );
  }, [
    state.loading,
    state.error,
    allowed,
    state.userId,
    state.context,
    state.responderRole,
    router,
  ]);
  if (state.loading || state.error || !allowed)
    return <StaffRouteStatus error={state.error} retry={state.retry} />;
  return <>{children(state.userId!)}</>;
}
