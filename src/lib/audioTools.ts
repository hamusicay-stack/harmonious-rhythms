/**
 * Real client-side audio utilities for the Musician Tools Hub.
 * Pure browser APIs (Web Audio) + lazy-loaded ffmpeg.wasm for MP3 encoding.
 */

// ────────────────────────────────────────────────────────────────────
// Decode / encode
// ────────────────────────────────────────────────────────────────────

export async function decodeAudioFile(file: File | Blob): Promise<AudioBuffer> {
  const ab = await file.arrayBuffer();
  const Ctx: typeof AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(ab.slice(0));
  } finally {
    ctx.close().catch(() => {});
  }
}

/** Encode an AudioBuffer to a 16-bit PCM WAV Blob. */
export function encodeWAV(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const blockAlign = numCh * 2;
  const dataSize = samples * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));

  let off = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

// ────────────────────────────────────────────────────────────────────
// Channel + gain ops
// ────────────────────────────────────────────────────────────────────

export type MonoMode = "avg" | "left" | "right" | "sum";

export function mixToMono(buffer: AudioBuffer, mode: MonoMode = "avg"): AudioBuffer {
  const ctx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
  const out = ctx.createBuffer(1, buffer.length, buffer.sampleRate);
  const dst = out.getChannelData(0);
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
  for (let i = 0; i < buffer.length; i++) {
    if (mode === "left") dst[i] = ch0[i];
    else if (mode === "right") dst[i] = ch1[i];
    else if (mode === "sum") dst[i] = Math.max(-1, Math.min(1, ch0[i] + ch1[i]));
    else dst[i] = (ch0[i] + ch1[i]) / 2;
  }
  return out;
}

export function findPeak(buffer: AudioBuffer): number {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

/** Normalize so the peak hits `targetDbFS` (e.g. -0.3 for safe 0dB). */
export function normalizeToPeak(buffer: AudioBuffer, targetDbFS = -0.3): { buffer: AudioBuffer; peakDb: number; gain: number } {
  const peak = findPeak(buffer) || 1e-9;
  const target = Math.pow(10, targetDbFS / 20);
  const gain = target / peak;
  const out = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length,
    sampleRate: buffer.sampleRate,
  });
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < src.length; i++) {
      dst[i] = Math.max(-1, Math.min(1, src[i] * gain));
    }
  }
  return { buffer: out, peakDb: 20 * Math.log10(peak), gain };
}

// ────────────────────────────────────────────────────────────────────
// Pitch shift (real, via OfflineAudioContext + playbackRate)
//   NOTE: this changes both pitch AND tempo (no time-stretching).
//   For musician preview/transposition this is the standard quick render.
// ────────────────────────────────────────────────────────────────────

export async function pitchShift(buffer: AudioBuffer, semitones: number): Promise<AudioBuffer> {
  if (!semitones) return buffer;
  const rate = Math.pow(2, semitones / 12);
  const newLen = Math.max(1, Math.floor(buffer.length / rate));
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, newLen, buffer.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  src.connect(ctx.destination);
  src.start();
  return await ctx.startRendering();
}

// ────────────────────────────────────────────────────────────────────
// FFmpeg.wasm — lazy loaded only when the user asks for MP3 / FLAC / AAC
// ────────────────────────────────────────────────────────────────────

let ffmpegPromise: Promise<any> | null = null;
export async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

/** Run a single ffmpeg command. Returns the resulting Blob. */
export async function ffmpegTranscode(
  source: File | Blob,
  inputName: string,
  outputName: string,
  args: string[],
  outputMime: string
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");
  await ffmpeg.writeFile(inputName, await fetchFile(source));
  await ffmpeg.exec(["-i", inputName, ...args, outputName]);
  const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {}
  // copy into a fresh ArrayBuffer to satisfy strict BlobPart typing
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return new Blob([copy.buffer], { type: outputMime });
}

// ────────────────────────────────────────────────────────────────────
// Key / chord / BPM analysis using pitchfinder
// ────────────────────────────────────────────────────────────────────

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface AnalysisResult {
  key: string;
  bpm: number;
  chords: string[];
}

export async function analyzeKeyAndTempo(buffer: AudioBuffer): Promise<AnalysisResult> {
  const { YIN } = await import("pitchfinder");
  const detect = YIN({ sampleRate: buffer.sampleRate });
  const data = buffer.getChannelData(0);
  const winSize = 2048;
  const hop = winSize * 4;
  const histogram = new Array(12).fill(0);

  for (let i = 0; i + winSize < data.length; i += hop) {
    const slice = data.slice(i, i + winSize);
    const f = detect(slice);
    if (f && f > 60 && f < 2000) {
      const note = ((Math.round(12 * Math.log2(f / 440) + 69) % 12) + 12) % 12;
      histogram[note] += 1;
    }
  }

  const root = histogram.indexOf(Math.max(...histogram, 1));
  const minorThird = histogram[(root + 3) % 12] || 0;
  const majorThird = histogram[(root + 4) % 12] || 0;
  const isMinor = minorThird > majorThird;
  const key = NOTE_NAMES[root] + (isMinor ? "m" : "");

  const bpm = estimateBPM(buffer);

  const chords = isMinor
    ? [`${NOTE_NAMES[root]}m`, NOTE_NAMES[(root + 3) % 12], NOTE_NAMES[(root + 8) % 12], NOTE_NAMES[(root + 10) % 12]]
    : [NOTE_NAMES[root], NOTE_NAMES[(root + 7) % 12], `${NOTE_NAMES[(root + 9) % 12]}m`, NOTE_NAMES[(root + 5) % 12]];

  return { key, bpm, chords };
}

function estimateBPM(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const hopSize = 512;
  const energies: number[] = [];
  for (let i = 0; i + hopSize < data.length; i += hopSize) {
    let sum = 0;
    for (let j = 0; j < hopSize; j++) sum += data[i + j] * data[i + j];
    energies.push(sum);
  }
  if (energies.length < 32) return 120;
  // autocorrelation across plausible lag range (60–200 BPM)
  const minLag = Math.max(1, Math.floor((60 / 200) * (sr / hopSize)));
  const maxLag = Math.min(energies.length - 1, Math.floor((60 / 60) * (sr / hopSize)));
  let bestLag = minLag;
  let bestCorr = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i + lag < energies.length; i++) corr += energies[i] * energies[i + lag];
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  const bpm = Math.round(60 / ((bestLag * hopSize) / sr));
  return Math.max(50, Math.min(220, bpm));
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
