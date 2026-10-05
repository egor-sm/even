#pragma once

#include "app/band_history.h"
#include "app/user_settings.h"
#include "dsp/band_design.h"

#include <juce_audio_processors/juce_audio_processors.h>

namespace even::web {

// Results of native functions as plain objects for the page.

// {name, version, juceVersion, wrapper}
[[nodiscard]] juce::var pluginInfo(const juce::AudioProcessor &processor);
// [{order, g, q, lowpassMix, bandpassMix, highpassMix}] (see dsp::Section)
[[nodiscard]] juce::var sections(const dsp::BandDesign &design);
// {theme, scale}
[[nodiscard]] juce::var settings(const UserSettings &settings);
// {canUndo, canRedo}
[[nodiscard]] juce::var historyState(const HistoryState &state);

} // namespace even::web
