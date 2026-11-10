import React, { useCallback, useState } from "react";
import { View, Switch, Platform, Share, Linking } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as DeviceAuth from "expo-local-authentication";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import {
  Page,
  T,
  Button,
  Field,
  Notice,
  Row,
  Badge,
  Icon,
  s,
  colors,
} from "./ui";
import { PrivateGate } from "./PrivateGate";
import { useApp } from "../state/AppState";
import {
  supabase,
  googleSignIn,
  backendConfigured,
  cloudError,
} from "../lib/supabase";
import { normalizePhone } from "../lib/safety";
import { confirmAction } from "../lib/confirm";
import { privateStorage } from "../lib/storage";
import { deleteAccountWithEvidence } from "../../../shared/case-evidence";
import { AppUpdates } from "./AppUpdates";
import { MotionSettings } from "./MotionSafety";
export function Login() {
  const { session } = useApp();
  const [phone, setPhone] = useState("+91");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function sms() {
    const normalized = normalizePhone(phone);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    if (error) throw error;
    setSentTo(normalized);
    setMessage(
      "The provider accepted your request. Delivery may take a moment.",
    );
  }
  async function verify() {
    const { error } = await supabase.auth.verifyOtp({
      phone: sentTo,
      token: code.trim(),
      type: "sms",
    });
    if (error) throw error;
    router.replace("/settings");
  }
  if (session)
    return (
      <Page back title="Your account">
        <T kind="title">You&apos;re signed in.</T>
        <T>{session.user.email || session.user.phone}</T>
        <Button
          title="Back to my account"
          onPress={() => router.replace("/settings")}
        />
      </Page>
    );
  return (
    <Page back title="Victim Voice">
      <T kind="title">Support, within reach.</T>
      <T>
        Sign in to use your private support inbox and optionally sync your
        circle. Emergency access and your guest space remain available without
        an account.
      </T>
      {!backendConfigured && (
        <Notice
          tone="error"
          text="Sign-in is temporarily unavailable. Please try again later."
        />
      )}
      <Button
        title="Continue with Google"
        icon="log-in"
        onPress={() => run(googleSignIn)}
        busy={busy}
        disabled={!backendConfigured}
      />
      <View style={s.divider} />
      {sentTo ? (
        <>
          <T kind="label">Verification code</T>
          <T>For the number ending {sentTo.slice(-4)}</T>
          <Field
            label="SMS code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="sms-otp"
          />
          <Button
            title="Verify & continue"
            onPress={() => run(verify)}
            busy={busy}
            disabled={code.length !== 6}
          />
          <Button
            title="Change number or request another code"
            tone="outline"
            onPress={() => {
              setSentTo("");
              setCode("");
              setMessage("");
            }}
          />
        </>
      ) : (
        <>
          <Field
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <Button
            title="Send verification code"
            tone="outline"
            busy={busy}
            disabled={!backendConfigured}
            onPress={() => run(sms)}
          />
        </>
      )}
      {Boolean(message) && <Notice text={message} />}
      {Boolean(error) && <Notice tone="error" text={error} />}
      <Button
        title="Continue without signing in"
        tone="outline"
        onPress={() => router.replace("/")}
      />
      <T kind="caption">
        Guest notes and account notes are separate private spaces. Signing in
        does not upload guest notes or contacts.
      </T>
    </Page>
  );
}
export function Settings() {
  return (
    <PrivateGate>
      <SettingsContent />
    </PrivateGate>
  );
}
function SettingsContent() {
  const { vault, save, session, signOut } = useApp();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  async function setLock(value: boolean) {
    if (value) {
      if (Platform.OS === "web")
        throw new Error(
          "Device app lock is available in the Android app, not the browser preview.",
        );
      if (
        (await DeviceAuth.getEnrolledLevelAsync()) ===
        DeviceAuth.SecurityLevel.NONE
      )
        throw new Error(
          "Set up a device screen lock before enabling app lock.",
        );
      const result = await DeviceAuth.authenticateAsync({
        promptMessage: "Enable private-space lock",
        disableDeviceFallback: false,
      });
      if (!result.success) return;
    } else {
      const result = await DeviceAuth.authenticateAsync({
        promptMessage: "Disable private-space lock",
        disableDeviceFallback: false,
      });
      if (!result.success) return;
    }
    await save((v) => ({ ...v, locked: value }));
  }
  async function deleteAccount() {
    if (!session) return;
    const uid = session.user.id;
    await deleteAccountWithEvidence(supabase);
    await privateStorage.removeItem("vault." + uid);
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/");
  }
  return (
    <Page back title="Privacy & control">
      <T kind="title">Settings.{"\n"}Your preferences.</T>
      <T>Choose how this app works for you.</T>
      <MotionSettings />
      <View>
        <Row
          title="Your account"
          subtitle={
            session?.user.email || session?.user.phone || "Guest · Signed out"
          }
          icon="user"
          onPress={() => router.push("/login")}
        />
        <Row
          title="Lock private areas"
          subtitle="Protect notes, plans and account settings. Emergency contacts stay accessible from Get help."
          icon="lock"
          end={
            <Switch
              accessibilityLabel="Lock private areas"
              disabled={busy}
              value={vault.locked}
              onValueChange={(v) => run(() => setLock(v))}
              trackColor={{ true: colors.jade }}
            />
          }
        />
        <Row
          title="Safety message setup"
          subtitle="Choose who receives your alert and how to reach them"
          icon="send"
          onPress={() => router.push("/sos-setup")}
        />
        <Row
          title="Join the support team"
          subtitle="Invited staff and partner volunteers: enrollment and assignments"
          icon="users"
          onPress={() =>
            void run(() =>
              Linking.openURL("https://victimvoice.vercel.app/team"),
            )
          }
        />
        <Row
          title="Emergency responder"
          subtitle="Invited responders: manage duty and authorized requests"
          icon="users"
          onPress={() => router.push("/responder")}
        />
        <Row
          title="Location sharing"
          subtitle="Choose a location snapshot or share your journey while the app is open"
          icon="map-pin"
        />
        <Row
          title="Screenshots & recording"
          subtitle={
            Platform.OS === "web"
              ? "Screenshots cannot be blocked in a browser. The phone app protects private screens."
              : "App capture protection is enabled, including the recent-app preview on Android. A separate camera cannot be blocked."
          }
          icon="shield"
        />
        <Row title="Language" subtitle="English" icon="globe" />
        <Row
          title="Device & permissions"
          subtitle="Check location, motion and device security"
          icon="wifi"
          onPress={() => router.push("/status")}
        />
      </View>
      <View>
        <Row
          title="Export private notes"
          subtitle="Opens your device share sheet with your notes"
          icon="upload"
          onPress={() =>
            confirmAction(
              "Export your private notes?",
              "The share sheet will include the notes in this private space. Choose the recipient carefully.",
              () =>
                run(async () => {
                  await Share.share({
                    message: JSON.stringify(vault.notes, null, 2),
                  });
                }),
            )
          }
        />
        <Row
          title="Clear on-device notes"
          subtitle="Remove local notes from this private space"
          icon="trash-2"
          danger
          onPress={() =>
            confirmAction(
              "Delete these notes?",
              "This cannot be undone. Already shared copies are not removed.",
              () =>
                run(async () => {
                  await save((v) => ({ ...v, notes: [] }));
                  setMessage("On-device notes cleared.");
                }),
            )
          }
        />
      </View>
      {session ? (
        <>
          <Button
            title="Sign out"
            tone="outline"
            busy={busy}
            onPress={() =>
              run(async () => {
                await signOut();
                router.replace("/");
              })
            }
          />
          <Row
            title="Delete account"
            subtitle="Deletes your account, cloud contacts, cases, messages, and shared media"
            icon="trash-2"
            danger
            onPress={() =>
              confirmAction(
                "Permanently delete your account?",
                "Your cloud records and this account’s on-device space will be deleted. This cannot be undone. Previously shared messages remain with their recipients.",
                () => run(deleteAccount),
              )
            }
          />
        </>
      ) : (
        <Button title="Sign in" onPress={() => router.push("/login")} />
      )}
      <AppUpdates />
      {Boolean(message) && <Notice text={message} />}
      <Notice
        text={
          Platform.OS === "web"
            ? "Private notes in this browser disappear when you refresh or close the page. Use the phone app to keep them."
            : "Your notes stay encrypted on this phone. Only contacts you choose to sync are saved to your account."
        }
      />
      <T kind="caption">
        Shake and drop alerts pause when you close or lock the app. For urgent
        help, use Get help. You can reach your support team through your
        conversations.
      </T>
    </Page>
  );
}
export function Status() {
  const { session, vault } = useApp();
  const [checks, setChecks] = useState({
    location: "Checking…",
    motion: "Checking…",
    security: "Checking…",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const read = useCallback(async (isActive: () => boolean = () => true) => {
    setBusy(true);
    try {
      if (Platform.OS === "web") {
        if (isActive())
          setChecks({
            location:
              "Choose Include my location from Get help to request a snapshot",
            motion: "Motion detection is available in the phone app",
            security: "Device lock is available in the installed app",
          });
        return;
      }
      const results = await Promise.allSettled([
        Location.getForegroundPermissionsAsync(),
        Location.hasServicesEnabledAsync(),
        Accelerometer.isAvailableAsync(),
        DeviceAuth.getEnrolledLevelAsync(),
      ]);
      if (!isActive()) return;
      const permission = results[0],
        service = results[1],
        motion = results[2],
        security = results[3];
      setChecks({
        location:
          permission.status === "fulfilled"
            ? permission.value.granted
              ? service.status === "fulfilled" && !service.value
                ? "Permission allowed · Device location services are off"
                : "Permission allowed · Snapshot only when you choose"
              : permission.value.canAskAgain
                ? "Not allowed yet · Request from Get help"
                : "Denied · Change this in device settings"
            : "Could not read location permission",
        motion:
          motion.status === "fulfilled"
            ? motion.value
              ? "Sensor available · Works while the app is open"
              : "No motion sensor available"
            : "Could not check motion sensor",
        security:
          security.status === "fulfilled"
            ? security.value !== DeviceAuth.SecurityLevel.NONE
              ? "Device screen lock is set up"
              : "Set up a device screen lock to protect private areas"
            : "Could not read device security",
      });
    } catch {
      if (isActive()) setError("Could not check this device. Try again.");
    } finally {
      if (isActive()) setBusy(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void read(() => active);
      return () => {
        active = false;
      };
    }, [read]),
  );
  return (
    <Page
      back
      title="Device & permissions"
      onRefresh={() => read()}
      refreshing={busy}
    >
      <Badge label="Permission checks · No alerts sent" />
      <T kind="title">Know your{"\n"}setup.</T>
      <T>
        These checks read permission status. They don’t request your location or
        contact anyone.
      </T>
      <View
        style={[
          s.panel,
          {
            backgroundColor: colors.field,
            borderWidth: 1,
            borderColor: colors.line,
          },
        ]}
      >
        <View style={s.row}>
          <Icon name="map-pin" />
          <T kind="heading">Location</T>
        </View>
        <T>{checks.location}</T>
        <Button
          title="Open location choice"
          tone="outline"
          onPress={() => router.push("/help")}
        />
      </View>
      <Row
        title="Shake & drop alerts"
        subtitle={checks.motion}
        icon="activity"
        onPress={() => router.push("/settings")}
      />
      <Row title="Device security" subtitle={checks.security} icon="lock" />
      <Row
        title="Private-space lock"
        subtitle={
          vault.locked
            ? "Enabled for notes, plans and account settings"
            : "Off · Enable from Privacy & control"
        }
        icon="shield"
        onPress={() => router.push("/settings")}
      />
      <Row
        title="Support conversations"
        subtitle={
          session
            ? "Continue a conversation or start a new one"
            : "Sign in to message the support team and get replies"
        }
        icon="message-circle"
        onPress={() => router.push(session ? "/requests" : "/login")}
      />
      <Row
        title="Offline guide library"
        subtitle="All bundled guides are available without a connection"
        icon="book-open"
        onPress={() => router.push("/guide")}
      />
      {Platform.OS !== "web" && (
        <Button
          title="Open device app settings"
          icon="settings"
          tone="outline"
          onPress={() => {
            void Linking.openSettings().catch(() =>
              setError("Could not open device settings."),
            );
          }}
        />
      )}
      <Button
        title="Check again"
        busy={busy}
        icon="refresh-cw"
        tone="outline"
        onPress={() => read()}
      />
      <Notice text="Safety requests use the contacts and delivery choices in your settings. Shake and drop alerts work while the app is open. Check your request for message status; sending a message does not confirm that someone has responded." />
      {Boolean(error) && <Notice text={error} tone="error" />}
    </Page>
  );
}
