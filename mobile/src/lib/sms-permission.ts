export type SmsCapabilities = {
  supported: boolean;
  defaultSim: boolean;
  permission: boolean;
};
export type SmsPermissionResult = "granted" | "denied" | "never_ask_again";
export type SmsAccess = {
  state:
    | "ready"
    | "choose_sim"
    | "denied"
    | "blocked"
    | "missing_app"
    | "unsupported";
  message: string;
  openSettings: boolean;
  capabilities: SmsCapabilities | null;
};
export function smsAccess(
  cap: SmsCapabilities | null,
  result?: SmsPermissionResult,
): SmsAccess {
  if (!cap)
    return {
      state: "missing_app",
      message:
        "This installed app cannot send SIM texts directly. Install the latest Android APK over this app without uninstalling. Backup SMS is a separate option.",
      openSettings: false,
      capabilities: null,
    };
  if (!cap.supported)
    return {
      state: "unsupported",
      message:
        "This app cannot use SIM SMS on this device. You can use Backup SMS when signed in and connected to the internet.",
      openSettings: false,
      capabilities: cap,
    };
  if (cap.permission)
    return cap.defaultSim
      ? {
          state: "ready",
          message:
            "SMS permission is allowed and a default SMS SIM is selected. No message was sent. Your carrier plan applies.",
          openSettings: false,
          capabilities: cap,
        }
      : {
          state: "choose_sim",
          message:
            "SMS permission is allowed. Choose a specific SIM for SMS in your phone’s SIM settings instead of “Ask every time”, then return here. No message was sent.",
          openSettings: false,
          capabilities: cap,
        };
  if (result === "never_ask_again" || result === "granted")
    return {
      state: "blocked",
      message:
        "Android has not allowed SMS access and may not show another prompt. Open app settings → Permissions → SMS. If SMS is missing or cannot be enabled, this phone or installation may restrict it; use Backup SMS instead.",
      openSettings: true,
      capabilities: cap,
    };
  return {
    state: "denied",
    message:
      result === "denied"
        ? "SMS permission was not granted. Tap Allow SIM SMS to try again, or open app settings → Permissions → SMS. No message was sent."
        : "SMS permission is required to send texts from your phone. Your carrier plan applies.",
    openSettings: true,
    capabilities: cap,
  };
}
// The driver only reads capabilities and asks for permission. It cannot send a message.
export async function requestSmsAccess(driver: {
  capabilities: () => SmsCapabilities | null;
  request: () => Promise<SmsPermissionResult>;
}): Promise<SmsAccess> {
  const before = driver.capabilities();
  if (!before || !before.supported || before.permission)
    return smsAccess(before);
  const result = await driver.request();
  return smsAccess(driver.capabilities(), result);
}
