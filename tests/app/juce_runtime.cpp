#include <catch2/reporters/catch_reporter_event_listener.hpp>
#include <catch2/reporters/catch_reporter_registrars.hpp>
#include <juce_events/juce_events.h>
#include <juce_gui_basics/juce_gui_basics.h>

#include <optional>

namespace {

// JUCE needs its message manager (async updates, listeners) for the whole test run.
class JuceRuntime final : public Catch::EventListenerBase {
public:
  using EventListenerBase::EventListenerBase;

  void testRunStarting(const Catch::TestRunInfo & /*info*/) override { runtime.emplace(); }
  void testRunEnded(const Catch::TestRunStats & /*stats*/) override { runtime.reset(); }

private:
  std::optional<juce::ScopedJuceInitialiser_GUI> runtime;
};

} // namespace

CATCH_REGISTER_LISTENER(JuceRuntime)
