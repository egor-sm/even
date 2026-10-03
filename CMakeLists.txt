cmake_minimum_required(VERSION 3.25)

project(
  equalize_it
  VERSION 0.1.0
  LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set_property(GLOBAL PROPERTY USE_FOLDERS ON)

set(EQIT_WEBUI_DEV_SERVER_URL
    ""
    CACHE STRING
          "Load the web UI from this dev server (e.g. http://localhost:5173/) instead of the embedded bundle")

option(EQIT_BUILD_TESTS "Build unit tests" ON)

include(cmake/CPM.cmake)
include(cmake/warnings.cmake)

CPMAddPackage(
  NAME JUCE
  VERSION 9.0.3
  URL https://github.com/juce-framework/JUCE/archive/refs/tags/9.0.3.tar.gz
  URL_HASH SHA256=a81e5508b8a0efa483917794ebeaff56aed3075730c405a947734413f40c1aba)

add_subdirectory(source/dsp)
add_subdirectory(source/webui)
add_subdirectory(source/app)

if(EQIT_BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()
