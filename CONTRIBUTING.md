# Contributing to Even

Even is a JUCE 9 / C++23 plug-in whose interface is a web UI (React and TypeScript, built with Vite+) rendered by
`juce::WebBrowserComponent`.

## Built with

- [JUCE](https://github.com/juce-framework/JUCE)
- [CMake](https://cmake.org/) and [CPM.cmake](https://github.com/cpm-cmake/CPM.cmake)
- [Vite+](https://viteplus.dev/) (Vite, Oxlint, Oxfmt, Vitest) and [TypeScript](https://www.typescriptlang.org/)

## Building

### Prerequisites

- [CMake](https://cmake.org/download/) 3.25 or higher
- [Ninja](https://github.com/ninja-build/ninja/wiki/Pre-built-Ninja-packages)
- A C++23 compiler (Xcode 16+, Visual Studio 2022, Clang 17+ or GCC 13+)
- [Node.js](https://nodejs.org/) 24+ and [pnpm](https://pnpm.io/installation)
- (Optional) [Vite+](https://viteplus.dev/guide/) global CLI (`vp`); without it use `pnpm exec vp ...` in `source/ui`
- Windows only: the `Microsoft.Web.WebView2` NuGet package (see the
  [JUCE docs](https://github.com/juce-framework/JUCE/blob/master/docs/CMake%20API.md))
- Linux only: `libwebkit2gtk-4.1-dev` and the usual [JUCE dependencies](https://github.com/juce-framework/JUCE/blob/master/docs/Linux%20Dependencies.md)

Dependencies (JUCE) are downloaded by [CPM.cmake](https://github.com/cpm-cmake/CPM.cmake)
during configuration and cached in `.cache/CPM`.

### Build

```sh
cmake --preset release
cmake --build --preset release
```

The web UI is built and embedded into the plugin automatically.
Artefacts end up in `build/release/source/app/even_artefacts/Release`.

### macOS installer

The `dist` preset builds a universal (arm64 + x86_64) release for macOS 12+ without tests; the script packs it into
an installer with the VST3 plug-in and the Standalone app as optional components:

```sh
cmake --preset dist
cmake --build --preset dist
scripts/macos/build-pkg.sh build/dist/source/app/even_artefacts/Release dist
```

### CI and releases

GitHub Actions (`.github/workflows`):

- **Verify**, on every push to any branch, five jobs in parallel: UI lint (`vp check`, Steiger), UI tests, C++
  formatting, clang-tidy (on branches only the files changed since `main`, on `main` everything) and the macOS
  release build with the C++ tests and pluginval. The build (VST3, Standalone and an installer) is attached to the
  run as an artifact for 14 days.
- **Release**, on pushes to `main`: [release-please](https://github.com/googleapis/release-please) keeps a release
  PR with the next version and the changelog from Conventional Commits. Merging it tags `v<version>`, creates the
  GitHub release and attaches the universal macOS installer to it.

### Tests

C++ code is covered by [Catch2](https://github.com/catchorg/Catch2) tests kept next to the code, in each module's
`tests/`: `even_dsp_tests` and `even_model_tests` for the JUCE-free `source/dsp` and `source/model`, `even_app_tests`
for `source/app` (band slots, undo history, the response packet and the page's native functions on a real
`PluginProcessor`, without a host or a web view). Helpers shared by several modules live in `source/testing`.

```sh
cmake --build --preset debug --target even_dsp_tests even_model_tests even_app_tests
ctest --preset debug          # all tests
ctest --preset debug -L dsp   # one module: dsp, model or app
```

### Plug-in validation

[pluginval](https://github.com/Tracktion/pluginval) loads the VST3 the way hosts do and checks it at strictness
level 10, the highest: audio processing at several sample rates and block sizes, state save and restore,
parameters and automation, calls from several threads, the editor. CI runs it on the release build. Locally (macOS),
the script downloads the same pinned pluginval into `.cache/pluginval`:

```sh
cmake --build --preset release
scripts/pluginval.sh                                      # the release build
scripts/pluginval.sh path/to/Even.vst3 --skip-gui-tests   # another build, without opening the editor
```

A failure prints the random seed of the run; `--random-seed <seed>` repeats it.

### UI development with hot reload

```sh
cd source/ui
vp install
vp dev                           # terminal 1: Vite dev server on http://localhost:5173
cmake --preset dev               # terminal 2: Debug build that loads the UI from the dev server
cmake --build --preset dev
```

Then launch the Standalone app; changes in `source/ui/src` are applied without rebuilding the plugin.

Opened in a plain browser (`vp dev` only), the UI talks to a development mock backend that sends EQ responses and analyzer frames in the plugin's formats, so the UI can be worked on without the app. Development builds show a panel with a test signal, mute, UI scale and analyzer stats; in any build Ctrl+Shift+D toggles it.

### Project layout

```
source/
  app/      JUCE app built as VST3 / Standalone
    plugin/     processor, editor hosting the web view, parameters
    state/      band slots and undo history on top of the parameters, response state, user settings
    web/        bridge to the page: native functions, parameter relays, response packet, bundled resources
    analyzer/   spectrum analyzer
    debug/      test signal
  dsp/      Plain C++ DSP building blocks (no JUCE), unit-tested
  model/    Plain C++ editing model: band slots, edit rules, undo history (no JUCE), unit-tested
  testing/  Helpers shared by the module tests (each module keeps its tests in tests/)
  ui/       Web UI (Vite+ and TypeScript), talks to C++ via @juce-framework/webview
cmake/      CMake helpers (CPM.cmake, compiler warnings)
scripts/    Formatting and linting helpers
```

## Code style

C++ code is formatted with [clang-format](https://clang.llvm.org/docs/ClangFormat.html) and checked with
[clang-tidy](https://clang.llvm.org/extra/clang-tidy/) (see `.clang-format` and `.clang-tidy`).
The scripts run pinned tool versions through [uv](https://docs.astral.sh/uv/), so nothing has to be installed globally.

```sh
scripts/format.sh            # format in place
scripts/format.sh --check    # verify only
scripts/tidy.sh [preset]     # lint using build/<preset>/compile_commands.json (default: debug)
scripts/tidy.sh debug --since main -j 4   # only files changed since main, 4 processes
```

Web UI code (`source/ui`) is formatted, linted and type checked by [Vite+](https://viteplus.dev/guide/check)
(Oxfmt, Oxlint with type-aware rules); configuration lives in `source/ui/vite.config.ts`.

```sh
cd source/ui
vp check                   # format check + lint + type check
vp check --fix             # apply formatting and autofixes
vp test                    # unit and component tests
pnpm exec steiger src      # Feature-Sliced Design boundaries (steiger.config.ts)
```

`source/ui/src` follows [Feature-Sliced Design](https://feature-sliced.design) without pages and processes:
`app` (entry, wiring to C++) → `widgets` (top bar, graph, band dock, bottom bar) → `features` (one user action
each: edit a node, change the type, solo, …) → `entities` (bands, viewport, analyzer) → `shared` (JUCE bridge,
helpers, design system). Layers import only downwards, slices only through their `index.ts` and not from
each other; imports across layers use the `~/` alias. `shared/ui` is a small UI kit (buttons, select menu, segmented control, toggle group, checkbox) on [Ark UI](https://ark-ui.com); Ark is not imported anywhere else (enforced by Oxlint). `shared/mock` is the development stand-in for C++ (loaded only by development builds in a plain browser), `shared/testing` the recording backend of component tests.
