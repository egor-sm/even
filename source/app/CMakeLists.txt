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

# The app's own code. Like a JUCE module it is an interface library: the plugin and the app tests
# (tests/) each compile it with their own JUCE setup.
add_library(even_app_code INTERFACE)

target_sources(
  even_app_code
  INTERFACE "${CMAKE_CURRENT_SOURCE_DIR}/plugin/plugin_processor.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/plugin/plugin_editor.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/plugin/parameters.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/state/band_slots.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/state/band_history.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/state/response_state.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/state/user_settings.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/web/native_functions.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/web/arguments.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/web/messages.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/web/parameter_relays.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/web/response_packet.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/web/web_resources.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/analyzer/spectrum_analyzer.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/debug/test_signal.cpp")

target_compile_features(even_app_code INTERFACE cxx_std_23)

target_compile_definitions(even_app_code INTERFACE JUCE_WEB_BROWSER=1 JUCE_USE_CURL=0
                                                   JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1)

configure_file(build_config.h.in "${CMAKE_BINARY_DIR}/generated/build_config.h" @ONLY)
target_include_directories(even_app_code INTERFACE "${CMAKE_BINARY_DIR}/generated")

target_link_libraries(
  even_app_code
  INTERFACE even_ui_assets
            even::model
            juce::juce_audio_utils
            juce::juce_dsp
            juce::juce_gui_extra)

target_compile_definitions(even PRIVATE JUCE_VST3_CAN_REPLACE_VST2=0)

target_link_libraries(
  even
  PRIVATE even_app_code
  PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_lto_flags
         juce::juce_recommended_warning_flags)

if(EVEN_BUILD_TESTS)
  add_subdirectory(tests)
endif()
