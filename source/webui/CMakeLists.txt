# Builds the web UI with Vite+ and embeds it into the app as a single zip archive.

find_program(PNPM_EXECUTABLE pnpm REQUIRED)

# pnpm does not always touch node_modules on a no-op install, so track it with our own stamp.
set(WEBUI_INSTALL_STAMP "${CMAKE_CURRENT_BINARY_DIR}/pnpm-install.stamp")
set(WEBUI_DIST_DIR "${CMAKE_CURRENT_BINARY_DIR}/dist")
set(WEBUI_ARCHIVE "${CMAKE_CURRENT_BINARY_DIR}/webui.zip")

file(
  GLOB_RECURSE WEBUI_SOURCES CONFIGURE_DEPENDS
  "${CMAKE_CURRENT_SOURCE_DIR}/src/*"
  "${CMAKE_CURRENT_SOURCE_DIR}/public/*")

add_custom_command(
  OUTPUT "${WEBUI_INSTALL_STAMP}"
  COMMAND "${PNPM_EXECUTABLE}" install --frozen-lockfile
  COMMAND "${CMAKE_COMMAND}" -E touch "${WEBUI_INSTALL_STAMP}"
  WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
  DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/package.json" "${CMAKE_CURRENT_SOURCE_DIR}/pnpm-lock.yaml"
          "${CMAKE_CURRENT_SOURCE_DIR}/pnpm-workspace.yaml"
  COMMENT "Installing web UI dependencies"
  VERBATIM)

add_custom_command(
  OUTPUT "${WEBUI_ARCHIVE}"
  # Type check only; formatting and lint are enforced by `vp check` in CI and hooks, not by the build.
  COMMAND "${PNPM_EXECUTABLE}" exec vp check --no-fmt --no-lint
  COMMAND "${PNPM_EXECUTABLE}" exec vp build --outDir "${WEBUI_DIST_DIR}" --emptyOutDir
  COMMAND "${CMAKE_COMMAND}" -E rm -f "${WEBUI_ARCHIVE}"
  COMMAND "${CMAKE_COMMAND}" -E chdir "${WEBUI_DIST_DIR}" "${CMAKE_COMMAND}" -E tar cf "${WEBUI_ARCHIVE}"
          --format=zip .
  WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
  DEPENDS "${WEBUI_INSTALL_STAMP}"
          ${WEBUI_SOURCES}
          "${CMAKE_CURRENT_SOURCE_DIR}/index.html"
          "${CMAKE_CURRENT_SOURCE_DIR}/vite.config.ts"
          "${CMAKE_CURRENT_SOURCE_DIR}/tsconfig.json"
  COMMENT "Building web UI"
  VERBATIM)

juce_add_binary_data(eqit_webui_assets NAMESPACE WebUiAssets HEADER_NAME webui_assets.h SOURCES "${WEBUI_ARCHIVE}")
