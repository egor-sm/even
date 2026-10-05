#pragma once

#include <juce_events/juce_events.h>

namespace even::test {

// Runs the message loop briefly: delivers pending async updates (e.g. history recording), as the
// message thread does between two edits in the plugin.
inline void settleMessages() {
  juce::MessageManager::getInstance()->runDispatchLoopUntil(20);
}

} // namespace even::test
