juce_add_plugin(
  equalize_it
  PRODUCT_NAME "Equalize It"
  COMPANY_NAME "SmEgDm"
  BUNDLE_ID "com.smegdm.equalize-it"
  PLUGIN_MANUFACTURER_CODE Smeg
  PLUGIN_CODE Eqit
  FORMATS Standalone VST3
  IS_SYNTH FALSE
  NEEDS_MIDI_INPUT FALSE
  NEEDS_MIDI_OUTPUT FALSE
  COPY_PLUGIN_AFTER_BUILD FALSE
  NEEDS_WEB_BROWSER TRUE
  NEEDS_WEBVIEW2 TRUE
  MICROPHONE_PERMISSION_ENABLED TRUE
  MICROPHONE_PERMISSION_TEXT "Equalize It analyses the audio input in the standalone app.")

target_sources(
  equalize_it
  PRIVATE plugin_processor.cpp
          plugin_editor.cpp
          web_resources.cpp
          test_signal.cpp
          analyzer/spectrum_analyzer.cpp)

target_compile_features(equalize_it PRIVATE cxx_std_23)

target_compile_definitions(
  equalize_it
  PRIVATE JUCE_WEB_BROWSER=1
          JUCE_USE_CURL=0
          JUCE_VST3_CAN_REPLACE_VST2=0
          JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1)

configure_file(build_config.h.in "${CMAKE_BINARY_DIR}/generated/build_config.h" @ONLY)
target_include_directories(equalize_it PRIVATE "${CMAKE_BINARY_DIR}/generated")

target_link_libraries(
  equalize_it
  PRIVATE eqit_webui_assets
          juce::juce_audio_utils
          juce::juce_dsp
          juce::juce_gui_extra
  PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_lto_flags
         juce::juce_recommended_warning_flags)
