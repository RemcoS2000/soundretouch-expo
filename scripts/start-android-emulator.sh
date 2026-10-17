#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ANDROID_HOME:-}" || ! -x "$ANDROID_HOME/emulator/emulator" ]]; then
	echo 'Set ANDROID_HOME to your Android SDK with the emulator installed.' >&2
	exit 1
fi

exec "$ANDROID_HOME/emulator/emulator" \
	-avd "${ANDROID_AVD_NAME:-SoundRetouched_API_36}" \
	-gpu software -memory 2048 -cores 2 -no-snapshot -no-audio "$@"
