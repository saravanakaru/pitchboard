import { config } from "dotenv";
import path from "path";

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";
config({ path: path.resolve(process.cwd(), envFile) });

// Fallback to .env if specific environment file doesn't exist
if (process.env.NODE_ENV !== "production") {
  config({ path: path.resolve(process.cwd(), ".env") });
}

// Validate required environment variables
const requiredEnvVars = [
  "JWT_SECRET",
  "MONGODB_URI",
  "POSTGRES_URL",
  "REDIS_URL",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

// Export environment variables with defaults
export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET!,
  mongodbUri: process.env.MONGODB_URI!,
  postgresUrl: process.env.POSTGRES_URL!,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  DEEPGRAM_API_KEY:
    process.env.DEEPGRAM_API_KEY || "d5ce089eec813f4ad59a4570e864981365068325",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment:
    process.env.NODE_ENV === "development" || !process.env.NODE_ENV,
};
