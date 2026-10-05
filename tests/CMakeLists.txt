CPMAddPackage(
  NAME Catch2
  VERSION 3.16.0
  SYSTEM YES
  URL https://github.com/catchorg/Catch2/archive/refs/tags/v3.16.0.tar.gz
  URL_HASH SHA256=0957cae5821b17ce07f0833aaa52b5137643a8382203221f363a8303c109af34)

list(APPEND CMAKE_MODULE_PATH "${Catch2_SOURCE_DIR}/extras")
include(Catch)

add_executable(
  even_tests
  dsp/one_pole_test.cpp
  dsp/svf_test.cpp
  dsp/band_design_test.cpp
  dsp/smoothed_value_test.cpp
  dsp/band_test.cpp
  dsp/band_response_test.cpp
  dsp/equalizer_test.cpp
  model/band_slot_test.cpp
  model/edit_history_test.cpp
  model/solo_test.cpp)

target_include_directories(even_tests PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}")
target_link_libraries(even_tests PRIVATE even::model Catch2::Catch2WithMain even_warnings)

catch_discover_tests(even_tests)

# The app's code (source/app) on a real PluginProcessor, without a host or a web view.
juce_add_console_app(even_app_tests PRODUCT_NAME "Even App Tests")

target_sources(
  even_app_tests
  PRIVATE app/juce_runtime.cpp
          app/band_slots_test.cpp
          app/band_history_test.cpp
          app/response_packet_test.cpp
          app/native_functions_test.cpp)

# JucePlugin_* come from juce_add_plugin for the plugin itself. Modal loops let tests run the
# message loop (settleMessages) so that async work happens between edits, as in the plugin.
target_compile_definitions(even_app_tests PRIVATE JucePlugin_Name="Even" JucePlugin_VersionString="0.0.0"
                                                  JUCE_MODAL_LOOPS_PERMITTED=1)
target_include_directories(even_app_tests PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}")

target_link_libraries(
  even_app_tests
  PRIVATE even_app_code
          Catch2::Catch2WithMain
          juce::juce_recommended_config_flags
          juce::juce_recommended_warning_flags)

catch_discover_tests(even_app_tests)
