# Builds the web UI with Vite+ and embeds it into the app as a single zip archive.

find_program(PNPM_EXECUTABLE pnpm REQUIRED)

# pnpm does not always touch node_modules on a no-op install, so track it with our own stamp.
set(UI_INSTALL_STAMP "${CMAKE_CURRENT_BINARY_DIR}/pnpm-install.stamp")
set(UI_DIST_DIR "${CMAKE_CURRENT_BINARY_DIR}/dist")
set(UI_ARCHIVE "${CMAKE_CURRENT_BINARY_DIR}/ui.zip")

file(
  GLOB_RECURSE UI_SOURCES CONFIGURE_DEPENDS
  "${CMAKE_CURRENT_SOURCE_DIR}/src/*"
  "${CMAKE_CURRENT_SOURCE_DIR}/public/*")

add_custom_command(
  OUTPUT "${UI_INSTALL_STAMP}"
  COMMAND "${PNPM_EXECUTABLE}" install --frozen-lockfile
  COMMAND "${CMAKE_COMMAND}" -E touch "${UI_INSTALL_STAMP}"
  WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
  DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/package.json" "${CMAKE_CURRENT_SOURCE_DIR}/pnpm-lock.yaml"
          "${CMAKE_CURRENT_SOURCE_DIR}/pnpm-workspace.yaml"
  COMMENT "Installing web UI dependencies"
  VERBATIM)

add_custom_command(
  OUTPUT "${UI_ARCHIVE}"
  # Type check only; formatting and lint are enforced by `vp check` in CI and hooks, not by the build.
  COMMAND "${PNPM_EXECUTABLE}" exec vp check --no-fmt --no-lint
  COMMAND "${PNPM_EXECUTABLE}" exec vp build --outDir "${UI_DIST_DIR}" --emptyOutDir
  COMMAND "${CMAKE_COMMAND}" -E rm -f "${UI_ARCHIVE}"
  COMMAND "${CMAKE_COMMAND}" -E chdir "${UI_DIST_DIR}" "${CMAKE_COMMAND}" -E tar cf "${UI_ARCHIVE}"
          --format=zip .
  WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
  DEPENDS "${UI_INSTALL_STAMP}"
          ${UI_SOURCES}
          "${CMAKE_CURRENT_SOURCE_DIR}/index.html"
          "${CMAKE_CURRENT_SOURCE_DIR}/vite.config.ts"
          "${CMAKE_CURRENT_SOURCE_DIR}/tsconfig.json"
  COMMENT "Building web UI"
  VERBATIM)

juce_add_binary_data(even_ui_assets NAMESPACE UiAssets HEADER_NAME ui_assets.h SOURCES "${UI_ARCHIVE}")
