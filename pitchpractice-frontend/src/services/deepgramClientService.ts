import { transcriptionService } from "./transcriptionService";

export interface DeepgramResponse {
  channel?: {
    alternatives: Array<{
      transcript: string;
      confidence?: number;
      words?: any[];
    }>;
  };
  is_final?: boolean;
  speech_final?: boolean;
  type?: string;
}

export class DeepgramClientService {
  private static instance: DeepgramClientService;
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private sessionId: string | null = null;
  private isTranscribing: boolean = false;
  private lastFinalTranscript: string = "";
  private interimTranscriptBuffer: string = "";
  private lastProcessedTime: number = 0;

  static getInstance(): DeepgramClientService {
    if (!DeepgramClientService.instance) {
      DeepgramClientService.instance = new DeepgramClientService();
    }
    return DeepgramClientService.instance;
  }

  async startTranscription(sessionId: string, apiKey: string): Promise<void> {
    if (this.isTranscribing) {
      throw new Error("Transcription already in progress");
    }

    this.sessionId = sessionId;
    this.isTranscribing = true;
    this.lastFinalTranscript = "";
    this.interimTranscriptBuffer = "";
    this.lastProcessedTime = Date.now();

    try {
      // Get user media
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm",
        audioBitsPerSecond: 128000,
      });

      // Create Deepgram WebSocket connection with optimized parameters
      const deepgramUrl = new URL("wss://api.deepgram.com/v1/listen");

      // Add optimized parameters to reduce duplicates
      const params = {
        model: "nova-2",
        language: "en",
        punctuate: "true",
        smart_format: "true",
        interim_results: "true",
        endpointing: "500", // 500ms of silence to endpoint
        vad_events: "true",
        vad_threshold: "0.5", // Voice activity detection threshold
        utterance_end_ms: "2500", // End utterance after 1s of silence
        no_delay: "false", // Allow some buffering for better accuracy
        filler_words: "false", // Try to filter out filler words
      };

      Object.entries(params).forEach(([key, value]) => {
        deepgramUrl.searchParams.append(key, value);
      });

      this.socket = new WebSocket(deepgramUrl.toString(), ["token", apiKey]);

      this.socket.onopen = () => {
        console.log("Deepgram WebSocket connection opened");
        this.mediaRecorder?.start(250); // Send chunks every 250ms
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.handleDeepgramMessage(event.data);
      };

      this.socket.onerror = (error) => {
        console.error("Deepgram WebSocket error:", error);
        this.stopTranscription();
      };

      this.socket.onclose = () => {
        console.log("Deepgram WebSocket connection closed");
        this.isTranscribing = false;
      };

