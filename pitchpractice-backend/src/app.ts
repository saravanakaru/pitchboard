import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import sessionRoutes from "./routes/sessions";
import dashboardRoutes from "./routes/dashboard";
import { authenticateToken } from "./middleware/auth";
import { env } from "./config/env";
import swaggerDocs from "./config/swagger";

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 100 : 1000,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(env.isProduction ? "combined" : "dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/sessions", authenticateToken, sessionRoutes);
app.use("/api/dashboard", authenticateToken, dashboardRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// Error handling
app.use(errorHandler);

export default app;

// Export app for server.ts to initialize swagger
export { app as expressApp };
