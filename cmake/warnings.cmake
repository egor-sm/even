# Strict warnings for our own (non-JUCE) targets: link eqit_warnings privately.
add_library(eqit_warnings INTERFACE)

if(MSVC)
  target_compile_options(eqit_warnings INTERFACE /W4 /permissive-)
else()
  target_compile_options(
    eqit_warnings
    INTERFACE -Wall
              -Wextra
              -Wpedantic
              -Wshadow
              -Wconversion
              -Wsign-conversion
              -Wdouble-promotion
              -Wnon-virtual-dtor
              -Wold-style-cast
              -Woverloaded-virtual)
endif()
