import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {AndroidImportance,AndroidNotificationVisibility} from "expo-notifications";
import Constants from "expo-constants";
import type { Session } from "@supabase/supabase-js";
import { accountClient } from "./supabase";
export async function registerResponderPush(session: Session) {
  if (Platform.OS === "web")
    throw Error("Register push from the installed Android app.");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("safety-requests", {
      name: "Safety requests",
      importance: AndroidImportance.HIGH,
      lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw Error(
      "Notifications are not allowed. You will not receive background offers.",
    );
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw Error("App push configuration is missing.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const result = await accountClient(session).rpc("vv_sos_register_push", {
    p_token: token,
  });
  if (result.error) throw result.error;
  return token;
}
