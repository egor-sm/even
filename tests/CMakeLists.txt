CPMAddPackage(
  NAME Catch2
  VERSION 3.16.0
  SYSTEM YES
  URL https://github.com/catchorg/Catch2/archive/refs/tags/v3.16.0.tar.gz
  URL_HASH SHA256=0957cae5821b17ce07f0833aaa52b5137643a8382203221f363a8303c109af34)

list(APPEND CMAKE_MODULE_PATH "${Catch2_SOURCE_DIR}/extras")
include(Catch)

add_executable(eqit_tests dsp/one_pole_test.cpp dsp/svf_test.cpp dsp/band_design_test.cpp)

target_include_directories(eqit_tests PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}")
target_link_libraries(eqit_tests PRIVATE eqit::dsp Catch2::Catch2WithMain eqit_warnings)

catch_discover_tests(eqit_tests)
