import express, { Request, Response } from "express";
import Session from "../models/Session";
import { asyncHandler, createError } from "../middleware/errorHandler";
import { AuthRequest, authenticateToken } from "../middleware/auth";
const router = express.Router();

// Start a new session
/**
 * @swagger
 * /api/sessions/start:
 *   post:
 *     summary: Start a new coaching session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scenario
 *             properties:
 *               scenario:
 *                 type: string
 *                 description: The scenario/topic for the session
 *     responses:
 *       200:
 *         description: Session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/start",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { scenario } = req.body;

    if (!scenario) {
      throw createError("Scenario is required", 400);
    }

    const session = new Session({
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
      scenario,
      status: "in-progress",
    });

    await session.save();
    res.json({ sessionId: session._id });
  })
);

// Complete a session
/**
 * @swagger
 * /api/sessions/{id}/complete:
 *   post:
 *     summary: Complete a session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
// Complete session with final analysis
router.post(
  "/:id/complete",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { finalTranscript, duration, feedbackMetrics } = req.body;

    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });

    if (!session) {
      throw createError("Session not found", 404);
    }

    session.transcript.push({
      text: finalTranscript,
      timestamp: new Date(),
      isFinal: true,
      confidence: 0.9, // High confidence for final transcript
    });

    session.duration = duration;
    session.feedbackMetrics = feedbackMetrics || [];
    session.overallScore = calculateOverallScore(feedbackMetrics);
    session.status = "completed";
    session.completedAt = new Date();

    await session.save();

    res.json(session);
  })
);

// Get session details
/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     summary: Get session details
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
// Get session details
router.get(
  "/:id/details",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    }).populate("userId", "firstName lastName email");

    if (!session) {
      throw createError("Session not found", 404);
    }

    res.json(session);
  })
);

// Helper function to calculate overall score
const calculateOverallScore = (metrics: any[] = []): number => {
  if (!metrics.length) return 0;
  const total = metrics.reduce((sum, metric) => sum + (metric.score || 0), 0);
  return Math.round(total / metrics.length);
};

// Create a new session
router.post(
  "/create",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { scenario, language = "en" } = req.body;

    if (!scenario) {
      throw createError("Scenario is required", 400);
    }

    const session = new Session({
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
      scenario,
      language,
      status: "ready",
      transcript: [],
    });

    await session.save();

    res.status(201).json({
      sessionId: session._id,
      scenario: session.scenario,
      status: session.status,
    });
  })
);

// Update session with transcript
router.post(
  "/:id/transcript",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { transcriptChunks } = req.body;

    if (!transcriptChunks || !Array.isArray(transcriptChunks)) {
      throw createError("Transcript chunks array is required", 400);
    }

    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });

    if (!session) {
      throw createError("Session not found", 404);
    }

    // Add new transcript chunks
    transcriptChunks.forEach((chunk: any) => {
      session.transcript.push({
        text: chunk.text,
        timestamp: new Date(chunk.timestamp),
        isFinal: chunk.isFinal || false,
        confidence: chunk.confidence || 0,
      });
    });

    await session.save();

    res.json({
      success: true,
      transcriptLength: session.transcript.length,
    });
  })
);

/**
 * @swagger
 * /api/sessions/analytics:
 *   get:
 *     summary: Get analytics data for sessions
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 90days, all]
 *         description: Time range for analytics
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Specific user ID for filtering (admin only)
 *     responses:
 *       200:
 *         description: Analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     totalSessions:
 *                       type: number
 *                     averageScore:
 *                       type: number
 *                     averageDuration:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/analytics",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { timeRange = "30days", userId } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (timeRange) {
      case "7days":
        dateFilter = {
          createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) },
        };
        break;
      case "30days":
        dateFilter = {
          createdAt: { $gte: new Date(now.setDate(now.getDate() - 30)) },
        };
        break;
      case "90days":
        dateFilter = {
          createdAt: { $gte: new Date(now.setDate(now.getDate() - 90)) },
        };
        break;
      default:
        dateFilter = {};
    }

    const filter: any = {
      organizationId: req.user!.organizationId,
      ...dateFilter,
    };

    // If not admin, only show user's own data
    if (req.user!.role !== "admin" && req.user!.role !== "manager") {
      filter.userId = req.user!.userId;
    } else if (userId) {
      // Admin/manager can filter by specific user
      filter.userId = userId;
    }

    const sessions = await Session.find(filter)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({ sessions });
  })
);

/**
 * @swagger
 * /api/sessions/user:
 *   get:
 *     summary: Get sessions for the current user or all users (admin/manager)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Specific user ID (admin/manager only)
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/user",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.query;

    const filter: any = { organizationId: req.user!.organizationId };

    // If not admin/manager, only show user's own sessions
    if (req.user!.role !== "admin" && req.user!.role !== "manager") {
      filter.userId = req.user!.userId;
    } else if (userId) {
      // Admin/manager can filter by specific user
      filter.userId = userId;
    }

    const sessions = await Session.find(filter)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({ sessions });
  })
);
export default router;
