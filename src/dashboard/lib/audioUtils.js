// audioUtils.js -- Web Audio helpers for voice chat
// PCM format: 16-bit signed integer, 16kHz, mono

/**
 * Convert Float32Array samples [-1, 1] to base64-encoded Int16 PCM.
 */
export function pcmEncode(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return arrayBufferToBase64(buffer)
}

/**
 * Convert base64-encoded Int16 PCM to Float32Array samples.
 */
export function pcmDecode(base64String) {
  const binary = atob(base64String)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const int16 = new Int16Array(buffer)
  const float32 = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff)
  }
  return float32
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

const SAMPLE_RATE = 16000
const CHUNK_SAMPLES = 1600 // ~100ms at 16kHz

/**
 * Open mic, downsample to 16kHz, emit base64 PCM chunks via onChunk.
 * Returns { stop } to clean up.
 */
export async function createMicStream(audioContext, onChunk) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

  // Use AudioWorklet if available, fall back to ScriptProcessor
  const sourceNode = audioContext.createMediaStreamSource(stream)
  const bufferSize = 4096
  // eslint-disable-next-line no-undef
  const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)

  let sampleBuffer = new Float32Array(0)

  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0)
    const resampled = resampleTo16k(input, audioContext.sampleRate)

    // Accumulate samples and emit in CHUNK_SAMPLES chunks
    const combined = new Float32Array(sampleBuffer.length + resampled.length)
    combined.set(sampleBuffer)
    combined.set(resampled, sampleBuffer.length)
    sampleBuffer = combined

    while (sampleBuffer.length >= CHUNK_SAMPLES) {
      const chunk = sampleBuffer.slice(0, CHUNK_SAMPLES)
      sampleBuffer = sampleBuffer.slice(CHUNK_SAMPLES)
      onChunk(pcmEncode(chunk))
    }
  }

  sourceNode.connect(processor)
  processor.connect(audioContext.destination)

  return {
    stop: () => {
      processor.disconnect()
      sourceNode.disconnect()
      stream.getTracks().forEach(t => t.stop())
    },
  }
}

/**
 * Simple linear interpolation resample to 16kHz.
 */
function resampleTo16k(input, fromRate) {
  if (fromRate === SAMPLE_RATE) return input
  const ratio = fromRate / SAMPLE_RATE
  const outputLength = Math.round(input.length / ratio)
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio
    const idx = Math.floor(pos)
    const frac = pos - idx
    output[i] = idx + 1 < input.length
      ? input[idx] * (1 - frac) + input[idx + 1] * frac
      : input[idx]
  }
  return output
}

/**
 * Queue PCM Float32 buffers for sequential gapless playback.
 * Returns { enqueue, stop }.
 */
export function createPlaybackQueue(audioContext) {
  let nextPlayTime = 0
  let stopped = false

  function enqueue(float32Data) {
    if (stopped) return
    const buffer = audioContext.createBuffer(1, float32Data.length, SAMPLE_RATE)
    buffer.copyToChannel(float32Data, 0)
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    const startTime = Math.max(audioContext.currentTime + 0.01, nextPlayTime)
    source.start(startTime)
    nextPlayTime = startTime + buffer.duration
  }

  function stop() {
    stopped = true
    nextPlayTime = 0
  }

  return { enqueue, stop }
}
