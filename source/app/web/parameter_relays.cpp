#include "app/web/parameter_relays.h"

#include <optional>
#include <utility>

namespace even {

class ParameterRelays::Relay {
public:
  virtual ~Relay() = default;

  [[nodiscard]] virtual juce::WebBrowserComponent::Options addTo(juce::WebBrowserComponent::Options options) = 0;
  virtual void attach() = 0;
};

template <typename RelayType, typename AttachmentType>
class ParameterRelays::TypedRelay final : public Relay {
public:
  explicit TypedRelay(juce::RangedAudioParameter &parameterToUse)
      : parameter(parameterToUse), relay(parameterToUse.getParameterID()) {}

  juce::WebBrowserComponent::Options addTo(juce::WebBrowserComponent::Options options) override {
    return options.withOptionsFrom(relay);
  }

  void attach() override { attachment.emplace(parameter, relay, nullptr); }

private:
  juce::RangedAudioParameter &parameter;
  // Relays and attachments are neither copyable nor movable: both stay in place.
  RelayType relay;
  std::optional<AttachmentType> attachment;
};

ParameterRelays::ParameterRelays(juce::AudioProcessor &processor) {
  for (auto *each : processor.getParameters()) {
    auto *parameter = dynamic_cast<juce::RangedAudioParameter *>(each);
    jassert(parameter != nullptr);

    if (dynamic_cast<juce::AudioParameterBool *>(parameter) != nullptr)
      relays.push_back(
          std::make_unique<TypedRelay<juce::WebToggleButtonRelay, juce::WebToggleButtonParameterAttachment>>(
              *parameter));
    else if (dynamic_cast<juce::AudioParameterChoice *>(parameter) != nullptr)
      relays.push_back(
          std::make_unique<TypedRelay<juce::WebComboBoxRelay, juce::WebComboBoxParameterAttachment>>(*parameter));
    else
      relays.push_back(
          std::make_unique<TypedRelay<juce::WebSliderRelay, juce::WebSliderParameterAttachment>>(*parameter));
  }
}

ParameterRelays::~ParameterRelays() = default;

juce::WebBrowserComponent::Options ParameterRelays::addTo(juce::WebBrowserComponent::Options options) const {
  for (const auto &relay : relays)
    options = relay->addTo(std::move(options));
  return options;
}

void ParameterRelays::attach() {
  for (const auto &relay : relays)
    relay->attach();
}

} // namespace even
