import { createClient } from "@deepgram/sdk";
import { env } from "../config/env";

export interface DeepgramTranscription {
  transcript: string;
  is_final: boolean;
  confidence: number;
}

export class DeepgramService {
  private static instance: DeepgramService;
  private connections: Map<string, any> = new Map();
  private deepgram: any;
  private apiKey: string;
  constructor() {
    this.apiKey =
      env.DEEPGRAM_API_KEY || "d5ce089eec813f4ad59a4570e864981365068325";
    this.deepgram = createClient(this.apiKey);
  }

  static getInstance(): DeepgramService {
    if (!DeepgramService.instance) {
      DeepgramService.instance = new DeepgramService();
    }
    return DeepgramService.instance;
  }

  async createLiveConnection(sessionId: string, language: string = "en") {
    try {
      // Create Deepgram live connection using the new SDK syntax
      const connection = await this.deepgram.listen.live({
        model: "nova-2",
        language,
        interim_results: true,
        punctuate: true,
        endpointing: true,
        vad_events: true,
        smart_format: true,
      });

      if (!connection) {
        throw new Error("Failed to create Deepgram connection");
      }

      this.connections.set(sessionId, connection);

      connection.on("open", () => {
        console.log(`Deepgram connection opened for session: ${sessionId}`);
      });

      connection.on("close", () => {
        console.log(`Deepgram connection closed for session: ${sessionId}`);
        this.connections.delete(sessionId);
      });

      connection.on("error", (error: any) => {
        console.error(`Deepgram error for session ${sessionId}:`, error);
        this.connections.delete(sessionId);
      });

      connection.on("warning", (warning: any) => {
        console.warn(`Deepgram warning for session ${sessionId}:`, warning);
      });

      return connection;
    } catch (error) {
      console.error("Error creating Deepgram connection:", error);
      throw error;
    }
  }

  async processAudioChunk(
    sessionId: string,
    audioChunk: Buffer
  ): Promise<DeepgramTranscription> {
    try {
      let connection = this.connections.get(sessionId);

      if (!connection) {
        connection = await this.createLiveConnection(sessionId);
      }

      // Send audio to Deepgram
      connection.send(audioChunk);

      // Return a promise that resolves with the transcription
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          connection.removeListener("transcriptReceived", transcriptHandler);
          resolve({ transcript: "", is_final: false, confidence: 0 });
        }, 5000);

        const transcriptHandler = (data: any) => {
          try {
            const result = JSON.parse(data);

            if (result.type === "Results") {
              const transcript =
                result.channel?.alternatives[0]?.transcript || "";
              const confidence =
                result.channel?.alternatives[0]?.confidence || 0;
              const is_final = result.is_final || false;

              if (transcript) {
                clearTimeout(timeout);
                connection.removeListener(
                  "transcriptReceived",
                  transcriptHandler
                );
                resolve({ transcript, is_final, confidence });
              }
            }
          } catch (error) {
            console.error("Error parsing Deepgram response:", error);
          }
        };

        connection.on("transcriptReceived", transcriptHandler);
      });
    } catch (error) {
      console.error("Error processing audio chunk:", error);
      throw error;
    }
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    language: string = "en"
  ): Promise<DeepgramTranscription> {
    try {
      const response = await fetch("https://api.deepgram.com/v1/listen", {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "audio/wav",
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        throw new Error(`Deepgram API error: ${response.statusText}`);
      }

      const data: any = await response.json();

      const transcript =
        data.results?.channels[0]?.alternatives[0]?.transcript || "";
      const confidence =
        data.results?.channels[0]?.alternatives[0]?.confidence || 0;

      return {
        transcript,
        is_final: true, // REST API returns final results only
        confidence,
      };
    } catch (error) {
      console.error("Error with Deepgram REST API:", error);
      throw error;
    }
  }

  closeConnection(sessionId: string) {
    const connection = this.connections.get(sessionId);
    if (connection) {
      // connection.close();
      this.connections.delete(sessionId);
    }
  }

  getConnectionStats() {
    return {
      activeConnections: this.connections.size,
      sessionIds: Array.from(this.connections.keys()),
    };
  }
}

export const deepgramService = DeepgramService.getInstance();
