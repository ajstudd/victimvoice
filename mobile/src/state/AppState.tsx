import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Platform, AppState as Lifecycle } from "react-native";
import * as Crypto from "expo-crypto";
import { Session } from "@supabase/supabase-js";
import { privateStorage } from "../lib/storage";
import { supabase, cloudError, accountClient } from "../lib/supabase";
import { mergeContacts } from "../lib/contacts";
import { insertCircleContact } from "../lib/cloud-writes";
import { createVaultWriter } from "../lib/vault-writer";

export type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  primary: boolean;
};
export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};
export type Plan = { safePlace: string; steps: string };
export type Vault = {
  motionAlertsEnabled?: boolean;
  motionPermissionCheckedAt?: number;
  liveJourney?: { id: string; token: string; expiresAt: number; stopping?: boolean; lastPublishedAt?: number; error?: string };
  pushToken?: string;
  sosPreferences?: import("../lib/sos-client").SosPreferences;
  sos?: import("../lib/sos-client").LocalSos;
  removedContactIds?: string[];
  supportDraft?: {
    body: string;
    category: string;
    priority: string;
    volunteers: boolean;
  };
  journey?: { deadline: number; destination: string };
  contacts: Contact[];
  notes: Note[];
  plan: Plan;
  locked: boolean;
  savedGuides: string[];
};
const blank = (): Vault => ({
  contacts: [],
  notes: [],
  plan: { safePlace: "", steps: "" },
  locked: false,
  savedGuides: [],
});
type Context = {
  vault: Vault;
  ready: boolean;
  session: Session | null;
  notice: string;
  setNotice: (s: string) => void;
  save: (edit: (v: Vault) => Vault) => Promise<void>;
  syncContacts: () => Promise<void>;
  restoreContacts: () => Promise<void>;
  signOut: () => Promise<void>;
};
const C = createContext<Context | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [vault, setVault] = useState<Vault>(blank);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState("");
  const [loadedScope, setLoadedScope] = useState("");
  const currentVault = useRef<Vault>(blank());
  const [writer, setWriter] = useState<{
    scope: string;
    edit: ReturnType<typeof createVaultWriter<Vault>>;
  } | null>(null);
  const generation = useRef(0);
  const storageFailed = useRef(false);
  const scope = "vault." + (session?.user.id || "guest");
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active && !error) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    const sub = Lifecycle.addEventListener("change", (state) => {
      if (Platform.OS !== "web") {
        if (state === "active") supabase.auth.startAutoRefresh();
        else supabase.auth.stopAutoRefresh();
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
      sub.remove();
    };
  }, []);
  useEffect(() => {
    const current = ++generation.current;
    storageFailed.current = false;
    // Clear private data synchronously when account scope changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
    setVault(blank());
    setLoadedScope("");
    setNotice("");
    privateStorage
      .getItem(scope)
      .then((raw) => {
        if (current === generation.current) {
          const value = raw ? { ...blank(), ...JSON.parse(raw) } : blank();
          currentVault.current = value;
          setVault(value);
          setLoadedScope(scope);
          const edit = createVaultWriter<Vault>({
            read: () => currentVault.current,
            write: (v) => privateStorage.setItem(scope, JSON.stringify(v)),
            commit: (v) => {
              currentVault.current = v;
              setVault(v);
            },
            isCurrent: () =>
              current === generation.current && !storageFailed.current,
          });
          setWriter({ scope, edit });
        }
      })
      .catch(() => {
        if (current !== generation.current) return;
        storageFailed.current = true;
        setNotice(
          "Your private storage could not be opened. Unlock your device, then restart the app to try again. Existing data has not been overwritten.",
        );
      })
      .finally(() => {
        if (current === generation.current) setReady(true);
      });
  }, [scope]);
  async function save(edit: (v: Vault) => Vault) {
    if (
      storageFailed.current ||
      !ready ||
      loadedScope !== scope ||
      !writer ||
      writer.scope !== scope
    )
      throw new Error(
        "Private storage is unavailable. Existing data has not been overwritten.",
      );
    await writer.edit(edit);
  }
  async function syncContacts() {
    if (!session)
      throw new Error(
        "Sign in to sync your circle. Guest contacts stay on this phone.",
      );
    const client = accountClient(session);
    const current = generation.current;
    function checkScope() {
      if (current !== generation.current)
        throw new Error("Your account changed. Reopen My Circle.");
    }
    const removed = vault.removedContactIds || [];
    if (removed.length) {
      const result = await client
        .from("vv_contacts")
        .delete()
        .eq("user_id", session.user.id)
        .in("id", removed);
      if (result.error) throw new Error(cloudError(result.error));
      checkScope();
      await save((v) => ({
        ...v,
        removedContactIds: (v.removedContactIds || []).filter(
          (id) => !removed.includes(id),
        ),
      }));
    }
    if (!vault.contacts.length) return;
    const { error: reset } = await client
      .from("vv_contacts")
      .update({ primary_contact: false })
      .eq("user_id", session.user.id);
    if (reset) throw new Error(cloudError(reset));
    // Update/insert only selected local rows. Never delete cloud records implicitly.
    for (const c of vault.contacts) {
      checkScope();
      const { data: byId, error: read } = await client
        .from("vv_contacts")
        .select("id")
        .eq("id", c.id)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (read) throw new Error(cloudError(read));
      checkScope();
      const byPhone = byId
        ? null
        : await client
            .from("vv_contacts")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("phone", c.phone)
            .maybeSingle();
      if (byPhone?.error) throw new Error(cloudError(byPhone.error));
      const existing = byId || byPhone?.data;
      checkScope();
      const values = {
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
        primary_contact: c.primary,
      };
      const result = existing
        ? await client
            .from("vv_contacts")
            .update(values)
            .eq("id", existing.id)
            .eq("user_id", session.user.id)
        : await insertCircleContact(client, c.id, values);
      if (result.error) throw new Error(cloudError(result.error));
      checkScope();
      if (existing && existing.id !== c.id)
        await save((v) => ({
          ...v,
          contacts: v.contacts.map((saved) =>
            saved.id === c.id && saved.phone === c.phone
              ? { ...saved, id: existing.id }
              : saved,
          ),
        }));
    }
  }
  async function restoreContacts() {
    if (!session) throw new Error("Sign in to restore your circle.");
    const client = accountClient(session);
    const current = generation.current;
    const { data, error } = await client
      .from("vv_contacts")
      .select("id,name,phone,relationship,primary_contact")
      .eq("user_id", session.user.id)
      .order("created_at")
      .limit(50);
    if (error) throw new Error(cloudError(error));
    if (current !== generation.current)
      throw new Error("Your account changed. Reopen My Circle.");
    const cloud = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      relationship: row.relationship,
      primary: row.primary_contact,
    }));
    await save((v) => ({
      ...v,
      contacts: mergeContacts(v.contacts, cloud, v.removedContactIds),
    }));
  }
  async function signOut() {
    if (vault.liveJourney) {
      await save(v => ({...v, liveJourney: v.liveJourney ? {...v.liveJourney, stopping: true} : undefined}));
    }
    if (session && vault.pushToken) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        await accountClient(session)
          .rpc("vv_sos_unregister_push", { p_token: vault.pushToken })
          .abortSignal(controller.signal);
      } catch {
        // Offline device cleanup must not prevent account sign-out.
      } finally {
        clearTimeout(timer);
      }
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  return (
    <C.Provider
      value={{
        vault: loadedScope === scope ? vault : blank(),
        ready: ready && loadedScope === scope,
        session,
        notice,
        setNotice,
        save,
        syncContacts,
        restoreContacts,
        signOut,
      }}
    >
      <React.Fragment key={scope}>{children}</React.Fragment>
    </C.Provider>
  );
}
export function useApp() {
  const c = useContext(C);
  if (!c) throw new Error("Missing AppProvider");
  return c;
}
export const uuid = () => Crypto.randomUUID();
