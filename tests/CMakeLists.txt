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
  dsp/equalizer_test.cpp)

target_include_directories(even_tests PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}")
target_link_libraries(even_tests PRIVATE even::dsp Catch2::Catch2WithMain even_warnings)

catch_discover_tests(even_tests)
