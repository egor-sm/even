# The app's code on a real PluginProcessor, without a host or a web view.
juce_add_console_app(even_app_tests PRODUCT_NAME "Even App Tests")

target_sources(
  even_app_tests
  PRIVATE juce_runtime.cpp
          band_slots_test.cpp
          band_history_test.cpp
          response_packet_test.cpp
          native_functions_test.cpp
          arguments_test.cpp)

# JucePlugin_* come from juce_add_plugin for the plugin itself. Modal loops let tests run the
# message loop (settleMessages) so that async work happens between edits, as in the plugin.
target_compile_definitions(even_app_tests PRIVATE JucePlugin_Name="Even" JucePlugin_VersionString="0.0.0"
                                                  JUCE_MODAL_LOOPS_PERMITTED=1)

target_link_libraries(
  even_app_tests
  PRIVATE even_app_code
          even::testing
          juce::juce_recommended_config_flags
          juce::juce_recommended_warning_flags)

catch_discover_tests(even_app_tests PROPERTIES LABELS app)
