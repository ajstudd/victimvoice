import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import {seal,unseal} from "./cipher";
import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";

const preview = new Map<string, string>();
let keyPromise: Promise<Uint8Array> | undefined;
function encryptionKey() {
  if (!keyPromise)
    keyPromise = (async () => {
      const existing = await SecureStore.getItemAsync("vv.device.key");
      if (existing) return hexToBytes(existing);
      const bytes = Crypto.getRandomBytes(32);
      await SecureStore.setItemAsync("vv.device.key", bytesToHex(bytes), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return bytes;
    })().catch((e) => {
      keyPromise = undefined;
      throw e;
    });
  return keyPromise;
}
export const privateStorage = {
  async getItem(name: string): Promise<string | null> {
    if (Platform.OS === "web") return preview.get(name) ?? null;
    const raw = await AsyncStorage.getItem("vv.encrypted." + name);
    if (!raw) return null;
    return unseal(await encryptionKey(),name,raw);
  },
  async setItem(name: string, value: string) {
    if (Platform.OS === "web") {
      preview.set(name, value);
      return;
    }
    const nonce = Crypto.getRandomBytes(12);
    await AsyncStorage.setItem("vv.encrypted."+name,seal(await encryptionKey(),nonce,name,value));
  },
  async removeItem(name: string) {
    if (Platform.OS === "web") {
      preview.delete(name);
      return;
    }
    await AsyncStorage.removeItem("vv.encrypted." + name);
  },
};
