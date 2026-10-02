# Spectrum analysis

Spectrum analysis reads the observation buffer for input or output PCM, and calculates the FFT in the back. Python takes the latest results for drawing; it is not a play, audio or full audio storage interface.

## Create Analyzer

```text
analyzer = audio.spectrum_analyzer(
    *, fft_size=None, sample_rate=None, pcm_ringbuf_cap=None
)
```

Parameters can be omitted and can only be entered by name. The valid value at `None` is omitted in the table.

| Parameters | Valid Default | Requirements and uses |
| --- | --- | --- |
| `fft_size` | `512` | 2 thallium, minimum 8, maximum active value 32768; integer `ValueError` and other illegal FFT configuration `RuntimeError` |
| `sample_rate` | `16000.0` | positive, as a frequency ruler; no sampling or re-sampling |
| `pcm_ringbuf_cap` | Do not reset capacity | in samples; bottom initial capacity is 64000 per road; visible values must be greater than 0 and smaller than 1024 to 1024 |

The input analysis uses 16000, the output analysis uses ** 48,000**. Using the wrong sampling rate leads to an error in the main frequency, the frequency segment, even if the column chart moves.

```python
analyzer = audio.spectrum_analyzer(
    fft_size=1024, sample_rate=48000, pcm_ringbuf_cap=4096
)
```

The capacity should accommodate at least one FFT window. Only when input / output dump is closed will the bottom level be allowed to change the capacity; otherwise, the log is recorded as rejected, but the plant method is not abnormal. The visible configuration will recreate the two-way ring, each with `容量 × 2` bytes.

All analysts share the same set of configuration, buffer and back-office analysis processes. Changes to the FFT configuration are preceded by `disable()` to avoid running FFT access to adjusted resources; no multiple analysers are created to analyse two-way sounds.

## Select Input or Output

The following parameters are entered by location.

| Interface | Return and Behaviour |
| --- | --- |
| `enable_dump_input(enabled)` | `True`: Create an input PCM ring observation buffer as needed and empty the data available to allow the collection process to write to PCM; `False`: Stop writing new data to the buffer. Do not create new backstage processing, do not start audio or FFT; return `None` |
| `enable_dump_output(enabled)` | `True`: Create an output PCM ring observation buffer as needed and empty the data available to allow the play process to write to PCM; `False`: Stop writing new data to the buffer. Do not create new backstage processing, do not start play or FFT; return `None` |
| `input_dump_enabled()` / `output_dump_enabled()` | returns bool |
| `enable_on_pcm(src)` | `1` For input, `2` for output; other values discard ValleError; return bool |
| `disable()` | Stop spectral analysis, return Bool; do not close dump |
| `set_fps(fps)` | Set FFT calculation frequency, limit integer to 5-60, lower initial 50; return None |

### Observation buffer and FFT

The two switches operate **PCM ring observation buffer (`PcmRing`)**, not the playlist or audio PCM output line described earlier. It is used to temporarily save an audio data for FFT or application observation, without changing the normal audio/ play-off path.

`enable_dump_input()` / `enable_dump_output()` Only switches, distributions and clear buffers are set, and PCM is written by the existing collection/playback process. `True` , the corresponding buffer is created only when it does not exist; already exists it is reused. `True` All empty available data. `False` Only closes the road, does not release or empty buffers, and does not destroy operational FFT backstage processing.

FFT uses the Cache PCM in the observation buffer: After `enable_on_pcm(1)` or `enable_on_pcm(2)` selects the open input/ output observation, the bottom is used again to create a backstage FFT processing as needed. Each calculation takes `fft_size` samples from the selected buffer to calculate the buffer and executes the FFT; it is not directly calculated for the Opus encoded package, nor immediately when Python calls the dump switch.

```text
Collection process → 16 kHz PCM (AFE Before processing)→ Enter observation buffer ─┐
                                                 ├→ Select the path → Checkout PCM Window → FFT → Spectrum results
Play Process → Submitting Output 48 kHz PCM → Output Observation Buffer ──┘
```

The input to the observation buffer record is the collection of PCMs before they are sent to AFE. The input spectrum cannot be used as a recording spectrum after NS noise. The output observation buffers write data after a PCM output has been called; Opus has decoded the PCM and MicroPyxel synthesis has actually been observed on this route when the output is actually obtained.

If the sample is less than one FFT window, wait for subsequent data to be calculated; if more than one window, keep the latest `fft_size` sample and discard older data. The FFT reading will consume observation buffers, so the data will be shared with the FFT when manually reading the same buffer and cannot be considered as a no-lose audio cache.

Enable the corresponding dump first, select the source and start the FFT:

```python
analyzer.enable_dump_output(True)
analyzer.enable_on_pcm(2)
```

`enable_on_pcm()` Returns True does not amount to a spectrum that has been obtained. Corresponding dump does not start analysis when it is not enabled; it does not produce results when there is no audio data. Input analysis also needs to start the recording and consume the recorded data in a timely manner, otherwise the recording line back pressure will cause collection to stop.

