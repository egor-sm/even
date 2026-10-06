#!/usr/bin/env bash
# Validates the VST3 with a pinned pluginval (https://github.com/Tracktion/pluginval), as CI does: it
# loads the plug-in the way hosts do and checks it at the highest strictness level. macOS only for now.
# Usage: scripts/pluginval.sh [path to Even.vst3] [pluginval args, e.g. --skip-gui-tests]
#   default: the release build (cmake --preset release && cmake --build --preset release)
# pluginval is downloaded once into .cache/pluginval. A failure prints the random seed it ran with:
# --random-seed <seed> repeats the same run.
set -euo pipefail

PLUGINVAL_VERSION="v1.0.4"
PLUGINVAL_SHA256="3c4c533bda0c5059eea3ddaea752d757ee2025041f0f47e6bcb0e87f6082b29f" # pluginval_macOS.zip
STRICTNESS_LEVEL=10

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Only macOS is set up for now" >&2
  exit 1
fi

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"

plugin="${repo_dir}/build/release/source/app/even_artefacts/Release/VST3/Even.vst3"
if [[ $# -gt 0 && "$1" != -* ]]; then
  plugin="$1"
  shift
fi
if [[ ! -d "$plugin" ]]; then
  echo "No ${plugin}, run: cmake --preset release && cmake --build --preset release" >&2
  exit 1
fi

cache="${repo_dir}/.cache/pluginval/${PLUGINVAL_VERSION}"
pluginval="${cache}/pluginval.app/Contents/MacOS/pluginval"
if [[ ! -x "$pluginval" ]]; then
  mkdir -p "$cache"
  curl -fsSL -o "${cache}/pluginval.zip" \
    "https://github.com/Tracktion/pluginval/releases/download/${PLUGINVAL_VERSION}/pluginval_macOS.zip"
  if ! echo "${PLUGINVAL_SHA256}  ${cache}/pluginval.zip" | shasum -a 256 --check --status; then
    rm "${cache}/pluginval.zip"
    echo "The pluginval download does not match its checksum" >&2
    exit 1
  fi
  ditto -x -k "${cache}/pluginval.zip" "$cache"
  rm "${cache}/pluginval.zip"
fi

"$pluginval" --strictness-level "$STRICTNESS_LEVEL" "$@" --validate "$plugin"
