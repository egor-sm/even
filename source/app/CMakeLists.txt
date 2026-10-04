juce_add_plugin(
  even
  PRODUCT_NAME "Even"
  COMPANY_NAME "Egor Smirnov"
  BUNDLE_ID "com.eveneq"
  PLUGIN_MANUFACTURER_CODE EgSm
  PLUGIN_CODE Even
  FORMATS Standalone VST3
  IS_SYNTH FALSE
  NEEDS_MIDI_INPUT FALSE
  NEEDS_MIDI_OUTPUT FALSE
  COPY_PLUGIN_AFTER_BUILD FALSE
  NEEDS_WEB_BROWSER TRUE
  NEEDS_WEBVIEW2 TRUE
  MICROPHONE_PERMISSION_ENABLED TRUE
  MICROPHONE_PERMISSION_TEXT "Even analyses the audio input in the standalone app.")

target_sources(
  even
  PRIVATE plugin_processor.cpp
          plugin_editor.cpp
          parameters.cpp
          band_slots.cpp
          band_history.cpp
          response_packet.cpp
          web_resources.cpp
          test_signal.cpp
          analyzer/spectrum_analyzer.cpp)

target_compile_features(even PRIVATE cxx_std_23)

target_compile_definitions(
  even
  PRIVATE JUCE_WEB_BROWSER=1
          JUCE_USE_CURL=0
          JUCE_VST3_CAN_REPLACE_VST2=0
          JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1)

configure_file(build_config.h.in "${CMAKE_BINARY_DIR}/generated/build_config.h" @ONLY)
target_include_directories(even PRIVATE "${CMAKE_BINARY_DIR}/generated")

target_link_libraries(
  even
  PRIVATE even_webui_assets
          even::model
          juce::juce_audio_utils
          juce::juce_dsp
          juce::juce_gui_extra
  PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_lto_flags
         juce::juce_recommended_warning_flags)
