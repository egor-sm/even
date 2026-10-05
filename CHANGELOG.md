# Changelog

## 0.1.0 (2026-10-05)


### ⚠ BREAKING CHANGES

* all equalizer features of the previous version are removed; they will be ported to the new architecture step by step.

### Features

* **analyzer:** add input spectrum analyzer with WebGL rendering ([0f92165](https://github.com/egor-sm/equalize_it/commit/0f921650bd642313f9935cab813c10be2cecdba7))
* **analyzer:** show the input and output spectra together ([6a89536](https://github.com/egor-sm/equalize_it/commit/6a89536eefde4fdc0c7d1f15648fb2c64bde71e2))
* band slots that can be created and deleted ([a0581fd](https://github.com/egor-sm/equalize_it/commit/a0581fd599d7203680b3e9295ba3e11d69ee7256))
* draw the EQ response curve ([d0c3c89](https://github.com/egor-sm/equalize_it/commit/d0c3c893dbe4dd941d9ea0442842456f674f2ae5))
* **dsp:** add 72 and 96 dB/oct cut slopes ([8cdecb2](https://github.com/egor-sm/equalize_it/commit/8cdecb20a023373824b5bafc39b8f165e2cb5b6d))
* **dsp:** add Butterworth cut slopes from 6 to 48 dB/oct ([7aa4463](https://github.com/egor-sm/equalize_it/commit/7aa4463c24c7881bd02aea739e33613ac1c3b041))
* **dsp:** add EQ band shapes via SVF output mixing ([485c743](https://github.com/egor-sm/equalize_it/commit/485c743a18f0d2d99928a0378916882c9934cfd4))
* **dsp:** add one-pole TPT filter with unit tests ([6b2dd93](https://github.com/egor-sm/equalize_it/commit/6b2dd931e5903942acc9dd1c2483bfe20e1ab4ed))
* **dsp:** add smoothed EQ band with crossfades ([aa7b47f](https://github.com/egor-sm/equalize_it/commit/aa7b47fec4a0946efc8e5659231f68943470b0eb))
* **dsp:** add tilt shelf ([67e0657](https://github.com/egor-sm/equalize_it/commit/67e065710586eb42738d9959369cd37cd101a002))
* **dsp:** add TPT state-variable filter ([05bc4c9](https://github.com/egor-sm/equalize_it/commit/05bc4c9b739e2f743c897fc995bcce1610230b3e))
* fixed window size with a UI scale and user settings ([8e10409](https://github.com/egor-sm/equalize_it/commit/8e10409433cdd33f0c7d9427f798b75712a1ac6b))
* preview a band type as a ghost curve ([1119530](https://github.com/egor-sm/equalize_it/commit/111953027e8dd1b50d43fae702f0aabd00d7ddf4))
* rebuild app on JUCE 9 with a web UI ([2451be4](https://github.com/egor-sm/equalize_it/commit/2451be499c3ae19be40248ee06b7149d600dc706))
* run 12 EQ bands ([5f87e71](https://github.com/egor-sm/equalize_it/commit/5f87e717abc6abc371ad3d607e6abcdf4c5d76a4))
* solo a band ([b31a7d4](https://github.com/egor-sm/equalize_it/commit/b31a7d44562e4260460c7d8b18c3f3a095e8c87d))
* undo and redo band edits ([fc87922](https://github.com/egor-sm/equalize_it/commit/fc87922c7ff8bc5c2a54697ba88382e3ea2be34a))
* **webui:** a small UI kit on Ark UI ([d6fbd57](https://github.com/egor-sm/equalize_it/commit/d6fbd57d3fbd4d75bfbd06419db0346e9e8c19ec))
* **webui:** draw the graph of the Even design ([0fbebfe](https://github.com/egor-sm/equalize_it/commit/0fbebfe4a52bfade1baa9b1bc100d0c5b22ff3b8))
* **webui:** edit bands directly on the graph ([a916652](https://github.com/egor-sm/equalize_it/commit/a916652db34f1b559344c742d92740286ea50f1f))
* **webui:** edit bands on the graph and in the dock ([6163d3c](https://github.com/egor-sm/equalize_it/commit/6163d3c80f154e625837ff5983a71b8fa47771b1))
* **webui:** foundation of the Even design ([ae1263d](https://github.com/egor-sm/equalize_it/commit/ae1263d1a52952c2748cccedfe968dc0d9504f3d))
* **webui:** interactive axes and cursor readout ([ef0ee4e](https://github.com/egor-sm/equalize_it/commit/ef0ee4e382280f5f874570ff029f54047634e426))
* widen the gain range to ±30 dB and limit q to 30 ([23f32d4](https://github.com/egor-sm/equalize_it/commit/23f32d46d2485eb800879c409482845cedc16e2e))


### Bug Fixes

* **app:** re-sign the bundles after JUCE's post-build steps ([8b17e36](https://github.com/egor-sm/equalize_it/commit/8b17e362d6e6997a7af91c6774adbce504df3a07))
* **webui:** hide the web view context menu in release builds ([fadf7bf](https://github.com/egor-sm/equalize_it/commit/fadf7bf1c046130112bc120e3de8094a72fa6bd3))
* **webui:** show the analyzer menu above the graph ([f228623](https://github.com/egor-sm/equalize_it/commit/f228623e09697c687f33daeba06cfe02e9a16536))
