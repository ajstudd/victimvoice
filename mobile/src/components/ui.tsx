import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
export const colors = {
  paper: "#FBF7F2",
  ink: "#30253D",
  muted: "#665B6D",
  coral: "#CB433C",
  error: "#A92E2A",
  jade: "#2C6D5D",
  lilac: "#ECE5F0",
  peach: "#F5DECC",
  line: "#E5DCE2",
  white: "#FFFFFF",
  field: "#FFFDFC",
  sage: "#E3EEE8",
};
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 22,
  },
  title: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 36,
    lineHeight: 43,
    color: colors.ink,
    letterSpacing: -1,
  },
  heading: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 23,
    lineHeight: 30,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  panel: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.lilac,
    gap: 12,
  },
  divider: { height: 1, backgroundColor: colors.line },
  input: {
    backgroundColor: "#FFFDFC",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    minHeight: 54,
    padding: 15,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: colors.ink,
  },
  caption: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  link: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: colors.ink,
    textDecorationLine: "underline",
  },
});
export function Icon({
  name,
  size = 21,
  color = colors.ink,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} />;
}
export function T({
  children,
  kind = "body",
  color,
  style,
  ...props
}: {
  children?: React.ReactNode;
  kind?: "body" | "title" | "heading" | "label" | "caption";
  color?: string;
  style?: any;
} & React.ComponentProps<typeof Text>) {
  return (
    <Text {...props} style={[s[kind], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  tone = "plum",
  icon,
  disabled = false,
  busy = false,
}: {
  title: string;
  onPress: () => void;
  tone?: "plum" | "coral" | "outline" | "cream";
  icon?: React.ComponentProps<typeof Feather>["name"];
  disabled?: boolean;
  busy?: boolean;
}) {
  const filled = tone === "plum" || tone === "coral";
  const bg =
    tone === "plum"
      ? colors.ink
      : tone === "coral"
        ? colors.coral
        : tone === "cream"
          ? colors.paper
          : "transparent";
  const fg =
    tone === "coral" ? colors.white : filled ? colors.paper : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: bg,
        borderWidth: tone === "outline" ? 1 : 0,
        borderColor: colors.line,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      })}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : icon ? (
        <Icon name={icon} color={fg} />
      ) : null}
      <T kind="label" color={fg} style={{ textAlign: "center", flexShrink: 1 }}>
        {title}
      </T>
    </Pressable>
  );
}
export function Avatar({
  name,
  index = 0,
  size = 48,
}: {
  name: string;
  index?: number;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: index % 2 ? colors.lilac : colors.peach,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <T
        kind="heading"
        style={{ fontSize: size * 0.38, lineHeight: size * 0.5 }}
      >
        {name.trim().slice(0, 1).toUpperCase() || "+"}
      </T>
    </View>
  );
}
export function Row({
  title,
  subtitle,
  icon,
  onPress,
  end,
  danger = false,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  onPress?: () => void;
  end?: React.ReactNode;
  danger?: boolean;
}) {
  const content = (
    <>
      {icon && (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            backgroundColor: danger ? "#F9E5E2" : colors.lilac,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name={icon}
            size={19}
            color={danger ? colors.error : colors.ink}
          />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <T kind="label" color={danger ? colors.coral : undefined}>
          {title}
        </T>
        {Boolean(subtitle) && <T kind="caption">{subtitle}</T>}
      </View>
      {end || (onPress ? <Icon name="chevron-right" size={18} /> : null)}
    </>
  );
  const style = {
    flexDirection: "row" as const,
    gap: 14,
    alignItems: "center" as const,
    paddingVertical: 17,
    minHeight: 64,
    borderBottomWidth: 1,
    borderColor: colors.line,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.65 : 1 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}
const tabs = [
  ["/", "home", "Home"],
  ["/circle", "users", "My Circle"],
  ["/guide", "book-open", "Guide"],
  ["/space", "lock", "My Space"],
] as const;
export function Page({
  children,
  title,
  back = false,
  tab,
  dark = false,
  footer,
  onRefresh,
  refreshing = false,
  scrollRef,
  onScroll,
  onContentSizeChange,
}: {
  children: React.ReactNode;
  title?: string;
  back?: boolean;
  tab?: number;
  dark?: boolean;
  footer?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scrollRef?: React.ComponentProps<typeof ScrollView>["ref"];
  onScroll?: React.ComponentProps<typeof ScrollView>["onScroll"];
  onContentSizeChange?: React.ComponentProps<
    typeof ScrollView
  >["onContentSizeChange"];
}) {
  const bg = dark ? colors.ink : colors.paper;
  return (
    <SafeAreaView
      style={[s.page, { backgroundColor: bg }]}
      edges={["top", "bottom"]}
    >
      <StatusBar style={dark ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            paddingHorizontal: 24,
            height: 56,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={[s.row, { flex: 1 }]}>
            {back && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/")
                }
                style={{ width: 48, height: 48, justifyContent: "center" }}
              >
                <Icon
                  name="arrow-left"
                  color={dark ? colors.paper : colors.ink}
                />
              </Pressable>
            )}
            <T kind="label" color={dark ? colors.paper : colors.ink}>
              {title || "Victim Voice"}
            </T>
          </View>
          {!back && (
            <Pressable
              accessibilityLabel="Settings and account"
              accessibilityRole="button"
              onPress={() => router.push("/settings")}
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: colors.lilac,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="user" size={17} />
              </View>
            </Pressable>
          )}
        </View>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={100}
          onContentSizeChange={onContentSizeChange}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.jade}
              />
            ) : undefined
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, dark ? { flexGrow: 1 } : null]}
        >
          {children}
        </ScrollView>
        {footer && (
          <View
            style={{
              paddingHorizontal: 22,
              paddingTop: 12,
              paddingBottom: 12,
              borderTopWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.paper,
            }}
          >
            {footer}
          </View>
        )}
        {tab !== undefined && (
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 8,
              paddingTop: 7,
              borderTopWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.paper,
            }}
          >
            {tabs.map(([route, icon, label], i) => (
              <Pressable
                key={label}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === i }}
                accessibilityLabel={label}
                onPress={() => router.replace(route)}
                style={{
                  flex: 1,
                  minHeight: 64,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                }}
              >
                <View
                  style={{
                    minWidth: 52,
                    height: 30,
                    borderRadius: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: tab === i ? colors.sage : "transparent",
                  }}
                >
                  <Icon
                    name={icon}
                    color={tab === i ? colors.jade : colors.muted}
                  />
                </View>
                <T
                  kind="caption"
                  color={tab === i ? colors.jade : colors.muted}
                  style={{
                    fontFamily:
                      tab === i ? "Inter_600SemiBold" : "Inter_400Regular",
                    fontSize: 11,
                  }}
                >
                  {label}
                </T>
              </Pressable>
            ))}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <T kind="label">{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          s.input,
          focused
            ? { borderColor: colors.jade, backgroundColor: colors.white }
            : null,
          props.editable === false ? { opacity: 0.65 } : null,
          props.multiline ? { minHeight: 150, textAlignVertical: "top" } : null,
          props.style,
        ]}
      />
      {hint && <T kind="caption">{hint}</T>}
    </View>
  );
}
export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "urgent";
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor:
          tone === "success"
            ? colors.sage
            : tone === "urgent"
              ? "#F9E5E2"
              : colors.lilac,
      }}
    >
      <T
        kind="caption"
        color={
          tone === "urgent"
            ? colors.error
            : tone === "success"
              ? colors.jade
              : colors.ink
        }
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {label}
      </T>
    </View>
  );
}
export function SectionHeading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.between}>
      <T kind="heading" style={{ flexShrink: 1 }}>
        {title}
      </T>
      {action && onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 48, justifyContent: "center", paddingLeft: 8 }}
        >
          <T style={s.link}>{action}</T>
        </Pressable>
      )}
    </View>
  );
}
export function Notice({
  text,
  tone = "plain",
}: {
  text: string;
  tone?: "plain" | "error" | "success";
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        padding: 14,
        borderRadius: 14,
        backgroundColor:
          tone === "error"
            ? "#F9E5E2"
            : tone === "success"
              ? "#E3EEE8"
              : colors.lilac,
      }}
    >
      <T kind="caption" color={tone === "error" ? colors.error : colors.ink}>
        {text}
      </T>
    </View>
  );
}
export function Empty({
  title,
  body,
  icon = "heart",
}: {
  title: string;
  body: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 30, gap: 12 }}>
      <Icon name={icon} size={34} color={colors.muted} />
      <T kind="heading" style={{ textAlign: "center" }}>
        {title}
      </T>
      <T style={{ textAlign: "center" }}>{body}</T>
    </View>
  );
}
