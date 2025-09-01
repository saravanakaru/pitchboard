import { api } from "./api";

export interface TranscriptChunk {
  text: string;
  timestamp: Date;
  isFinal: boolean;
  confidence: number;
  speaker?: string; // For future multi-speaker support
}

export interface FormattedTranscript {
  text: string;
  timestamp: string;
  time: Date;
  isFinal: boolean;
  confidence: number;
  speaker?: string;
}

export interface SessionInfo {
  sessionId: string;
  scenario: string;
  status: string;
}

export class TranscriptionService {
  private static instance: TranscriptionService;
  private currentSessionId: string | null = null;
  private transcriptChunks: TranscriptChunk[] = [];

  static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  // Create a new session
  async createSession(
    scenario: string,
    language: string = "en"
  ): Promise<SessionInfo> {
    if (this.currentSessionId) {
      // Clear existing session if any
      this.clearSession();
    }

    try {
      const response = await api.post("/sessions/create", {
        scenario,
        language,
      });

      this.currentSessionId = response.data.sessionId;
      this.transcriptChunks = [];

      return response.data;
    } catch (error) {
      console.error("Failed to create session:", error);
      throw error;
    }
  }

  // Send transcript chunks to backend
  async sendTranscriptChunks(chunks: TranscriptChunk[]): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error("No active session");
    }

    try {
      await api.post(`/sessions/${this.currentSessionId}/transcript`, {
        transcriptChunks: chunks,
      });

      // Remove sent chunks from local buffer
      this.transcriptChunks = this.transcriptChunks.filter(
        (chunk) => !chunks.includes(chunk)
      );
    } catch (error) {
      console.error("Failed to send transcript chunks:", error);
      // Keep chunks in buffer for retry
    }
  }

  // Send single transcript chunk to backend
  async sendTranscriptChunk(chunk: TranscriptChunk): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error("No active session. Please create a session first.");
    }

    try {
      await api.post(`/sessions/${this.currentSessionId}/transcript`, {
        transcriptChunks: [chunk],
      });

      this.transcriptChunks = this.transcriptChunks.filter((c) => c !== chunk);
    } catch (error) {
      console.error("Failed to send transcript chunk:", error);
      // Keep chunk in buffer for retry
      this.transcriptChunks.push(chunk);
    }
  }

  // Add chunk to local buffer and optionally send immediately
  async addChunk(
    chunk: TranscriptChunk,
    sendImmediately: boolean = true
  ): Promise<void> {
    this.transcriptChunks.push(chunk);

    if (sendImmediately) {
      await this.sendTranscriptChunk(chunk);
    }
  }

  // Send all buffered chunks
  async sendAllChunks(): Promise<void> {
    if (this.transcriptChunks.length === 0) {
      return;
    }

    try {
      await this.sendTranscriptChunks([...this.transcriptChunks]);
      this.transcriptChunks = [];
    } catch (error) {
      console.error("Failed to send all chunks:", error);
    }
  }

  // Complete the session with final transcript
  async completeSession(
    finalTranscript: string,
    duration: number,
    feedbackMetrics: any[]
  ): Promise<any> {
    if (!this.currentSessionId) {
      throw new Error("No active session");
    }

    try {
      // First send any remaining chunks
      await this.sendAllChunks();

      const response = await api.post(
        `/sessions/${this.currentSessionId}/complete`,
        {
          finalTranscript,
          duration,
          feedbackMetrics,
        }
      );

      this.currentSessionId = null;
      this.transcriptChunks = [];

      return response.data;
    } catch (error) {
      console.error("Failed to complete session:", error);
      throw error;
    }
  }

  // Get session details
  async getSession(sessionId: string): Promise<any> {
    try {
      const response = await api.get(`/sessions/${sessionId}/details`);
      return response.data;
    } catch (error) {
      console.error("Failed to get session:", error);
      throw error;
    }
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // Get buffered chunks count
  getBufferedChunksCount(): number {
    return this.transcriptChunks.length;
  }

  // Clear current session and buffer
  clearSession(): void {
    this.currentSessionId = null;
    this.transcriptChunks = [];
  }
  hasActiveSession(): boolean {
    return this.currentSessionId !== null;
  }

  getCurrentSessionInfo(): SessionInfo | null {
    if (!this.currentSessionId) {
      return null;
    }

    return {
      sessionId: this.currentSessionId,
      scenario: "Active Session", // You might want to store this separately
      status: "active",
    };
  }
}

export const transcriptionService = TranscriptionService.getInstance();
