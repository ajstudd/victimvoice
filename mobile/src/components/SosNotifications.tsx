import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { isUuid } from "../../../shared/sos";
export function SosNotifications() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    let active = true;
    let last = "";
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!active || !response) return;
      const request = response.notification.request;
      const id = request.content.data?.sosId;
      if (isUuid(id) && request.identifier !== last) {
        last = request.identifier;
        router.push({ pathname: "/sos-case", params: { id } });
      }
    };
    const listener =
      Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => {});
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return null;
}
