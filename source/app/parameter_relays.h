#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>

#include <memory>
#include <vector>

namespace even {

// Relays every parameter of a processor to the page under its parameter ID, with the relay its
// type needs: a toggle for bool parameters, a combo box for choices and a slider for the rest.
// The web view's options take the relays, so this is created before the web view and outlives it;
// attach() connects relays and parameters once the web view exists.
class ParameterRelays {
public:
  explicit ParameterRelays(juce::AudioProcessor &processor);
  ~ParameterRelays();

  ParameterRelays(const ParameterRelays &) = delete;
  ParameterRelays &operator=(const ParameterRelays &) = delete;
  ParameterRelays(ParameterRelays &&) = delete;
  ParameterRelays &operator=(ParameterRelays &&) = delete;

  [[nodiscard]] juce::WebBrowserComponent::Options addTo(juce::WebBrowserComponent::Options options) const;

  // Keeps each parameter and its relay in sync in both directions from now on.
  void attach();

private:
  class Relay;
  template <typename RelayType, typename AttachmentType>
  class TypedRelay;

  std::vector<std::unique_ptr<Relay>> relays;
};

} // namespace even
