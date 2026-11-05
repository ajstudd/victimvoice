import { createClient, type Session } from "@supabase/supabase-js";
import { privateStorage } from "./storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { createAccountClient } from "./account-client";
WebBrowser.maybeCompleteAuthSession();
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const backendConfigured = !!(url && key);
export const supabase = createClient(
  url || "https://unconfigured.supabase.co",
  key || "unconfigured",
  {
    auth: {
      storage: privateStorage,
      autoRefreshToken: true,
      persistSession: Platform.OS !== "web",
      flowType: "pkce",
      detectSessionInUrl: false,
    },
  },
);
// Bind writes to the session that initiated them. Owner IDs remain database
// defaults; clients deliberately do not have INSERT grants for those columns.
export function accountClient(session: Session) {
  return createAccountClient(
    url || "https://unconfigured.supabase.co",
    key || "unconfigured",
    session.access_token,
  );
}
export async function googleSignIn() {
  if (!backendConfigured) throw new Error("Supabase has not been configured.");
  if (Platform.OS === "web")
    throw new Error(
      "Use the installed Android app for Google sign-in, or the existing website. Phone sign-in is available in this preview.",
    );
  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Google sign-in could not start.");
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return;
  const parsed = new URL(result.url);
  const code = parsed.searchParams.get("code");
  if (!code)
    throw new Error("Sign-in was cancelled or expired. Please try again.");
  const exchanged = await supabase.auth.exchangeCodeForSession(code);
  if (exchanged.error) throw exchanged.error;
}
export function cloudError(e: unknown) {
  const msg = (e as { message?: string })?.message || "Please try again.";
  if (/PGRST202|42883/.test((e as { code?: string })?.code || ""))
    return "The support workspace needs its Supabase setup script. Existing support messages are still saved.";
  if (
    /schema cache|does not exist|permission denied.*vv_|Could not find.*vv_/i.test(
      msg,
    )
  )
    return "The mobile backend needs its setup script. Your on-device data is still available.";
  return msg;
}
