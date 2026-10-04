# Strict warnings for our own (non-JUCE) targets: link even_warnings privately.
add_library(even_warnings INTERFACE)

if(MSVC)
  target_compile_options(even_warnings INTERFACE /W4 /permissive-)
else()
  target_compile_options(
    even_warnings
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
