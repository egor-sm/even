#!/usr/bin/env bash
# Runs a pinned clang-tidy over C++ sources using compile_commands.json of a configured preset.
# Usage: scripts/tidy.sh [preset] [--since <git ref>] [-j <jobs>] [clang-tidy args, e.g. --fix]
#   preset         default: debug
#   --since <ref>  only .cpp files changed since the merge base with <ref>, plus .cpp files that
#                  include a changed header directly (without it: every .cpp file)
#   -j <jobs>      clang-tidy processes in parallel (default: 1)
# Needs a configured preset with generated headers; building the even_ui_assets target is enough.
set -euo pipefail

CLANG_TIDY_VERSION="22.1.8"

cd "$(dirname "$0")/.."

preset="debug"
if [[ $# -gt 0 && "$1" != -* ]]; then
  preset="$1"
  shift
fi

since=""
jobs=1
tidy_args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
  --since)
    since="$2"
    shift 2
    ;;
  -j)
    jobs="$2"
    shift 2
    ;;
  *)
    tidy_args+=("$1")
    shift
    ;;
  esac
done

build_dir="build/${preset}"
if [[ ! -f "${build_dir}/compile_commands.json" ]]; then
  echo "No ${build_dir}/compile_commands.json, run: cmake --preset ${preset} && cmake --build --preset ${preset}" >&2
  exit 1
fi

if [[ "$(uname)" == "Darwin" ]]; then
  # clang-tidy from PyPI does not know where Xcode keeps the SDK.
  tidy_args+=(--extra-arg="-isysroot$(xcrun --show-sdk-path)")
fi

files=()
if [[ -z "$since" ]]; then
  while IFS= read -r -d '' file; do files+=("$file"); done < <(git ls-files -z --cached --others --exclude-standard -- '*.cpp')
else
  base="$(git merge-base "$since" HEAD)"
  changed=()
  while IFS= read -r file; do changed+=("$file"); done < <(git diff --name-only --diff-filter=d "$base" -- '*.cpp' '*.h')

  for file in ${changed[@]+"${changed[@]}"}; do
    case "$file" in
    *.cpp) files+=("$file") ;;
    # Headers are included by their path from source/ (e.g. "app/state/band_slots.h").
    *.h)
      while IFS= read -r includer; do files+=("$includer"); done < <(
        git grep -l --fixed-strings "#include \"${file#source/}\"" -- '*.cpp' || true
      )
      ;;
    esac
  done

  unique=()
  while IFS= read -r file; do unique+=("$file"); done < <(printf '%s\n' ${files[@]+"${files[@]}"} | sed '/^$/d' | sort -u)
  files=(${unique[@]+"${unique[@]}"})

  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No C++ files changed since ${since}."
    exit 0
  fi
  echo "Checking ${#files[@]} file(s) changed since ${since}."
fi

printf '%s\0' "${files[@]}" |
  xargs -0 -n 1 -P "$jobs" uvx --from "clang-tidy==${CLANG_TIDY_VERSION}" clang-tidy -p "${build_dir}" --quiet \
    "${tidy_args[@]}"
