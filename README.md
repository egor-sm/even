<a name="readme-top"></a>

<br />
<div align="center">
  <img src="media/logo.svg" alt="Logo" width="80" height="80">

  <h3 align="center">Even</h3>

  <p align="center">
    12-band parametric EQ
  </p>
</div>

<h2>Table of Contents</h2>
<ol>
  <li>
    <a href="#about-the-project">About The Project</a>
    <ul>
      <li><a href="#built-with">Built With</a></li>
    </ul>
  </li>
  <li><a href="#how-to-build">How to build</a></li>
  <li><a href="#code-style">Code style</a></li>
  <li><a href="#license">License</a></li>
</ol>

## About The Project

<img src="media/plugin_screenshot.png" alt="Plugin Screenshot">

The project is VST-plugin for equalization. The user interface includes a spectrum analyzer, a filter control panel, frequency response curves, and level meters.

There are 3 types of IIR-filters available:

- low pass;
- high pass;
- peak.

The releases have an installer for Windows, but if you want to test the plugin for other operating systems, try building it.

### Built With

- [JUCE](https://github.com/juce-framework/JUCE)
- [CMake](https://cmake.org/) and [CPM.cmake](https://github.com/cpm-cmake/CPM.cmake)
- [Vite+](https://viteplus.dev/) (Vite, Oxlint, Oxfmt, Vitest) and [TypeScript](https://www.typescriptlang.org/)

## How to build

> The `next` branch is a prototype of the new architecture: JUCE 9, C++23 and a web UI
> (Vite + TypeScript) rendered by `juce::WebBrowserComponent`. Features of the original
> plugin (see `main`) are being ported step by step.

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

### Tests

DSP and editing model code (`source/dsp`, `source/model`) is covered by [Catch2](https://github.com/catchorg/Catch2) tests in `tests/`:

```sh
cmake --build --preset debug --target even_tests
ctest --preset debug
```

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
  app/      JUCE app built as VST3 / Standalone (processor, editor hosting the web view, web UI resources)
  dsp/      Plain C++ DSP building blocks (no JUCE), unit-tested
  model/    Plain C++ editing model: band slots, edit rules, undo history (no JUCE), unit-tested
  ui/       Web UI (Vite+ and TypeScript), talks to C++ via @juce-framework/webview
tests/      Catch2 unit tests
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

## License

Distributed under the GPL-3.0 License. See `LICENSE` for more information.
