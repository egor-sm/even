#!/usr/bin/env bash
# Builds the macOS installer (Even-<version>.pkg) from built artefacts: VST3 into
# /Library/Audio/Plug-Ins/VST3 and the Standalone app into /Applications, each optional.
# The version, architectures and minimum macOS are read from the built plug-in.
# Usage: scripts/macos/build-pkg.sh <artefacts dir, e.g. build/release/source/app/even_artefacts/Release> <output dir>
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <artefacts dir> <output dir>" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "${script_dir}/../.." && pwd)"
artefacts="$(cd "$1" && pwd)"
mkdir -p "$2"
output="$(cd "$2" && pwd)"

vst3="${artefacts}/VST3/Even.vst3"
app="${artefacts}/Standalone/Even.app"
for bundle in "$vst3" "$app"; do
  [[ -d "$bundle" ]] || { echo "Missing ${bundle}" >&2; exit 1; }
  # macOS on Apple Silicon does not load a bundle whose signature is broken.
  codesign --verify --strict "$bundle" || { echo "Invalid signature: ${bundle}" >&2; exit 1; }
done

binary="${vst3}/Contents/MacOS/Even"
version="$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "${vst3}/Contents/Info.plist")"
minimum_system="$(vtool -show-build "$binary" | awk '/minos/ { print $2; exit }')"
architectures="$(lipo -archs "$binary" | tr ' ' ',')"

# No AppleDouble (._*) files for extended attributes in the payload.
export COPYFILE_DISABLE=1

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# One component package per bundle. Bundles are not relocatable: otherwise the installer would
# update a copy the user moved elsewhere instead of installing into the standard folder.
component() {
  local id="$1" bundle="$2" destination="$3" name="$4"
  local root="${work}/${name}-root"
  mkdir -p "${root}${destination}"
  ditto --norsrc --noextattr --noqtn "$bundle" "${root}${destination}/$(basename "$bundle")"

  local components="${work}/${name}-components.plist"
  pkgbuild --analyze --root "$root" "$components" >/dev/null
  local index=0
  while plutil -extract "${index}" xml1 -o /dev/null "$components" 2>/dev/null; do
    plutil -replace "${index}.BundleIsRelocatable" -bool NO "$components"
    index=$((index + 1))
  done

  pkgbuild --quiet --root "$root" --component-plist "$components" --identifier "$id" --version "$version" \
    --install-location / "${work}/packages/${name}.pkg"
}

mkdir -p "${work}/packages" "${work}/resources"
component com.eveneq.pkg.vst3 "$vst3" /Library/Audio/Plug-Ins/VST3 even-vst3
component com.eveneq.pkg.standalone "$app" /Applications even-standalone

cp "${repo_dir}/LICENSE" "${work}/resources/LICENSE.txt"
sed -e "s/@VERSION@/${version}/g" -e "s/@HOST_ARCHITECTURES@/${architectures}/g" \
  -e "s/@MINIMUM_SYSTEM_VERSION@/${minimum_system}/g" "${script_dir}/distribution.xml" >"${work}/distribution.xml"

installer="${output}/Even-${version}.pkg"
productbuild --quiet --distribution "${work}/distribution.xml" --package-path "${work}/packages" \
  --resources "${work}/resources" "$installer"

echo "$installer"
