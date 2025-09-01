import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

interface SocketEventCallbacks {
  [event: string]: (...args: any[]) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private eventCallbacks: SocketEventCallbacks = {};

  connect(sessionId: string): void {
    const API_BASE_URL =
      import.meta.env.VITE_API_URL || "http://localhost:3001";

    this.socket = io(API_BASE_URL, {
      auth: {
        token: localStorage.getItem("accessToken"),
      },
      transports: ["websocket", "polling"],
    });

    this.sessionId = sessionId;

    this.socket.on("connect", () => {
      console.log("Connected to server");
      this.joinSession(sessionId);
    });

    this.socket.on("disconnect", (reason: string) => {
      console.log("Disconnected from server:", reason);
    });

    this.socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
    });

    // Re-register all event callbacks on reconnect
    this.socket.on("connect", () => {
      Object.entries(this.eventCallbacks).forEach(([event, callback]) => {
        this.socket?.on(event, callback);
      });
    });
  }

  joinSession(sessionId: string): void {
    this.socket?.emit("join-session", sessionId);
  }

  leaveSession(sessionId: string): void {
    this.socket?.emit("leave-session", sessionId);
  }

  startRecording(language: string = "en"): void {
    this.socket?.emit("start-recording", {
      sessionId: this.sessionId,
      language,
    });
  }

  stopRecording(): void {
    this.socket?.emit("stop-recording", { sessionId: this.sessionId });
  }

  sendAudioChunk(
    chunk: ArrayBuffer,
    sampleRate: number,
    encoding: string = "pcm"
  ): void {
    this.socket?.emit("audio-chunk", {
      sessionId: this.sessionId,
      chunk,
      sampleRate,
      encoding,
    });
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.eventCallbacks[event] = callback;
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    delete this.eventCallbacks[event];
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  disconnect(): void {
    if (this.sessionId) {
      this.leaveSession(this.sessionId);
    }

    // Remove all listeners
    this.socket?.removeAllListeners();
    this.eventCallbacks = {};

    this.socket?.disconnect();
    this.socket = null;
    this.sessionId = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
