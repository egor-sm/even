# Helpers shared by the tests of several modules: header-only, included as "testing/...".
add_library(even_testing INTERFACE)
add_library(even::testing ALIAS even_testing)

target_include_directories(even_testing INTERFACE "${PROJECT_SOURCE_DIR}/source")
target_link_libraries(even_testing INTERFACE Catch2::Catch2WithMain)
