# Changelog

## [0.2.0](https://github.com/egor-sm/even/compare/v0.1.0...v0.2.0) (2026-10-10)


### Features

* **analyzer:** analyzer settings in the graph, with a range scale ([2268b22](https://github.com/egor-sm/even/commit/2268b22a00c456ac09cb6d72a3cada3483bf21d3))
* **analyzer:** analyzer settings in the graph, with a range scale ([d560958](https://github.com/egor-sm/even/commit/d560958587523029e9ebc6088360bd7c61f56ee3)), closes [#40](https://github.com/egor-sm/even/issues/40)
* **analyzer:** smoother analyzer curve, with switchable analysis variants ([1bf2119](https://github.com/egor-sm/even/commit/1bf21193227dddaa48838522b5c681ccb10e0f3a))
* **analyzer:** smoother analyzer curve, with switchable analysis variants ([8ac10dd](https://github.com/egor-sm/even/commit/8ac10dd8fd9b448ed5aeea12ea874aeb5c5dae4e))


### Bug Fixes

* **app:** raise the gain range to ±36 dB ([cd9925f](https://github.com/egor-sm/even/commit/cd9925faf0ca7e415d12ba062814df08858202dc))
* let the gain reach the ±36 dB of the display range ([20848f4](https://github.com/egor-sm/even/commit/20848f428b93b536de43e6f0141a434231b5b23b))
* **ui:** centre the icons of segmented controls ([0ca3ec5](https://github.com/egor-sm/even/commit/0ca3ec5dff0261a7d3f15304961bd10bb7c0ebd0))
* **ui:** centre the icons of segmented controls ([a778cb1](https://github.com/egor-sm/even/commit/a778cb18adfed5bd3cda216b34a8f3162a023325))
* **ui:** hide the closed select menu ([1d2a7ab](https://github.com/egor-sm/even/commit/1d2a7ab2cfd0347ad4313d050d1c7be56c470739))
* **ui:** hide the closed select menu ([d53811b](https://github.com/egor-sm/even/commit/d53811be679c202dd935595866ad0f005b98d176))
* **ui:** keep a click on a black key from snapping to a white one ([d39047c](https://github.com/egor-sm/even/commit/d39047cdc6c5cb43fb1285e3dc8c130e85145c40))
* **ui:** keep gain edits within the parameter range ([db7fc46](https://github.com/egor-sm/even/commit/db7fc46655b690321af50d5a9ff02dba8697a7f5))
* **ui:** move the band dock with translate instead of left ([b43546e](https://github.com/egor-sm/even/commit/b43546e02fd71ce82e66acb24b9150b7be5b8173))
* **ui:** move the keyboard dot straight to a clicked key ([260962d](https://github.com/egor-sm/even/commit/260962d053ec98e93d7b338a545d3d2b108ae5e6))
* **ui:** put the Q handles on the 0 dB line ([d477b23](https://github.com/egor-sm/even/commit/d477b23dca5d47631b342c7b156de1a07927778e))
* **ui:** put the Q handles on the 0 dB line ([b0ecabb](https://github.com/egor-sm/even/commit/b0ecabb110d494362218a2107bae3a06f7503853))
* **ui:** repaint the dock's note in WebKit and tidy up key clicks ([473e520](https://github.com/egor-sm/even/commit/473e5201ef84a663423bd230123ec9cb8d7ab36a))
* **ui:** show the clicked note in the dock while the band glides to it ([3d1d43c](https://github.com/egor-sm/even/commit/3d1d43cec1d9d2a3a4b608f31ca7329fb20f9f04))

## 0.1.0 (2026-10-05)


### ⚠ BREAKING CHANGES

* all equalizer features of the previous version are removed; they will be ported to the new architecture step by step.

### Features

* **analyzer:** add input spectrum analyzer with WebGL rendering ([0f92165](https://github.com/egor-sm/even/commit/0f921650bd642313f9935cab813c10be2cecdba7))
* **analyzer:** show the input and output spectra together ([6a89536](https://github.com/egor-sm/even/commit/6a89536eefde4fdc0c7d1f15648fb2c64bde71e2))
* band slots that can be created and deleted ([a0581fd](https://github.com/egor-sm/even/commit/a0581fd599d7203680b3e9295ba3e11d69ee7256))
* draw the EQ response curve ([d0c3c89](https://github.com/egor-sm/even/commit/d0c3c893dbe4dd941d9ea0442842456f674f2ae5))
* **dsp:** add 72 and 96 dB/oct cut slopes ([8cdecb2](https://github.com/egor-sm/even/commit/8cdecb20a023373824b5bafc39b8f165e2cb5b6d))
* **dsp:** add Butterworth cut slopes from 6 to 48 dB/oct ([7aa4463](https://github.com/egor-sm/even/commit/7aa4463c24c7881bd02aea739e33613ac1c3b041))
* **dsp:** add EQ band shapes via SVF output mixing ([485c743](https://github.com/egor-sm/even/commit/485c743a18f0d2d99928a0378916882c9934cfd4))
* **dsp:** add one-pole TPT filter with unit tests ([6b2dd93](https://github.com/egor-sm/even/commit/6b2dd931e5903942acc9dd1c2483bfe20e1ab4ed))
* **dsp:** add smoothed EQ band with crossfades ([aa7b47f](https://github.com/egor-sm/even/commit/aa7b47fec4a0946efc8e5659231f68943470b0eb))
* **dsp:** add tilt shelf ([67e0657](https://github.com/egor-sm/even/commit/67e065710586eb42738d9959369cd37cd101a002))
* **dsp:** add TPT state-variable filter ([05bc4c9](https://github.com/egor-sm/even/commit/05bc4c9b739e2f743c897fc995bcce1610230b3e))
* fixed window size with a UI scale and user settings ([8e10409](https://github.com/egor-sm/even/commit/8e10409433cdd33f0c7d9427f798b75712a1ac6b))
* preview a band type as a ghost curve ([1119530](https://github.com/egor-sm/even/commit/111953027e8dd1b50d43fae702f0aabd00d7ddf4))
* rebuild app on JUCE 9 with a web UI ([2451be4](https://github.com/egor-sm/even/commit/2451be499c3ae19be40248ee06b7149d600dc706))
* run 12 EQ bands ([5f87e71](https://github.com/egor-sm/even/commit/5f87e717abc6abc371ad3d607e6abcdf4c5d76a4))
* solo a band ([b31a7d4](https://github.com/egor-sm/even/commit/b31a7d44562e4260460c7d8b18c3f3a095e8c87d))
* undo and redo band edits ([fc87922](https://github.com/egor-sm/even/commit/fc87922c7ff8bc5c2a54697ba88382e3ea2be34a))
* **webui:** a small UI kit on Ark UI ([d6fbd57](https://github.com/egor-sm/even/commit/d6fbd57d3fbd4d75bfbd06419db0346e9e8c19ec))
* **webui:** draw the graph of the Even design ([0fbebfe](https://github.com/egor-sm/even/commit/0fbebfe4a52bfade1baa9b1bc100d0c5b22ff3b8))
* **webui:** edit bands directly on the graph ([a916652](https://github.com/egor-sm/even/commit/a916652db34f1b559344c742d92740286ea50f1f))
* **webui:** edit bands on the graph and in the dock ([6163d3c](https://github.com/egor-sm/even/commit/6163d3c80f154e625837ff5983a71b8fa47771b1))
* **webui:** foundation of the Even design ([ae1263d](https://github.com/egor-sm/even/commit/ae1263d1a52952c2748cccedfe968dc0d9504f3d))
* **webui:** interactive axes and cursor readout ([ef0ee4e](https://github.com/egor-sm/even/commit/ef0ee4e382280f5f874570ff029f54047634e426))
* widen the gain range to ±30 dB and limit q to 30 ([23f32d4](https://github.com/egor-sm/even/commit/23f32d46d2485eb800879c409482845cedc16e2e))


### Bug Fixes

* **app:** re-sign the bundles after JUCE's post-build steps ([8b17e36](https://github.com/egor-sm/even/commit/8b17e362d6e6997a7af91c6774adbce504df3a07))
* **webui:** hide the web view context menu in release builds ([fadf7bf](https://github.com/egor-sm/even/commit/fadf7bf1c046130112bc120e3de8094a72fa6bd3))
* **webui:** show the analyzer menu above the graph ([f228623](https://github.com/egor-sm/even/commit/f228623e09697c687f33daeba06cfe02e9a16536))
