#!/usr/bin/env bash
# Formats C++ sources with a pinned clang-format. Pass --check to only verify (for CI).
set -euo pipefail

CLANG_FORMAT_VERSION="22.1.8"

cd "$(dirname "$0")/.."

mode=(-i)
if [[ "${1:-}" == "--check" ]]; then
  mode=(--dry-run --Werror)
fi

git ls-files -z --cached --others --exclude-standard -- '*.cpp' '*.h' '*.mm' |
  xargs -0 uvx --from "clang-format==${CLANG_FORMAT_VERSION}" clang-format "${mode[@]}"
