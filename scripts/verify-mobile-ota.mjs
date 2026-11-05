// Read-only Expo protocol check for the actual, locally built pilot APK runtime.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const metadata = process.argv[2] ? resolve(process.argv[2]) : new URL('../mobile/artifacts/ota-bootstrap.json', import.meta.url);
const report = process.argv[3] ? resolve(process.argv[3]) : new URL('../mobile/artifacts/ota-verified.json', import.meta.url);
const boot = JSON.parse(await fs.readFile(metadata, 'utf8'));
assert.match(boot.projectId, /^[0-9a-f-]{36}$/);
const headers = {
 accept: 'multipart/mixed,application/expo+json,application/json',
 'expo-protocol-version': '1',
 'expo-platform': 'android',
 'expo-runtime-version': boot.runtimeVersion,
 'expo-channel-name': boot.channel,
 'expo-current-update-id': boot.embeddedUpdateId,
 'expo-embedded-update-id': boot.embeddedUpdateId,
};
const endpoint = `https://u.expo.dev/${boot.projectId}`;
const response = await fetch(endpoint, {headers, signal: AbortSignal.timeout(30_000)});
assert.equal(response.status, 200, 'No update served to the bootstrap runtime');
async function protocolParts(result) {
 const contentType = result.headers.get('content-type') || '';
 if (contentType.startsWith('multipart/mixed')) {
  const form = await new Response(await result.text(), {headers: {'content-type': contentType.replace('multipart/mixed','multipart/form-data')}}).formData();
  const read = async key => {const value=form.get(key);return value ? JSON.parse(typeof value==='string'?value:await value.text()) : null;};
  return {manifest:await read('manifest'),directive:await read('directive'),extensions:await read('extensions')};
 }
 const value=await result.json();
 return value.id ? {manifest:value} : {directive:value};
}
const {manifest,extensions} = await protocolParts(response);
assert.ok(manifest, 'No manifest returned');
assert.equal(manifest.runtimeVersion, boot.runtimeVersion, 'Runtime mismatch');
assert.match(manifest.id, /^[0-9a-f-]{36}$/);
assert.ok(manifest.launchAsset?.url?.startsWith('https://'), 'Missing HTTPS launch bundle');
const assetHeaders=extensions?.assetRequestHeaders?.[manifest.launchAsset.key] || {};
const asset = await fetch(manifest.launchAsset.url, {headers:assetHeaders,signal: AbortSignal.timeout(30_000)});
assert.equal(asset.status, 200, 'Launch bundle unavailable');
const bytes = Buffer.from(await asset.arrayBuffer());
assert.equal(createHash('sha256').update(bytes).digest('base64url'), manifest.launchAsset.hash, 'Launch bundle integrity mismatch');
assert.ok(!bytes.includes(Buffer.from('fixture-public-not-a-key')), 'Fictional QA credentials found in published bundle');
assert.ok(!bytes.includes(Buffer.from('http://127.0.0.1:54324')), 'Fictional QA endpoint found in published bundle');
const incompatible = await fetch(endpoint, {headers: {...headers, 'expo-runtime-version': '0000000000000000000000000000000000000000'}, signal: AbortSignal.timeout(30_000)});
let rejectedIncompatible = [204,404].includes(incompatible.status);
if (incompatible.status===200) {const parts=await protocolParts(incompatible);rejectedIncompatible=!parts.manifest && parts.directive?.type==='noUpdateAvailable';}
assert.ok(rejectedIncompatible, 'An incompatible runtime was unexpectedly served an update');
const result = {channel:boot.channel,version:boot.version,runtimeVersion:boot.runtimeVersion,updateId:manifest.id,manifestStatus:response.status,runtimeMatches:true,launchAssetBytes:bytes.length,launchAssetHashVerified:true,incompatibleRuntimeStatus:incompatible.status,verifiedAt:new Date().toISOString()};
await fs.writeFile(report,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
