export class AudioUtils {
  static validateAudioChunk(
    chunk: ArrayBuffer,
    expectedSampleRate: number = 16000
  ): boolean {
    // Basic validation for audio chunks
    if (!chunk || chunk.byteLength === 0) {
      return false;
    }

    // Check if chunk size is reasonable (e.g., 1-10KB per chunk)
    if (chunk.byteLength > 10240) {
      console.warn("Audio chunk size seems too large:", chunk.byteLength);
    }

    return true;
  }

  static convertSampleRate(
    audioData: Float32Array,
    originalRate: number,
    targetRate: number
  ): Float32Array {
    if (originalRate === targetRate) {
      return audioData;
    }

    const ratio = originalRate / targetRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const index = Math.round(i * ratio);
      result[i] = audioData[index];
    }

    return result;
  }

  static encodePCM(audioData: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(audioData.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(
        i * 2,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
    }

    return buffer;
  }

  static calculateRMS(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }
}
