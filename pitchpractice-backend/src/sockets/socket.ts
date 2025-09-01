import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import {
  speechToText,
  closeSTTConnection,
  initializeSTTConnection,
} from "../services/sttService";
import { analyzeSession } from "../services/scoringService";
import Session from "../models/Session";
import { deepgramService } from "../services/deepgramService";
import { AudioUtils } from "../utils/audioUtils";

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    maxHttpBufferSize: 1e8, // 100MB for large audio chunks
  });

  // Setup Redis adapter for scaling
  let redisAdapter: any;
  if (process.env.REDIS_URL) {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        redisAdapter = createAdapter(pubClient, subClient);
        io.adapter(redisAdapter);
        console.log("Redis adapter connected");
      })
      .catch((error) => {
        console.warn(
          "Redis connection failed, using default adapter:",
          error.message
        );
      });
  }

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Track active sessions for this socket
    const activeSessions = new Set<string>();

    // Join a session room
    socket.on("join-session", (sessionId: string) => {
      socket.join(sessionId);
      activeSessions.add(sessionId);
      console.log(`User ${socket.id} joined session: ${sessionId}`);

      // Send current connection status
      const stats = deepgramService.getConnectionStats();
      const isConnected = stats.sessionIds.includes(sessionId);

      socket.emit("connection-status", {
        sessionId,
        isConnected,
        stats,
      });
    });

    // Leave a session room
    socket.on("leave-session", (sessionId: string) => {
      socket.leave(sessionId);
      activeSessions.delete(sessionId);
      console.log(`User ${socket.id} left session: ${sessionId}`);
    });

    // Handle audio chunks
    socket.on(
      "audio-chunk",
      async (data: {
        sessionId: string;
        chunk: ArrayBuffer;
        sampleRate: number;
        encoding: string;
      }) => {
        try {
          const { sessionId, chunk, sampleRate, encoding } = data;

          // Validate audio chunk
          if (!AudioUtils.validateAudioChunk(chunk, sampleRate)) {
            socket.emit("audio-error", {
              sessionId,
              error: "Invalid audio chunk",
              message: "Audio data is invalid or corrupted",
            });
            return;
          }

          // Process audio with Deepgram
          const transcription = await speechToText(sessionId, chunk);
          if (!transcription) return;
          // Update session transcript in database
          if (
            transcription.transcript &&
            transcription.transcript.trim().length > 0
          ) {
            try {
              console.log("Transcript: ", transcription.transcript);
              // await Session.findByIdAndUpdate(
              //   sessionId,
              //   {
              //     $push: {
              //       transcript: {
              //         text: transcription.transcript,
              //         timestamp: new Date(),
              //         isFinal: transcription.is_final,
              //         confidence: transcription.confidence,
              //       },
              //     },
              //     $set: {
              //       sampleRate: sampleRate,
              //       audioFormat: encoding,
              //       updatedAt: new Date(),
              //     },
              //   },
              //   { new: true, upsert: false }
              // );
            } catch (dbError) {
              console.error("Database update error:", dbError);
              // Continue with real-time updates even if DB fails
            }
          }

          // Broadcast transcript to all clients in the session
          if (transcription.transcript) {
            socket.to(sessionId).emit("transcript-update", {
              sessionId,
              transcript: transcription.transcript,
              isFinal: transcription.is_final,
              confidence: transcription.confidence,
              timestamp: new Date().toISOString(),
            });

            // Also send to sender for immediate feedback
            socket.emit("transcript-update", {
              sessionId,
              transcript: transcription.transcript,
              isFinal: transcription.is_final,
              confidence: transcription.confidence,
              timestamp: new Date().toISOString(),
            });
          }

          // Analyze for real-time feedback (only on final transcripts with good confidence)
          if (
            transcription.is_final &&
            transcription.confidence > 0.6 &&
            transcription.transcript.trim().length > 3
          ) {
            try {
              const feedback = await analyzeSession(transcription.transcript);
              socket.emit("feedback-update", {
                sessionId,
                feedback,
                timestamp: new Date().toISOString(),
              });

              // Also update session with feedback if it's substantial
              // if (feedback.overallScore > 0) {
              //   await Session.findByIdAndUpdate(
              //     sessionId,
              //     {
              //       $set: {
              //         feedbackMetrics: feedback.metrics,
              //         overallScore: feedback.overallScore,
              //         updatedAt: new Date(),
              //       },
              //     },
              //     { new: true }
              //   );
              // }
            } catch (feedbackError) {
              console.error("Feedback analysis error:", feedbackError);
              // Don't fail the whole process if feedback analysis fails
            }
          }

          // Send acknowledgment back to sender
          socket.emit("audio-processed", {
            sessionId,
            chunkSize: chunk.byteLength,
            processedAt: new Date().toISOString(),
            success: true,
          });
        } catch (error: any) {
          console.error("Error processing audio chunk:", error);
          socket.emit("audio-error", {
            sessionId: data.sessionId,
            error: "Failed to process audio",
            message: error.message,
          });
        }
      }
    );

    // Start recording session
    socket.on(
      "start-recording",
      async (data: { sessionId: string; language: string }) => {
        try {
          const { sessionId, language } = data;

          // Initialize Deepgram connection for this session
          const success = await initializeSTTConnection(sessionId, language);

          if (success) {
            socket.emit("recording-started", {
              sessionId,
              message: "Recording started successfully",
            });

            // Notify all participants in the session
            socket.to(sessionId).emit("recording-status", {
              sessionId,
              recording: true,
              message: "Recording started",
            });
          } else {
            socket.emit("recording-error", {
              sessionId,
              error: "Failed to initialize speech recognition",
            });
          }
        } catch (error: any) {
          console.error("Error starting recording:", error);
          socket.emit("recording-error", {
            sessionId: data.sessionId,
            error: error.message,
          });
        }
      }
    );

    // Stop recording and close connection
    socket.on("stop-recording", async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        closeSTTConnection(sessionId);

        socket.emit("recording-stopped", {
          sessionId,
          message: "Recording stopped successfully",
        });

        // Notify all participants in the session
        socket.to(sessionId).emit("recording-status", {
          sessionId,
          recording: false,
          message: "Recording stopped",
        });
      } catch (error: any) {
        console.error("Error stopping recording:", error);
        socket.emit("recording-error", {
          sessionId: data.sessionId,
          error: error.message,
        });
      }
    });

    // Pause recording
    socket.on("pause-recording", (data: { sessionId: string }) => {
      const { sessionId } = data;

      socket.emit("recording-paused", {
        sessionId,
        message: "Recording paused",
      });

      socket.to(sessionId).emit("recording-status", {
        sessionId,
        recording: false,
        paused: true,
        message: "Recording paused",
      });
    });

    // Resume recording
    socket.on("resume-recording", async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;

        socket.emit("recording-resumed", {
          sessionId,
          message: "Recording resumed",
        });

        socket.to(sessionId).emit("recording-status", {
          sessionId,
          recording: true,
          paused: false,
          message: "Recording resumed",
        });
      } catch (error: any) {
        console.error("Error resuming recording:", error);
        socket.emit("recording-error", {
          sessionId: data.sessionId,
          error: error.message,
        });
      }
    });

    // Get connection status
    socket.on("get-connection-status", (data: { sessionId: string }) => {
      const { sessionId } = data;
      const stats = deepgramService.getConnectionStats();
      const isConnected = stats.sessionIds.includes(sessionId);

      socket.emit("connection-status", {
        sessionId,
        isConnected,
        activeConnections: stats.activeConnections,
        timestamp: new Date().toISOString(),
      });
    });

    // Get session transcript history
    socket.on("get-transcript", async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        const session = await Session.findById(sessionId)
          .select("transcript scenario startedAt")
          .lean();

        if (!session) {
          socket.emit("transcript-error", {
            sessionId,
            error: "Session not found",
          });
          return;
        }

        socket.emit("transcript-history", {
          sessionId,
          transcript: session.transcript || [],
          scenario: session.scenario,
          startedAt: session.startedAt,
        });
      } catch (error) {
        console.error("Error fetching transcript:", error);
        socket.emit("transcript-error", {
          sessionId: data.sessionId,
          error: "Failed to fetch transcript",
        });
      }
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, reason);

      // Clean up any Deepgram connections for this socket's sessions
      activeSessions.forEach((sessionId) => {
        closeSTTConnection(sessionId);

        // Notify other participants in the session
        socket.to(sessionId).emit("participant-left", {
          sessionId,
          participantId: socket.id,
          message: "Participant left the session",
        });
      });

      activeSessions.clear();
    });

    // Error handling
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    // Heartbeat/ping
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });
  });

  // Handle server-wide errors
  io.on("error", (error) => {
    console.error("Socket.IO server error:", error);
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

// Graceful shutdown handler
export const gracefulShutdown = () => {
  if (io) {
    console.log("Closing Socket.IO server...");
    io.close(() => {
      console.log("Socket.IO server closed");
      process.exit(0);
    });

    // Force close after 5 seconds
    setTimeout(() => {
      console.log("Forcing Socket.IO server closure");
      process.exit(1);
    }, 5000);
  }
};

// Handle process signals
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
