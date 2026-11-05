import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { AppState } from "react-native";
import * as Auth from "expo-local-authentication";
import { useApp } from "../state/AppState";
import { Button, Page, T, Notice } from "./ui";
export function PrivateGate({ children }: { children: React.ReactNode }) {
  const { vault, ready, notice } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => () => setUnlocked(false), []));
  useEffect(() => {
    const sub = AppState.addEventListener("change", (v) => {
      if (v !== "active") setUnlocked(false);
    });
    return () => sub.remove();
  }, []);
  async function unlock() {
    try {
      const result = await Auth.authenticateAsync({
        promptMessage: "Open your private space",
        disableDeviceFallback: false,
      });
      setUnlocked(result.success);
      if (!result.success) setError("Your private space is still locked.");
    } catch {
      setError("Device authentication is unavailable.");
    }
  }
  if (!ready)
    return (
      <Page back title="Private space">
        {notice ? (
          <Notice text={notice} tone="error" />
        ) : (
          <T>Opening private storage…</T>
        )}
        <Button
          title="Get help"
          tone="coral"
          onPress={() => router.push("/help")}
        />
      </Page>
    );
  if (!vault.locked || unlocked) return <>{children}</>;
  return (
    <Page back title="Private space">
      <T kind="title">A space that&apos;s yours.</T>
      <T>
        Unlock with your device security to view private records. Emergency
        contacts remain available from Get help.
      </T>
      {Boolean(error) && <Notice text={error} tone="error" />}
      <Button title="Unlock private space" icon="unlock" onPress={unlock} />
      <Button
        title="Get emergency help"
        tone="outline"
        onPress={() => router.push("/help")}
      />
    </Page>
  );
}
