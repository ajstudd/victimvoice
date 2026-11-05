import { Platform, PermissionsAndroid } from "react-native";
import { requireOptionalNativeModule } from "expo";
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
  capabilities: () => {
    supported: boolean;
    defaultSim: boolean;
    permission: boolean;
  };
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
  if (Platform.OS !== "android" || !nativeSms)
    throw new Error("Install the new Android APK to enable SIM sending.");
  return (
    (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
      title: "Send safety messages",
      message:
        "Allow Victim Voice to send safety SMS directly to the contacts you select. Your carrier plan applies. We do not read your SMS inbox.",
      buttonPositive: "Continue",
      buttonNegative: "Not now",
    })) === PermissionsAndroid.RESULTS.GRANTED
  );
}
