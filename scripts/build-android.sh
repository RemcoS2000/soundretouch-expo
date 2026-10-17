#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -z "${JAVA_HOME:-}" || ! -x "$JAVA_HOME/bin/java" ]]; then
	echo 'Set JAVA_HOME to your JDK 17 installation.' >&2
	exit 1
fi
if [[ -z "${ANDROID_HOME:-}" || ! -d "$ANDROID_HOME/platforms/android-37.0" ]]; then
	echo 'Set ANDROID_HOME to your Android SDK with API 37 installed.' >&2
	exit 1
fi
if ! command -v node >/dev/null 2>&1; then
	echo 'Node.js is required. Run nvm use before building.' >&2
	exit 1
fi

if [[ ! -f android/gradlew ]]; then
	npx --no-install expo prebuild --platform android --no-install
fi

cd android
exec ./gradlew :app:assembleDebug --no-daemon --max-workers=2 --console=plain "$@"
