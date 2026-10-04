# Plain C++ editing model of the EQ (band slots, edit rules, undo history, solo range): no JUCE, unit-tested in tests/model.
add_library(even_model STATIC band_slot.cpp edit_history.cpp solo.cpp)
add_library(even::model ALIAS even_model)

target_include_directories(even_model PUBLIC "${PROJECT_SOURCE_DIR}/source")
target_compile_features(even_model PUBLIC cxx_std_23)
target_link_libraries(
  even_model
  PUBLIC even::dsp
  PRIVATE even_warnings)
