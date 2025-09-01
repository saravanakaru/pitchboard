// Load environment variables first
import "./config/env";
import app, { expressApp } from "./app";
import { createServer } from "http";
import { initSocket } from "./sockets/socket";
import { connectDB, connectPostgreSQL } from "./config/database";
import { connectRedis } from "./config/redis";
import { env } from "./config/env";
import swaggerDocs from "./config/swagger";

const PORT = env.port;

async function bootstrap() {
  try {
    console.log("Starting server with environment:", env.nodeEnv);

    // Initialize database connections
    await connectDB();
    await connectPostgreSQL();
    await connectRedis();

    const server = createServer(expressApp);

    // Initialize Swagger documentation
    swaggerDocs(expressApp, PORT);

    // Initialize Socket.IO
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${env.nodeEnv}`);
      console.log(`MongoDB: ${env.mongodbUri}`);
      console.log(`PostgreSQL: ${env.postgresUrl}`);
      console.log(`Redis: ${env.redisUrl}`);
      console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
