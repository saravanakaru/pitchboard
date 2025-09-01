import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import Session from "../models/Session";
import { env } from "../config/env";

let io: Server;

export const initSessionSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: env.frontendUrl || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Redis setup for scaling
  if (env.redisUrl) {
    const pubClient = createClient({ url: env.redisUrl });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log("Redis adapter connected for session sockets");
    });
  }

  io.on("connection", (socket) => {
    console.log("Client connected to session socket:", socket.id);

    // Join session room
    socket.on("join-session", (sessionId: string) => {
      socket.join(sessionId);
      console.log(`Client ${socket.id} joined session: ${sessionId}`);
    });

    // Leave session room
    socket.on("leave-session", (sessionId: string) => {
      socket.leave(sessionId);
      console.log(`Client ${socket.id} left session: ${sessionId}`);
    });

    // Handle real-time transcript updates
    socket.on(
      "transcript-update",
      async (data: {
        sessionId: string;
        transcript: string;
        isFinal: boolean;
        confidence: number;
      }) => {
        try {
          // Save to Redis for real-time access
          const redisClient = createClient({ url: env.redisUrl });
          await redisClient.connect();

          await redisClient.rPush(
            `session:${data.sessionId}:transcripts`,
            JSON.stringify({
              text: data.transcript,
              timestamp: new Date().toISOString(),
              isFinal: data.isFinal,
              confidence: data.confidence,
            })
          );

          await redisClient.expire(
            `session:${data.sessionId}:transcripts`,
            3600
          ); // 1 hour expiry
          await redisClient.disconnect();

          // Broadcast to all clients in the session
          socket.to(data.sessionId).emit("transcript-update", data);
        } catch (error) {
          console.error("Error handling transcript update:", error);
        }
      }
    );

    // Get session transcripts from Redis
    socket.on("get-transcripts", async (sessionId: string) => {
      try {
        const redisClient = createClient({ url: env.redisUrl });
        await redisClient.connect();

        const transcripts = await redisClient.lRange(
          `session:${sessionId}:transcripts`,
          0,
          -1
        );
        const parsedTranscripts = transcripts.map((t) => JSON.parse(t));

        await redisClient.disconnect();

        socket.emit("transcripts-data", {
          sessionId,
          transcripts: parsedTranscripts,
        });
      } catch (error) {
        console.error("Error fetching transcripts:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected from session socket:", socket.id);
    });
  });

  return io;
};

export const getSessionIO = () => {
  if (!io) {
    throw new Error("Session socket not initialized");
  }
  return io;
};
