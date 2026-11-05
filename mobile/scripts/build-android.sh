#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -z "${JAVA_HOME:-}" && -d "$HOME/.local/share/victimvoice-android/jdk/Contents/Home" ]]; then
  export JAVA_HOME="$HOME/.local/share/victimvoice-android/jdk/Contents/Home"
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [[ ! -d "$ANDROID_HOME" || -z "${JAVA_HOME:-}" ]]; then
  echo 'Install Android SDK and JDK 21, then set ANDROID_HOME and JAVA_HOME.' >&2
  exit 1
fi
node -e 'if(Number(process.versions.node.split(".")[0])<22)throw Error("Use Node.js 22 or newer")'
node node_modules/expo/bin/cli prebuild --platform android --no-install --no-clean
# SDK 58's updates task does not declare app/config contents as Gradle inputs.
# Remove only its generated output so native changes cannot reuse an old runtime
# fingerprint or embedded asset manifest on an incremental local build.
node -e 'require("fs").rmSync("android/app/build/generated/assets/createReleaseUpdatesResources", {recursive:true,force:true})'
(cd android && ./gradlew :app:assembleRelease --console plain -PreactNativeArchitectures=arm64-v8a -Pandroid.enableMinifyInReleaseBuilds=false -Pandroid.enableShrinkResourcesInReleaseBuilds=false --max-workers=2 -Dorg.gradle.jvmargs="-Xmx3072m -XX:MaxMetaspaceSize=1024m" --no-daemon)
mkdir -p artifacts
cp android/app/build/outputs/apk/release/app-release.apk artifacts/VictimVoice-preview.apk
printf 'Android preview: %s/artifacts/VictimVoice-preview.apk\n' "$PWD"
