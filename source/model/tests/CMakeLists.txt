add_executable(even_model_tests band_slot_test.cpp edit_history_test.cpp solo_test.cpp)

target_link_libraries(even_model_tests PRIVATE even::model even::testing even_warnings)

catch_discover_tests(even_model_tests PROPERTIES LABELS model)
