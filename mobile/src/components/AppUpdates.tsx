import React, { useState } from "react";
import { Platform, View } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Button, Notice, T, s } from "./ui";

export function AppUpdates() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function check() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable && !update.isRollBackToEmbedded) {
        setMessage("Your app is up to date.");
        return;
      }
      await Updates.fetchUpdateAsync();
      setMessage(
        "An update is ready. It will be applied after you fully close and reopen the app. Your current session will keep running.",
      );
    } catch {
      setFailed(true);
      setMessage(
        "Updates could not be checked. Your current app still works; try again when connected.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={[s.panel, { gap: 12 }]}>
      <T kind="label">App updates</T>
      <T kind="caption">
        Version {Constants.expoConfig?.version || "unknown"} ·{" "}
        {Updates.channel ? "Automatic updates enabled" : "Installed version"}
      </T>
      {Platform.OS !== "web" && Updates.isEnabled && (
        <T kind="caption">
          {Updates.isEmbeddedLaunch
            ? "Using the installed app version."
            : "Your downloaded update is active."}
        </T>
      )}
      {Platform.OS === "web" ? (
        <T kind="caption">
          The website updates on refresh. Install the Android app to receive app
          updates.
        </T>
      ) : Updates.isEnabled ? (
        <>
          <T kind="caption">
            Updates download when you open the app. Close and reopen it to use
            them. Some improvements need the latest app version.
          </T>
          <Button
            title="Check for app updates"
            tone="outline"
            busy={busy}
            onPress={check}
          />
        </>
      ) : (
        <T kind="caption">
          Install the latest Android app version to enable automatic updates.
        </T>
      )}
      {Boolean(message) && (
        <Notice text={message} tone={failed ? "error" : "plain"} />
      )}
    </View>
  );
}
