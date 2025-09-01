import { env } from "../config/env";

export interface DeepgramTranscription {
  transcript: string;
  is_final: boolean;
  confidence: number;
}

export class DeepgramRestService {
  private static instance: DeepgramRestService;
  private apiKey: string;

  constructor() {
    this.apiKey = env.DEEPGRAM_API_KEY || "your-deepgram-api-key";
    if (!this.apiKey || this.apiKey === "your-deepgram-api-key") {
      throw new Error("Deepgram API key is not configured");
    }
  }

  static getInstance(): DeepgramRestService {
    if (!DeepgramRestService.instance) {
      DeepgramRestService.instance = new DeepgramRestService();
    }
    return DeepgramRestService.instance;
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    sampleRate: number = 16000,
    language: string = "en"
  ): Promise<DeepgramTranscription> {
    try {
      // Convert PCM buffer to WAV format
      const wavBuffer = this.pcmToWav(audioBuffer, sampleRate);

      const response = await fetch("https://api.deepgram.com/v1/listen", {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "audio/wav",
        },
        body: wavBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Deepgram API error response:", errorText);
        throw new Error(
          `Deepgram API error: ${response.status} - ${response.statusText}`
        );
      }

      const data: any = await response.json();

      // Debug: log the full response to understand the structure
      // console.log("Deepgram response:", JSON.stringify(data, null, 2));

      const transcript =
        data.results?.channels[0]?.alternatives[0]?.transcript || "";
      const confidence =
        data.results?.channels[0]?.alternatives[0]?.confidence || 0;

      return {
        transcript,
        is_final: true,
        confidence,
      };
    } catch (error) {
      console.error("Error with Deepgram REST API:", error);
      throw error;
    }
  }

  // Convert PCM buffer to WAV format
  private pcmToWav(pcmBuffer: Buffer, sampleRate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + pcmBuffer.length);
    const view = new DataView(buffer);

    // Write WAV header
    this.writeString(view, 0, "RIFF"); // RIFF header
    view.setUint32(4, 36 + pcmBuffer.length, true); // RIFF chunk size
    this.writeString(view, 8, "WAVE"); // WAVE header
    this.writeString(view, 12, "fmt "); // format chunk identifier
    view.setUint32(16, 16, true); // format chunk length
    view.setUint16(20, 1, true); // sample format (1 = PCM)
    view.setUint16(22, 1, true); // channel count
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate (sample rate * block align)
    view.setUint16(32, 2, true); // block align (channel count * bytes per sample)
    view.setUint16(34, 16, true); // bits per sample
    this.writeString(view, 36, "data"); // data chunk identifier
    view.setUint32(40, pcmBuffer.length, true); // data chunk length

    // Write PCM data
    const pcmData = new Int16Array(
      pcmBuffer.buffer,
      pcmBuffer.byteOffset,
      pcmBuffer.length / 2
    );
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // Alternative: Use with query parameters for more control
  async transcribeAudioWithParams(
    audioBuffer: Buffer,
    sampleRate: number = 16000,
    language: string = "en"
  ): Promise<DeepgramTranscription> {
    try {
      const wavBuffer = this.pcmToWav(audioBuffer, sampleRate);

      const url = new URL("https://api.deepgram.com/v1/listen");
      url.searchParams.append("model", "nova-2");
      url.searchParams.append("language", language);
      url.searchParams.append("smart_format", "true");
      url.searchParams.append("punctuate", "true");

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "audio/wav",
        },
        body: wavBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Deepgram API error: ${response.status} - ${errorText}`
        );
      }

      const data: any = await response.json();

      const transcript =
        data.results?.channels[0]?.alternatives[0]?.transcript || "";
      const confidence =
        data.results?.channels[0]?.alternatives[0]?.confidence || 0;

      return {
        transcript,
        is_final: true,
        confidence,
      };
    } catch (error) {
      console.error("Error with Deepgram REST API:", error);
      throw error;
    }
  }
}

export const deepgramRestService = DeepgramRestService.getInstance();
