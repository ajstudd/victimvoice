import React, { useState } from "react";
import { View, Pressable, Share, Platform } from "react-native";
import { router } from "expo-router";
import {
  Page,
  T,
  Button,
  Row,
  Field,
  Notice,
  Icon,
  Empty,
  s,
  colors,
  Badge,
} from "./ui";
import { useApp, uuid } from "../state/AppState";
import { PrivateGate } from "./PrivateGate";
import { confirmAction } from "../lib/confirm";
export function Space() {
  return (
    <PrivateGate>
      <SpaceContent />
    </PrivateGate>
  );
}
function SpaceContent() {
  const { vault } = useApp();
  return (
    <Page title="My Space" tab={3}>
      <Badge
        label={
          Platform.OS === "web"
            ? "Private browser session"
            : "Encrypted on this device"
        }
        tone="success"
      />
      <T kind="title">A space that&apos;s{"\n"}yours.</T>
      <T>Private notes and chosen next steps.</T>
      {vault.notes.length ? (
        <View style={[s.panel, { backgroundColor: colors.peach, gap: 16 }]}>
          <T kind="caption">Your latest note</T>
          <T kind="heading">{vault.notes[0].title}</T>
          <T numberOfLines={3} color={colors.ink}>
            {vault.notes[0].body}
          </T>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/note",
                params: { id: vault.notes[0].id },
              })
            }
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <T style={s.link}>Open private note →</T>
          </Pressable>
        </View>
      ) : (
        <View style={[s.panel, { backgroundColor: colors.peach }]}>
          <Icon name="edit-3" size={30} />
          <T kind="heading">Start where you are.</T>
          <T color={colors.ink}>
            A few words, a date, or a thought. You choose what to keep.
          </T>
          <T kind="caption">No one else sees a note unless you share it.</T>
        </View>
      )}
      <View>
        <Row
          title="My safety plan"
          subtitle="Your people, a place to go, and steps you choose"
          icon="list"
          onPress={() => router.push("/plan")}
        />
        {vault.supportDraft && (
          <Row
            title="Continue my support draft"
            subtitle="Saved on this device · Not shared yet"
            icon="edit-3"
            onPress={() => router.push("/request-new")}
          />
        )}
        <Row
          title="My private notes"
          subtitle={`${vault.notes.length} saved on this device`}
          icon="file-text"
          onPress={() => router.push("/notes")}
        />
        <Row
          title="My support conversations"
          subtitle="Messages and files you chose to share"
          icon="message-circle"
          onPress={() => router.push("/requests")}
        />
      </View>
      <Button
        title="Write a private note"
        icon="edit-3"
        onPress={() => router.push("/note")}
      />
      <Button
        title="Talk to support"
        tone="outline"
        icon="heart"
        onPress={() => router.push("/request-new")}
      />
      <T kind="caption" style={{ textAlign: "center" }}>
        Saving a note doesn&apos;t share it.
      </T>
    </Page>
  );
}
export function Notes() {
  return (
    <PrivateGate>
      <NotesContent />
    </PrivateGate>
  );
}
function NotesContent() {
  const { vault } = useApp();
  return (
    <Page back title="Private journal">
      <T kind="title">Your words,{"\n"}your choice.</T>
      {!vault.notes.length && (
        <Empty
          title="A blank page is okay"
          body="Nothing is shared when you write a private note."
          icon="edit-3"
        />
      )}
      <View>
        {vault.notes.map((note) => (
          <Row
            key={note.id}
            title={note.title}
            subtitle={new Date(note.createdAt).toLocaleString()}
            icon="lock"
            onPress={() =>
              router.push({ pathname: "/note", params: { id: note.id } })
            }
          />
        ))}
      </View>
      <Button title="Write a note" onPress={() => router.push("/note")} />
    </Page>
  );
}
export function NoteEditor({ id }: { id?: string }) {
  return (
    <PrivateGate>
      <NoteContent id={id} />
    </PrivateGate>
  );
}
function NoteContent({ id }: { id?: string }) {
  const { vault, save } = useApp();
  const existing = vault.notes.find((n) => n.id === id);
  const [title, setTitle] = useState(existing?.title || "");
  const [body, setBody] = useState(existing?.body || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    setError("");
    if (!body.trim()) {
      setError("Write a few words before saving.");
      return;
    }
    setBusy(true);
    try {
      const note = {
        id: existing?.id || uuid(),
        title: title.trim() || "A note to myself",
        body: body.trim(),
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      await save((v) => ({
        ...v,
        notes: [note, ...v.notes.filter((n) => n.id !== note.id)],
      }));
      router.replace("/notes");
    } catch {
      setError("Your note could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    try {
      await save((v) => ({ ...v, notes: v.notes.filter((n) => n.id !== id) }));
      router.replace("/notes");
    } catch {
      setError("Could not delete this note.");
    }
  }
  return (
    <Page back title={existing ? "Private note" : "Write a private note"}>
      <T kind="title">Just for you.</T>
      <View style={s.row}>
        <Icon name="lock" size={17} />
        <T kind="caption">
          {Platform.OS === "web"
            ? "Preview only · Notes disappear on refresh"
            : "Private · Saved only on this phone"}
        </T>
      </View>
      <Field
        label="Title (optional)"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <Field
        label="What would you like to keep?"
        placeholder="Write as much or as little as you like…"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={20000}
        style={{ minHeight: 250 }}
      />
      <Button title="Save privately" icon="lock" onPress={submit} busy={busy} />
      {existing && (
        <>
          <Button
            title="Share this note"
            tone="outline"
            icon="share"
            onPress={() =>
              Share.share({ message: title + "\n\n" + body }).catch(() =>
                setError("The share sheet could not be opened."),
              )
            }
          />
          <Button
            title="Delete this note"
            tone="outline"
            onPress={() =>
              confirmAction(
                "Delete this note?",
                "This removes the on-device note. Copies you have already shared are not removed.",
                remove,
              )
            }
          />
        </>
      )}
      <T kind="caption">
        Your journal stays on this device. To share media or links with support,
        open a support conversation and choose Evidence.
      </T>
      {Boolean(error) && <Notice text={error} tone="error" />}
    </Page>
  );
}
