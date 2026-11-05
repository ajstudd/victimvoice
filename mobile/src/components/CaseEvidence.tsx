import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Image, AppState, Platform, Linking } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Picker from "expo-document-picker";
import * as Crypto from "expo-crypto";
import { File, Paths } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Button, Field, Notice, T, Row, s, colors } from "./ui";
import { supabase, cloudError } from "../lib/supabase";
import {
  addEvidenceLink,
  listEvidence,
  uploadEvidence,
} from "../../../shared/case-evidence";
import {
  EvidenceItem,
  EVIDENCE_TYPES,
  evidenceSize,
  validateEvidenceFile,
  publicEvidenceLink,
} from "../../../shared/evidence";

const digest = async (bytes: ArrayBuffer) =>
  Array.from(
    new Uint8Array(
      await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
type Preview = { item: EvidenceItem; uri?: string; link?: string };
export function CaseEvidence({ requestId }: { requestId: string }) {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [selected, setSelected] = useState<Picker.DocumentPickerAsset | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const generation = useRef(0);
  const local = useRef<File | null>(null);
  const objectUrl = useRef<string | null>(null);
  const picked = useRef<File | null>(null);
  const close = useCallback(() => {
    generation.current++;
    if (local.current?.exists) local.current.delete();
    local.current = null;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setPreview(null);
  }, []);
  const refresh = useCallback(async () => {
    try {
      setItems(await listEvidence(supabase, requestId));
      setError("");
    } catch (e) {
      setError(cloudError(e));
    }
  }, [requestId]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      const listener = AppState.addEventListener("change", (state) => {
        if (state !== "active") close();
      });
      return () => {
        listener.remove();
        close();
        if (picked.current?.exists) picked.current.delete();
        picked.current = null;
        setSelected(null);
      };
    }, [refresh, close]),
  );
  async function choose() {
    try {
      const result = await Picker.getDocumentAsync({
        type: EVIDENCE_TYPES,
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      if (picked.current?.exists) picked.current.delete();
      const asset = result.assets[0];
      setSelected(asset);
      setLink("");
      if (Platform.OS !== "web") picked.current = new File(asset.uri);
      if (!label) setLabel(asset.name.slice(0, 160));
    } catch (e) {
      setError(cloudError(e));
    }
  }
  async function share() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (selected) {
        const size =
          selected.size ??
          (Platform.OS === "web"
            ? selected.file?.size
            : new File(selected.uri).size) ??
          0;
        const mime = selected.mimeType || selected.file?.type || "";
        validateEvidenceFile(size, mime, label);
        const bytes =
          Platform.OS === "web"
            ? await selected.file!.arrayBuffer()
            : await new File(selected.uri).arrayBuffer();
        await uploadEvidence(
          supabase,
          requestId,
          label,
          mime,
          bytes,
          await digest(bytes),
        );
        if (picked.current?.exists) picked.current.delete();
        picked.current = null;
      } else await addEvidenceLink(supabase, requestId, label, link);
      setSelected(null);
      setLink("");
      setLabel("");
      await refresh();
    } catch (e) {
      setError(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  async function view(item: EvidenceItem) {
    close();
    const attempt = generation.current;
    setBusy(true);
    setError("");
    try {
      const result = await supabase.rpc("vv_open_evidence", {
        p_evidence_id: item.id,
      });
      if (result.error) throw result.error;
      if (attempt !== generation.current) return;
      const opened = result.data;
      if (opened.kind === "link") {
        setPreview({ item, link: publicEvidenceLink(opened.url) });
        return;
      }
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const response = await expoFetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/case-evidence/${opened.storage_path}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          },
        },
      );
      if (!response.ok)
        throw new Error(
          "This evidence could not be opened. Your case access may have changed.",
        );
      const bytes = await response.arrayBuffer();
      if (attempt !== generation.current) return;
      if ((await digest(bytes)) !== opened.sha256)
        throw new Error(
          "The file fingerprint does not match. Do not use this copy as evidence.",
        );
      if (attempt !== generation.current) return;
      let uri: string;
      if (Platform.OS === "web") {
        uri = URL.createObjectURL(
          new Blob([bytes], { type: opened.mime_type }),
        );
        objectUrl.current = uri;
      } else {
        const ext = opened.mime_type.split("/")[1].replace("mpeg", "mp3");
        const f = new File(
          Paths.cache,
          `vv-evidence-${Crypto.randomUUID()}.${ext}`,
        );
        f.create();
        f.write(new Uint8Array(bytes));
        local.current = f;
        uri = f.uri;
      }
      setPreview({ item, uri });
    } catch (e) {
      if (attempt === generation.current) setError(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!preview) return;
    let active = true;
    const timer = setInterval(() => {
      void supabase
        .rpc("vv_open_evidence", { p_evidence_id: preview.item.id })
        .then(({ error }) => {
          if (active && error) {
            close();
            setError("Evidence access has changed.");
          }
        });
    }, 20_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [preview, close]);
  return (
    <View style={{ gap: 16 }}>
      <View style={s.between}>
        <T kind="heading">Shared evidence</T>
        <Button title="Refresh" tone="outline" onPress={refresh} />
      </View>
      <T kind="caption">
        Only share material you choose. Images, audio or video up to 10 MiB, or
        a public HTTPS link. Your assigned support team can view submitted
        evidence. Access is recorded.
      </T>
      {items.map((item) => (
        <Row
          key={item.id}
          title={item.label}
          subtitle={`${item.kind === "link" ? "External link" : evidenceSize(item.byte_size)} · ${item.review_status.replaceAll("_", " ")}`}
          icon={item.kind === "link" ? "link" : "file"}
          onPress={() => {
            if (!busy) void view(item);
          }}
        />
      ))}
      {!items.length && <T>No evidence shared yet.</T>}
      {preview && (
        <View style={[s.panel, { backgroundColor: colors.peach }]}>
          <View style={s.between}>
            <T kind="label" style={{ flex: 1 }}>
              {preview.item.label}
            </T>
            <Button title="Close" tone="outline" onPress={close} />
          </View>
          <T kind="caption">
            Private evidence · Case #{requestId.slice(0, 8)} ·{" "}
            {new Date().toLocaleDateString()}
          </T>
          {preview.link ? (
            <>
              <Notice text="This opens an external website. Its owner may see your visit; app screenshot protection does not apply there." />
              <T selectable>{preview.link}</T>
              <Button
                title="Open external website"
                tone="outline"
                onPress={() => {
                  void Linking.openURL(preview.link!).catch(() =>
                    setError(
                      "Could not open this website. Please check your connection.",
                    ),
                  );
                }}
              />
            </>
          ) : (
            preview.uri && (
              <NativeMedia
                uri={preview.uri}
                mime={preview.item.mime_type || ""}
                label={preview.item.label}
              />
            )
          )}
        </View>
      )}
      <View style={[s.panel, { backgroundColor: colors.lilac }]}>
        <T kind="label">Share with this case</T>
        <Field
          label="Evidence label"
          value={label}
          onChangeText={setLabel}
          maxLength={160}
        />
        <Button
          title={selected ? `Selected: ${selected.name}` : "Choose media"}
          icon="paperclip"
          tone="outline"
          onPress={choose}
          disabled={busy}
        />
        {selected ? (
          <Button
            title="Remove selected file"
            tone="outline"
            disabled={busy}
            onPress={() => {
              if (picked.current?.exists) picked.current.delete();
              picked.current = null;
              setSelected(null);
            }}
          />
        ) : (
          <Field
            label="Or add a public HTTPS link"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            keyboardType="url"
            maxLength={2048}
          />
        )}
        <Notice text="Submitted originals cannot be edited in the support workspace. Confirm that you want to share this item before continuing." />
        <Button
          title="Share this evidence"
          disabled={!label.trim() || (!selected && !link)}
          busy={busy}
          onPress={share}
        />
      </View>
      {Boolean(error) && <Notice text={error} tone="error" />}
    </View>
  );
}
function NativeMedia({
  uri,
  mime,
  label,
}: {
  uri: string;
  mime: string;
  label: string;
}) {
  if (mime.startsWith("image/"))
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={label}
        style={{ width: "100%", height: 300, borderRadius: 10 }}
        resizeMode="contain"
      />
    );
  if (mime.startsWith("video/")) return <VideoEvidence uri={uri} />;
  return <AudioEvidence uri={uri} />;
}
function VideoEvidence({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 240 }}
      fullscreenOptions={{ enable: false }}
      allowsPictureInPicture={false}
    />
  );
}
function AudioEvidence({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  return (
    <Button
      title={status.playing ? "Pause audio" : "Play audio"}
      tone="outline"
      onPress={() => (status.playing ? player.pause() : player.play())}
    />
  );
}
