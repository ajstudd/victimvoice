import React, { useEffect } from "react";
import { Platform } from "react-native";
import {
  usePreventScreenCapture,
  enableAppSwitcherProtectionAsync,
  disableAppSwitcherProtectionAsync,
} from "expo-screen-capture";
function NativeProtection() {
  usePreventScreenCapture("victimvoice-private-app");
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void enableAppSwitcherProtectionAsync(1).catch(() => {});
    return () => {
      void disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, []);
  return null;
}
export function ScreenPrivacy() {
  return Platform.OS === "web" ? null : <NativeProtection />;
}
