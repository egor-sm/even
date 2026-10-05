add_executable(
  even_dsp_tests
  one_pole_test.cpp
  svf_test.cpp
  band_design_test.cpp
  smoothed_value_test.cpp
  band_test.cpp
  band_response_test.cpp
  equalizer_test.cpp)

target_link_libraries(even_dsp_tests PRIVATE even::dsp even::testing even_warnings)

catch_discover_tests(even_dsp_tests PROPERTIES LABELS dsp)
