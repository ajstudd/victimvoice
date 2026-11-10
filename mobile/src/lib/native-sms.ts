import { Platform, PermissionsAndroid } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { requestSmsAccess, type SmsCapabilities } from "./sms-permission";
import type { NativeResult } from "../../../shared/sos";
type SmsModule = {
  attachRelayAsync: (
    id: string,
    url: string,
    token: string,
    event: string,
    contact: string,
  ) => Promise<void>;
  clearRelayAsync: (ids: string[]) => Promise<void>;
  capabilities: () => SmsCapabilities;
  sendAsync: (id: string, to: string, body: string) => Promise<NativeResult>;
  getAttemptAsync: (id: string) => Promise<
    Omit<NativeResult, "status"> & {
      status: NativeResult["status"] | "missing";
    }
  >;
};
export const nativeSms =
  Platform.OS === "android"
    ? requireOptionalNativeModule<SmsModule>("VictimSms")
    : null;
export async function allowSms() {
  return requestSmsAccess({
    capabilities: () =>
      Platform.OS === "android" ? nativeSms?.capabilities() || null : null,
    request: () =>
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
        title: "Send safety messages",
        message:
          "Allow Victim Voice to send safety SMS directly to the contacts you select. Your carrier plan applies. We do not read your SMS inbox.",
        buttonPositive: "Continue",
        buttonNegative: "Not now",
      }),
  });
}