Repeating `enable_dump_...(True)` will empty the observation buffer and not call from each frame. At the end of the period, `disable()` will close the open input/ output dump and release the service.

The current `audio.deinit()` release spectrum analysers and observation buffers, but do not restore the Dump switch, observation buffer configuration, and FFT calculation frequency to the initial value. If you do not close the dump, the re-initiation of the buffer may be refused. Therefore, the re-initiation should close the dump; the re-initiation should result in the creation of a new analyser and call `set_fps()` as required. The 50 fps is the lower initial value, which does not guarantee that it will return to 50 at each re-initiation.

## 16-band spectrum data

```text
analyzer.get_bands_u8(max_height, noise=0.8, amplitude=1.5, /)
analyzer.get_bands_u8_into(out_buf, max_height, noise=0.8, amplitude=1.5, /)
```

| Parameters | Annotations |
| --- | --- |
| `out_buf` | Into version required to be filled, write buffers, at least 16 bytes; recommended reuse `bytearray(16)` |
| `max_height` | To be filled, integer 1 to 255; screen drawings usually set 16 |
| `noise` | Default 0.8, FFT band threshold, bin with no additions below or equal to the threshold |
| `amplitude` | Default 1.5, must be greater than 0; is the height of the division,** the larger the column is shorter** |

The normal version returns 16 bytearray, with no result `None`; the into version successfully writes 16 before 16 bytes and returns 16 without result 0. Returns 0 do not consider the old value of the buffer as a new frame.

Each segment is organized from low to high frequency, covering approximately 46.875 Hz to less than 8 kHz; although the output sampling rate is 48 kHz, 16 shows that this range is only covered. The upper boundary in each segment is:

```text
78.125, 109.375, 140.625, 203.125, 265.625,
390.625, 515.625, 703.125, 984.375, 1359.375,
1890.625, 2609.375, 3609.375, 4984.375, 6890.625 Hz
The last paragraph extends to 8000 Hz (Exclude)
```

Height multiplied by the bin mark `512 / fft_size` Then we'll do a threshold filter, add it up by paragraph and divide it by `amplitude`, intercept the integer and limit it to `0..max_height`. These parameters only change the way they show that they do not change the volume of the speaker, nor are they calibrated sound units.

## Raw magnitude, dB, and dominant frequency

| Interface | Back |
| --- | --- |
| `get_spectrum_magnitude(cap=0, /)` | fload32 range array, bytearray returns |
| `get_spectrum_magnitude_db(cap=0, /)` | `20 × log10(幅度)` for float32 return with bytearray |
| `get_spectrum_major_peak_hz()` | Main Peak frequency float, in Hz |

No result returns `None`. `cap` is the maximum number of floats, not negative integers; 0 is the full range. The full range results are `fft_size / 2` items, bytes multiplied by 4 items, not the Python float list.

```python
import struct
raw = analyzer.get_spectrum_magnitude(8)
if raw is not None:
    values = [struct.unpack_from("<f", raw, i)[0]
              for i in range(0, len(raw), 4)]
    print(values)
```

Item k corresponds to `k × sample_rate / fft_size` Hz, and contains DC entry but does not contain Nyquist endpoints. Enter PCM first divided by 32768 for integration and using Hamming windows; the FFT range is not converted to a standard acoustic level, and dB output is not a dB SPL for acoustics.

These methods read the latest snapshot. Stopping or stopping FFT may return the previous frame result and will not automatically be zero; applications can empty the image based on the play state.

## Read PCM observation buffer

| Interface | Back |
| --- | --- |
| `audio_input_available()` / `audio_output_available()` | Number of currently readable samples, not bytes |
| `read_audio_input(n_samples)` / `read_audio_output(n_samples)` | Read specified positive integer samples and return bytearray with `n_samples × 2` length; return None if not in whole batch |

Reading operations are transposed by location and consumes the data in the ring. This is the observation data before entering the pre-processing or the PCM that has been submitted for output, not the same line `RecordSession.read()`. Output observations are also not the measured sound pressure of the loudspeaker that is controlled by the volume of the hardware.

ring Queue the old data and keep up-to-date data. FFT itself consumes the same ring and keeps only the latest window when the data is up. So do not ask for FFT real-time analysis while using the same path dump to expect a complete and clean recording; save the recording for Recoder.

## Compute cost and refresh limits

- Default frequency resolution of 512 points at the input end 31.25 Hz, with an output end of 93.75 Hz. 48 kHz to increase the FFT points improves the low frequency resolution but increases memory, computing and window time.
- `set_fps(60)` is the desired frequency of calculation, which does not guarantee 60 new results per second. If the data do not have a window, the decoding, drawing and other processing will compete for CPU.
- The default one-way dump is about 128 KB, FFT also needs a solid, no-brand, PCM window and multiple result buffer. Do not directly consider the maximum valid FFT points as recommended on the device.
- A new bytearray is created each time a full range is obtained; 16-part spectrum priority re-use `get_bands_u8_into()` to reduce GC pressure.