      // Handle audio data
      this.mediaRecorder.addEventListener(
        "dataavailable",
        (event: BlobEvent) => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(event.data);
          }
        }
      );

      this.mediaRecorder.addEventListener("stop", () => {
        this.cleanup();
      });
    } catch (error) {
      console.error("Failed to start transcription:", error);
      this.cleanup();
      throw error;
    }
  }

  private handleDeepgramMessage(data: string): void {
    try {
      const message: DeepgramResponse = JSON.parse(data);

      // Only process Results messages
      if (message.type !== "Results") {
        return;
      }

      const transcript = message.channel?.alternatives[0]?.transcript || "";
      const isFinal = message.is_final || false;
      const confidence = message.channel?.alternatives[0]?.confidence || 0;
      const currentTime = Date.now();

      // Filter out low-quality transcripts
      if (!this.isValidTranscript(transcript, confidence, isFinal)) {
        return;
      }

      // Deduplication logic
      if (isFinal) {
        this.processFinalTranscript(transcript, confidence, currentTime);
      } else {
        this.processInterimTranscript(transcript, confidence, currentTime);
      }
    } catch (error) {
      console.error("Error parsing Deepgram message:", error);
    }
  }

  private processFinalTranscript(
    transcript: string,
    confidence: number,
    currentTime: number
  ): void {
    const cleanedTranscript = this.cleanTranscript(transcript);

    // Check if this is a duplicate of the last final transcript
    if (this.isDuplicateFinalTranscript(cleanedTranscript, currentTime)) {
      return;
    }

    this.lastFinalTranscript = cleanedTranscript;
    this.interimTranscriptBuffer = ""; // Clear interim buffer
    this.lastProcessedTime = currentTime;

    this.sendTranscriptToBackend(cleanedTranscript, true, confidence);
    this.emitTranscriptUpdate(cleanedTranscript, true, confidence);
  }

  private processInterimTranscript(
    transcript: string,
    confidence: number,
    currentTime: number
  ): void {
    const cleanedTranscript = this.cleanTranscript(transcript);

    // Only send interim results if they're significantly different
    // and enough time has passed since the last update
    if (this.shouldSendInterimUpdate(cleanedTranscript, currentTime)) {
      this.interimTranscriptBuffer = cleanedTranscript;
      this.lastProcessedTime = currentTime;

      this.emitTranscriptUpdate(cleanedTranscript, false, confidence);
    }
  }

  private isDuplicateFinalTranscript(
    transcript: string,
    currentTime: number
  ): boolean {
    // Check if this is very similar to the last final transcript
    const similarity = this.calculateSimilarity(
      transcript,
      this.lastFinalTranscript
    );

    // If very similar and within a short time window, consider it a duplicate
    return similarity > 0.8 && currentTime - this.lastProcessedTime < 2000;
  }

  private shouldSendInterimUpdate(
    transcript: string,
    currentTime: number
  ): boolean {
    // Don't send interim updates too frequently
    if (currentTime - this.lastProcessedTime < 300) {
      return false;
    }

    // Check if this interim is significantly different from current buffer
    const similarity = this.calculateSimilarity(
      transcript,
      this.interimTranscriptBuffer
    );
    return similarity < 0.7; // Only send if significantly different
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter((word) => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  private isValidTranscript(
    transcript: string,
    confidence: number,
    isFinal: boolean
  ): boolean {
    // Filter out empty transcripts
    if (!transcript.trim()) return false;

    // Different thresholds for final vs interim
    if (isFinal) {
      return confidence >= 0.5 && transcript.trim().length >= 2;
    } else {
      return confidence >= 0.3 && transcript.trim().length >= 3;
    }
  }

  private cleanTranscript(transcript: string): string {
    // Remove extra whitespace
    let cleaned = transcript.replace(/\s+/g, " ").trim();

    // Remove trailing commas and incomplete words
    cleaned = cleaned.replace(/,\s*$/, "").replace(/\w+\.\.\.$/, "");

    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    // Add punctuation for final transcripts
    if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
      cleaned += ".";
    }

    return cleaned;
  }

  private async sendTranscriptToBackend(
    transcript: string,
    isFinal: boolean,
    confidence: number
  ): Promise<void> {
    if (!this.sessionId) return;

    try {
      await transcriptionService.sendTranscriptChunk({
        text: transcript,
        timestamp: new Date(),
        isFinal,
        confidence,
      });
    } catch (error) {
      console.error("Failed to send transcript to backend:", error);
    }
  }

  private emitTranscriptUpdate(
    transcript: string,
    isFinal: boolean,
    confidence: number
  ): void {
    const event = new CustomEvent("transcriptUpdate", {
      detail: { transcript, isFinal, confidence },
    });
    window.dispatchEvent(event);
  }

  stopTranscription(): void {
    if (this.mediaRecorder && this.isTranscribing) {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.removeEventListener("dataavailable", () => {});
      this.mediaRecorder.removeEventListener("stop", () => {});
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }

    if (this.socket) {
      this.socket.close();
    }

    this.socket = null;
    this.mediaRecorder = null;
    this.stream = null;
    this.isTranscribing = false;
    this.sessionId = null;
    this.lastFinalTranscript = "";
    this.interimTranscriptBuffer = "";
  }

  getIsTranscribing(): boolean {
    return this.isTranscribing;
  }
}

export const deepgramClientService = DeepgramClientService.getInstance();
