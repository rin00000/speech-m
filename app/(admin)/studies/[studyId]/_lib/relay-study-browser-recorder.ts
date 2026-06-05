/**
 * 브라우저 마이크 입력을 릴레이 제출용 WAV 파일로 변환하는 클라이언트 helper.
 * Storage 정책을 바꾸지 않고 기존 wav 업로드 파이프라인을 재사용한다.
 */

const BUFFER_SIZE = 4096;
const TARGET_SAMPLE_RATE = 24000;
const WAV_CHANNEL_COUNT = 1;
const WAV_BITS_PER_SAMPLE = 16;

type AudioContextWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export type StudyAudioRecorder = {
  startedAt: number;
  stop: () => Promise<File>;
  cancel: () => void;
};

export async function createStudyAudioRecorder(): Promise<StudyAudioRecorder> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("unsupported_recorder");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: true,
      channelCount: WAV_CHANNEL_COUNT,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
  const AudioContextCtor =
    window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext;

  if (!AudioContextCtor) {
    stopStream(stream);
    throw new Error("unsupported_recorder");
  }

  const audioContext = new AudioContextCtor();
  await audioContext.resume();

  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(
    BUFFER_SIZE,
    WAV_CHANNEL_COUNT,
    WAV_CHANNEL_COUNT,
  );
  const mute = audioContext.createGain();
  const chunks: Float32Array[] = [];
  let isClosed = false;

  mute.gain.value = 0;
  processor.onaudioprocess = (event) => {
    if (isClosed) return;
    const input = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(input));
  };

  source.connect(processor);
  processor.connect(mute);
  mute.connect(audioContext.destination);

  const cleanup = async () => {
    if (isClosed) return;
    isClosed = true;
    processor.onaudioprocess = null;
    processor.disconnect();
    source.disconnect();
    mute.disconnect();
    stopStream(stream);

    if (audioContext.state !== "closed") {
      await audioContext.close();
    }
  };

  return {
    startedAt: Date.now(),
    stop: async () => {
      const sourceSampleRate = audioContext.sampleRate;
      await cleanup();

      if (chunks.length === 0) {
        throw new Error("empty_recording");
      }

      const samples = mergeFloat32Arrays(chunks);
      const targetSampleRate = Math.min(TARGET_SAMPLE_RATE, sourceSampleRate);
      const wavSamples = downsamplePcm(samples, sourceSampleRate, targetSampleRate);
      const wavBlob = createWavBlob(wavSamples, targetSampleRate);

      return new File([wavBlob], `speech-m-recording-${formatTimestamp(new Date())}.wav`, {
        lastModified: Date.now(),
        type: "audio/wav",
      });
    },
    cancel: () => {
      void cleanup().catch(() => undefined);
    },
  };
}

export function getStudyAudioRecorderErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "마이크 권한을 허용해야 바로 녹음할 수 있습니다.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "사용 가능한 마이크를 찾을 수 없습니다.";
    }
  }

  if (error instanceof Error && error.message === "unsupported_recorder") {
    return "이 브라우저에서는 바로 녹음을 사용할 수 없습니다.";
  }

  return "녹음을 시작하지 못했습니다.";
}

function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

function mergeFloat32Arrays(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });

  return merged;
}

function downsamplePcm(
  samples: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number,
) {
  if (targetSampleRate >= sourceSampleRate) return samples;

  const ratio = sourceSampleRate / targetSampleRate;
  const targetLength = Math.max(1, Math.round(samples.length / ratio));
  const result = new Float32Array(targetLength);
  let sourceOffset = 0;

  for (let targetIndex = 0; targetIndex < targetLength; targetIndex += 1) {
    const nextSourceOffset = Math.min(samples.length, Math.round((targetIndex + 1) * ratio));
    let sum = 0;
    let count = 0;

    for (let index = sourceOffset; index < nextSourceOffset; index += 1) {
      sum += samples[index] ?? 0;
      count += 1;
    }

    result[targetIndex] = count > 0 ? sum / count : 0;
    sourceOffset = nextSourceOffset;
  }

  return result;
}

function createWavBlob(samples: Float32Array, sampleRate: number) {
  const bytesPerSample = WAV_BITS_PER_SAMPLE / 8;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, WAV_CHANNEL_COUNT, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * WAV_CHANNEL_COUNT * bytesPerSample, true);
  view.setUint16(32, WAV_CHANNEL_COUNT * bytesPerSample, true);
  view.setUint16(34, WAV_BITS_PER_SAMPLE, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  samples.forEach((sample) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, pcm, true);
    offset += bytesPerSample;
  });

  return new Blob([view], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function formatTimestamp(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return `${year}${month}${day}-${hour}${minute}${second}`;
}
