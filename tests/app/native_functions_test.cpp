#include "app/plugin/plugin_processor.h"
#include "app/web/native_functions.h"

#include <catch2/catch_test_macros.hpp>

#include <utility>

using even::PluginProcessor;
using even::dsp::FilterShape;

namespace {

// The native functions as the page sees them, called without a web view.
class Page {
public:
  Page() {
    options = even::web::withNativeFunctions(juce::WebBrowserComponent::Options{}, pluginProcessor, *settings,
                                             {
                                                 .resendResponse = [this] { ++resendCount; },
                                                 .applyScale = [] {},
                                                 .setAnalyzerActive = [](bool) {},
                                             });
  }

  juce::var call(const char *name, const juce::Array<juce::var> &args = {}) {
    const auto &functions = options.getNativeFunctions();
    const auto function = functions.find(juce::Identifier{name});
    REQUIRE(function != functions.end());

    juce::var result{"not completed"};
    function->second(args, [&result](juce::var value) { result = std::move(value); });
    return result;
  }

  [[nodiscard]] PluginProcessor &processor() { return pluginProcessor; }
  [[nodiscard]] int resendRequests() const { return resendCount; }

private:
  PluginProcessor pluginProcessor;
  int resendCount = 0;
  juce::SharedResourcePointer<even::UserSettings> settings;
  juce::WebBrowserComponent::Options options;
};

int shape(FilterShape value) {
  return static_cast<int>(value);
}

} // namespace

TEST_CASE("native functions: create, change and delete a band", "[app][web]") {
  Page page;

  CHECK(page.call("createBand", {shape(FilterShape::bell), 1000.0, 3.0}) == juce::var{1});
  CHECK(page.processor().getBandSlots().read(0).used);

  CHECK(page.call("setBandShape", {1, shape(FilterShape::lowShelf)}).isVoid());
  CHECK(page.processor().getBandSlots().read(0).shape == FilterShape::lowShelf);

  CHECK(page.call("deleteBand", {1}).isVoid());
  CHECK_FALSE(page.processor().getBandSlots().read(0).used);
}

TEST_CASE("native functions: bad arguments change nothing", "[app][web]") {
  Page page;

  CHECK(page.call("createBand", {99, 1000.0, 0.0}).isVoid());
  CHECK(page.call("createBand", {shape(FilterShape::bell)}).isVoid());
  CHECK(page.call("deleteBand", {0}).isVoid());
  CHECK(page.call("setBandShape", {13, shape(FilterShape::bell)}).isVoid());

  for (const auto &band : page.processor().getBandSlots().readAll())
    CHECK_FALSE(band.used);
}

TEST_CASE("native functions: previewBand designs the band with another shape", "[app][web]") {
  Page page;
  REQUIRE(page.call("createBand", {shape(FilterShape::bell), 1000.0, 3.0}) == juce::var{1});

  // 12 dB/oct, the default slope: one second-order section.
  const auto sections = page.call("previewBand", {1, shape(FilterShape::lowCut)});
  REQUIRE(sections.isArray());
  CHECK(sections.size() == 1);
  CHECK(static_cast<int>(sections[0]["order"]) == 2);

  // The band itself is not changed.
  CHECK(page.processor().getBandSlots().read(0).shape == FilterShape::bell);
  CHECK(page.call("previewBand", {1}).isVoid());
}

TEST_CASE("native functions: undo and redo return the history state", "[app][web]") {
  Page page;
  REQUIRE(page.call("createBand", {shape(FilterShape::bell), 1000.0, 3.0}) == juce::var{1});

  const auto afterUndo = page.call("undo");
  CHECK_FALSE(static_cast<bool>(afterUndo["canUndo"]));
  CHECK(static_cast<bool>(afterUndo["canRedo"]));
  CHECK_FALSE(page.processor().getBandSlots().read(0).used);

  const auto afterRedo = page.call("redo");
  CHECK(static_cast<bool>(afterRedo["canUndo"]));
  CHECK(page.processor().getBandSlots().read(0).used);
}

TEST_CASE("native functions: requestResponse asks the editor to resend", "[app][web]") {
  Page page;
  CHECK(page.call("requestResponse").isVoid());
  CHECK(page.resendRequests() == 1);
}
