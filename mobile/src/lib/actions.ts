import { Linking, Platform } from "react-native";
import * as Location from "expo-location";
import { helpMessage, smsComposerUrl } from "./help-message";
export async function openCall(phone: string) {
  await Linking.openURL("tel:" + phone);
}
export async function currentLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error(
      "Location is off. You can still call or send a message without it.",
    );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Could not get a fresh location. Try again or continue without it.",
              ),
            ),
          10000,
        );
      }),
    ]);
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export async function composeHelp(
  phones: string[],
  location?: Awaited<ReturnType<typeof currentLocation>>,
  test = false,
) {
  const text = helpMessage(location, test);
  try {
    await Linking.openURL(smsComposerUrl(phones, text, Platform.OS));
  } catch {
    throw new Error(
      "The SMS app could not open on this device. Use the installed Android app or call a trusted contact.",
    );
  }
}
