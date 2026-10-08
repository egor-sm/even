# Plain C++ DSP building blocks: no JUCE, no allocations in processing, unit-tested in tests/.
add_library(even_dsp STATIC one_pole.cpp svf.cpp band_design.cpp band_response.cpp band.cpp equalizer.cpp
                            spectrum_smoother.cpp)
add_library(even::dsp ALIAS even_dsp)

target_include_directories(even_dsp PUBLIC "${PROJECT_SOURCE_DIR}/source")
target_compile_features(even_dsp PUBLIC cxx_std_23)
target_link_libraries(even_dsp PRIVATE even_warnings)

if(EVEN_BUILD_TESTS)
  add_subdirectory(tests)
endif()
