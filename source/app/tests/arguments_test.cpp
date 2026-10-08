#include "app/web/arguments.h"

#include <catch2/catch_test_macros.hpp>

using even::AnalyzerWindow;
using even::web::analyzerOptionsArgument;
namespace dsp = even::dsp;

namespace {

juce::var object(std::initializer_list<std::pair<const char *, juce::var>> properties) {
  auto *result = new juce::DynamicObject;
  for (const auto &[name, value] : properties)
    result->setProperty(name, value);
  return juce::var{result};
}

} // namespace

TEST_CASE("analyzer options: every field by name", "[app][web]") {
  const auto options = analyzerOptionsArgument({object({{"window", "blackmanHarris"},
                                                        {"windowLength", 2048},
                                                        {"zeroPadding", 4},
                                                        {"kernel", "gaussian"},
                                                        {"width", "erb"},
                                                        {"octaves", 0.125},
                                                        {"lowEnd", "minimumWidth"},
                                                        {"minimumBins", 3},
                                                        {"averagingMs", 150},
                                                        {"lowFft", true}})},
                                               0);

  CHECK(options.window == AnalyzerWindow::blackmanHarris);
  CHECK(options.windowLength == 2048);
  CHECK(options.zeroPadding == 4);
  CHECK(options.smoothing.kernel == dsp::SmoothingKernel::gaussian);
  CHECK(options.smoothing.width == dsp::SmoothingWidth::erb);
  CHECK(options.smoothing.octaves == 0.125);
  CHECK(options.smoothing.lowEnd == dsp::LowEnd::minimumWidth);
  CHECK(options.smoothing.minimumBins == 3.0);
  CHECK(options.averagingMs == 150.0);
  CHECK(options.lowFft);
}

TEST_CASE("analyzer options: missing or invalid fields keep the original analyzer", "[app][web]") {
  const auto options = analyzerOptionsArgument(
      {object({{"window", "kaiser"}, {"windowLength", 3000}, {"zeroPadding", 3}, {"octaves", "wide"}})}, 0);
  const even::AnalyzerOptions original;

  CHECK(options.window == original.window);
  CHECK(options.windowLength == 2048); // rounded down to a power of two
  CHECK(options.zeroPadding == 2);
  CHECK(options.smoothing.kernel == original.smoothing.kernel);
  CHECK(juce::exactlyEqual(options.smoothing.octaves, original.smoothing.octaves));
  CHECK(options.averagingMs == 0.0);
  CHECK_FALSE(options.lowFft);

  CHECK(analyzerOptionsArgument({}, 0).zeroPadding == original.zeroPadding);
}
