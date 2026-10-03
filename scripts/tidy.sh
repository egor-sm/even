#!/usr/bin/env bash
# Runs a pinned clang-tidy over C++ sources using compile_commands.json of a configured preset.
# Usage: scripts/tidy.sh [preset] [--fix]   (default preset: debug)
set -euo pipefail

CLANG_TIDY_VERSION="22.1.8"

cd "$(dirname "$0")/.."

preset="${1:-debug}"
shift || true
build_dir="build/${preset}"

if [[ ! -f "${build_dir}/compile_commands.json" ]]; then
  echo "No ${build_dir}/compile_commands.json, run: cmake --preset ${preset} && cmake --build --preset ${preset}" >&2
  exit 1
fi

extra_args=()
if [[ "$(uname)" == "Darwin" ]]; then
  # clang-tidy from PyPI does not know where Xcode keeps the SDK.
  extra_args+=(--extra-arg="-isysroot$(xcrun --show-sdk-path)")
fi

git ls-files -z --cached --others --exclude-standard -- '*.cpp' |
  xargs -0 uvx --from "clang-tidy==${CLANG_TIDY_VERSION}" clang-tidy -p "${build_dir}" --quiet "${extra_args[@]}" "$@"
