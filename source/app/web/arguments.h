#pragma once

#include "dsp/filter_shape.h"

#include <juce_core/juce_core.h>

#include <cstddef>
#include <optional>

namespace even::web {

// Arguments of native functions as the page passes them; nullopt when missing or out of range.

// A 1-based band number as a slot index.
[[nodiscard]] std::optional<std::size_t> slotArgument(const juce::Array<juce::var> &args, int index);
// A dsp::FilterShape value.
[[nodiscard]] std::optional<dsp::FilterShape> shapeArgument(const juce::Array<juce::var> &args, int index);
// Missing reads as false.
[[nodiscard]] bool boolArgument(const juce::Array<juce::var> &args, int index);

} // namespace even::web
