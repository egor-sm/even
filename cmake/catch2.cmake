# Catch2 for the module tests (source/*/tests); call catch_discover_tests from there.
CPMAddPackage(
  NAME Catch2
  VERSION 3.16.0
  SYSTEM YES
  URL https://github.com/catchorg/Catch2/archive/refs/tags/v3.16.0.tar.gz
  URL_HASH SHA256=0957cae5821b17ce07f0833aaa52b5137643a8382203221f363a8303c109af34)

list(APPEND CMAKE_MODULE_PATH "${Catch2_SOURCE_DIR}/extras")
include(Catch)
