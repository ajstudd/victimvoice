import React, { useState } from "react";
import { View, TextInput, Pressable, Linking, ScrollView } from "react-native";
import { router } from "expo-router";
import {
  Page,
  T,
  Button,
  Row,
  Icon,
  Notice,
  s,
  colors,
  Empty,
  Badge,
} from "./ui";
import { PILOT_REGIONS } from "../../../shared/sos";
import { guides } from "../lib/guides";
import { useApp } from "../state/AppState";
export function Guide() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const { vault } = useApp();
  const found = guides.filter(
    (g) =>
      (filter === "All" ||
        g.category === filter ||
        (filter === "Saved" && vault.savedGuides.includes(g.id))) &&
      (g.title + " " + g.summary + " " + g.sections.flat().join(" "))
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Page title="Guide" tab={2}>
      <View style={{ gap: 10 }}>
        <Badge label="Your offline library" tone="success" />
        <T kind="title">A little clarity,{"\n"}at your pace.</T>
      </View>
      <T>Information and options, at your own pace.</T>
      <View style={[s.row, s.input]}>
        <Icon name="search" size={18} />
        <TextInput
          placeholderTextColor={colors.muted}
          accessibilityLabel="Search guides"
          placeholder="What is on your mind?"
          value={query}
          onChangeText={setQuery}
          style={{
            flex: 1,
            fontFamily: "Inter_400Regular",
            color: colors.ink,
            fontSize: 14,
          }}
        />
        {Boolean(query) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
            style={{
              minWidth: 36,
              minHeight: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="x" size={18} />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {["All", "Everyday", "Online", "Work", "After", "Support", "Saved"].map(
          (label) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: filter === label }}
              onPress={() => setFilter(label)}
              key={label}
              style={{
                borderRadius: 24,
                paddingHorizontal: 17,
                paddingVertical: 14,
                backgroundColor: filter === label ? colors.ink : colors.lilac,
                minHeight: 48,
              }}
            >
              <T
                kind="caption"
                color={filter === label ? colors.paper : colors.ink}
              >
                {label}
              </T>
            </Pressable>
          ),
        )}
      </ScrollView>
      <T kind="caption">
        {found.length} {found.length === 1 ? "guide" : "guides"} · Available
        offline
      </T>
      <View style={{ gap: 14 }}>
        {found.map((g, i) => (
          <Pressable
            key={g.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: "/guide-detail", params: { id: g.id } })
            }
            style={({ pressed }) => ({
              padding: 18,
              borderRadius: 22,
              backgroundColor: colors.field,
              borderWidth: 1,
              borderColor: colors.line,
              gap: 14,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View style={s.between}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: [colors.sage, colors.lilac, colors.peach][
                    i % 3
                  ],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name={g.icon as React.ComponentProps<typeof Icon>["name"]}
                />
              </View>
              <T kind="caption">{g.category} · 2 min read</T>
              {vault.savedGuides.includes(g.id) && (
                <Icon name="bookmark" size={18} color={colors.jade} />
              )}
            </View>
            <T kind="heading">{g.title}</T>
            <T>{g.summary}</T>
            <View style={s.between}>
              <T kind="caption" color={colors.jade}>
                Read guide
              </T>
              <Icon name="arrow-right" color={colors.jade} size={18} />
            </View>
          </Pressable>
        ))}
      </View>
      {!found.length && (
        <Empty
          title="Nothing here yet"
          body="Try another search or save a guide to find it here."
          icon="book-open"
        />
      )}
      <Row
        title="Find human support"
        subtitle="Official services and reporting portals"
        icon="external-link"
        onPress={() => router.push("/directory")}
      />
      <T kind="caption">
        These short introductions are not medical or legal advice. Open each
        official source for its current information. Guides are bundled for
        offline reading.
      </T>
    </Page>
  );
}
export function GuideDetail({ id }: { id?: string }) {
  const guide = guides.find((g) => g.id === id);
  const { vault, save } = useApp();
  const [message, setMessage] = useState("");
  if (!guide)
    return (
      <Page back title="Guide">
        <Empty
          title="Guide not found"
          body="Return to the library to choose another guide."
        />
      </Page>
    );
  const saved = vault.savedGuides.includes(guide.id);
  return (
    <Page back title="Guide">
      <Badge label={`${guide.category} · Available offline`} tone="success" />
      <T kind="title">{guide.title}</T>
      <T>{guide.summary}</T>
      {guide.sections.map(([title, body], index) => (
        <View key={title} style={{ gap: 12, paddingVertical: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.sage,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <T kind="label" color={colors.jade}>
              {index + 1}
            </T>
          </View>
          <T kind="heading">{title}</T>
          <T>{body}</T>
        </View>
      ))}
      <Button title="Contact my circle" onPress={() => router.push("/help")} />
      <Button
        title={saved ? "Remove from saved guides" : "Save guide"}
        tone="outline"
        icon="bookmark"
        onPress={async () => {
          try {
            await save((v) => ({
              ...v,
              savedGuides: v.savedGuides.includes(guide.id)
                ? v.savedGuides.filter((x) => x !== guide.id)
                : [...v.savedGuides, guide.id],
            }));
          } catch {
            setMessage("Could not update your saved guides.");
          }
        }}
      />
      <Row
        title={guide.source}
        subtitle="Open the official website · Internet required"
        icon="external-link"
        onPress={() =>
          Linking.openURL(guide.url).catch(() =>
            setMessage("Could not open the official website."),
          )
        }
      />
      {Boolean(message) && <Notice text={message} />}
    </Page>
  );
}
export function Directory() {
  const [error, setError] = useState("");
  const services = [
    [
      "Emergency response",
      "Open 112.gov.in for official emergency service information.",
      "https://112.gov.in/",
    ],
    [
      "Women’s support information",
      "Official women’s help and referral information. Check local availability.",
      "https://wcd.gov.in/women/help",
    ],
    [
      "Cybercrime reporting",
      "Official portal and its current reporting process.",
      "https://cybercrime.gov.in/",
    ],
    [
      "Workplace complaint information",
      "Official SHe-Box information and complaint process.",
      "https://shebox.wcd.gov.in/",
    ],
  ];
  return (
    <Page back title="Find support">
      <T kind="title">Connect with{"\n"}human help.</T>
      <T>
        Start with official resources. We do not operate these services or
        confirm their current availability.
      </T>
      <View>
        {services.map(([title, body, url]) => (
          <Row
            key={url}
            title={title}
            subtitle={body}
            icon="external-link"
            onPress={() =>
              Linking.openURL(url).catch(() =>
                setError(
                  "Could not open that website. Please check your connection.",
                ),
              )
            }
          />
        ))}
      </View>
      <T kind="heading">Pilot police directories</T>
      <T>
        Planned coverage: Bhopal, all of Tripura, and Bhubaneswar. These
        official directories do not indicate that a station has joined our
        dispatch service.
      </T>
      {PILOT_REGIONS.map((r) => (
        <Row
          key={r.id}
          title={r.name}
          subtitle={r.scope}
          icon="external-link"
          onPress={() => {
            void Linking.openURL(r.source).catch(() =>
              setError("Could not open this official directory."),
            );
          }}
        />
      ))}
      <Notice text="A city-based directory of verified local organizations is still being prepared. No fictional service listings are shown." />
      <Button
        title="Open emergency calling"
        tone="coral"
        onPress={() => router.push("/help")}
      />
      {Boolean(error) && <Notice text={error} tone="error" />}
    </Page>
  );
}
