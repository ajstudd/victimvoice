import { Alert, Platform } from "react-native";
export function confirmAction(title: string, body: string, action: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.confirm(title + "\n\n" + body)) action();
    return;
  }
  Alert.alert(title, body, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: action },
  ]);
}
