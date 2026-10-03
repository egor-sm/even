# Plain C++ DSP building blocks: no JUCE, no allocations in processing, unit-tested in tests/dsp.
add_library(eqit_dsp STATIC one_pole.cpp svf.cpp band_design.cpp band_response.cpp band.cpp)
add_library(eqit::dsp ALIAS eqit_dsp)

target_include_directories(eqit_dsp PUBLIC "${PROJECT_SOURCE_DIR}/source")
target_compile_features(eqit_dsp PUBLIC cxx_std_23)
target_link_libraries(eqit_dsp PRIVATE eqit_warnings)
