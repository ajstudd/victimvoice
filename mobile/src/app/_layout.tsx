import React from "react";
import { Stack } from "expo-router";
import { View, ActivityIndicator, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Lora_600SemiBold } from "@expo-google-fonts/lora";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "../state/AppState";
import { colors } from "../components/ui";
import { SosNotifications } from "../components/SosNotifications";
import { SosCoordinator } from "../components/SosCoordinator";
import { ScreenPrivacy } from "../components/ScreenPrivacy";
export default function Layout() {
  const [loaded, error] = useFonts({
    Lora_600SemiBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.paper,
        }}
      >
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ScreenPrivacy />
        <SosCoordinator />
        <SosNotifications />
        <StatusBar style="dark" />
        <View
          style={{ flex: 1, backgroundColor: "#E8E2E8", alignItems: "center" }}
        >
          <View
            style={{
              flex: 1,
              width: "100%",
              maxWidth: Platform.OS === "web" ? 480 : undefined,
              backgroundColor: colors.paper,
            }}
          >
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.paper },
                animation: "slide_from_right",
              }}
            />
          </View>
        </View>
      </AppProvider>
    </SafeAreaProvider>
  );
}
