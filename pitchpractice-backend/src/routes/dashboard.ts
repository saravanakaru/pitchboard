import express, { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Session, { ISession } from "../models/Session";
import User from "../models/User";
import { asyncHandler } from "../middleware/errorHandler";

const router = express.Router();

// Get dashboard stats
/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSessions:
 *                   type: number
 *                 totalUsers:
 *                   type: number
 *                 averageScore:
 *                   type: number
 *                 categoryScores:
 *                   type: object
 *                 recentSessions:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/stats",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;

    const filter: any = { organizationId: req.user!.organizationId };

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const sessions = await Session.find(filter);
    const users = await User.find({ organizationId: req.user!.organizationId });

    const totalSessions = sessions.length;
    const totalUsers = users.length;
    const averageScore =
      sessions.reduce((sum, session) => sum + session.overallScore, 0) /
        totalSessions || 0;

    // Category-wise scores
    const categoryScores: { [key: string]: number } = {};
    sessions.forEach((session) => {
      session.feedbackMetrics.forEach((metric) => {
        if (!categoryScores[metric.category]) {
          categoryScores[metric.category] = 0;
        }
        categoryScores[metric.category] += metric.score;
      });
    });

    Object.keys(categoryScores).forEach((category) => {
      const sessionsWithCategory = sessions.filter((s) =>
        s.feedbackMetrics.some((m) => m.category === category)
      ).length;
      categoryScores[category] =
        categoryScores[category] / (sessionsWithCategory || 1);
    });

    res.json({
      totalSessions,
      totalUsers,
      averageScore: Math.round(averageScore),
      categoryScores,
      recentSessions: sessions.slice(-5).map((session) => ({
        id: session._id,
        userId: session.userId,
        scenario: session.scenario,
        overallScore: session.overallScore,
        duration: session.duration,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      })),
    });
  })
);

// Get sessions with filters
router.get(
  "/sessions",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      userId,
      scenario,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const filter: any = { organizationId: req.user!.organizationId };

    if (userId) filter.userId = userId;
    if (scenario) filter.scenario = { $regex: scenario, $options: "i" };
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const sessions = await Session.find(filter)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await Session.countDocuments(filter);

    res.json({
      sessions: sessions.map((session) => ({
        id: session._id,
        userId: session.userId,
        scenario: session.scenario,
        transcript: session.transcript,
        duration: session.duration,
        overallScore: session.overallScore,
        feedbackMetrics: session.feedbackMetrics,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        createdAt: session.createdAt,
      })),
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total,
    });
  })
);

// Export sessions to CSV
/**
 * @swagger
 * /api/dashboard/export:
 *   get:
 *     summary: Export sessions to CSV
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/export",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;

    const filter: any = { organizationId: req.user!.organizationId };

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const sessions = await Session.find(filter).populate(
      "userId",
      "firstName lastName email"
    );

    // Generate CSV
    let csv =
      "Session ID,User,Scenario,Started At,Completed At,Duration,Overall Score,Status\n";

    sessions.forEach((session) => {
      const user = session.userId as any;
      const userName = user
        ? `${user.firstName} ${user.lastName}`
        : "Unknown User";
      const completedAt = session.completedAt
        ? session.completedAt.toISOString()
        : "N/A";

      csv += `"${session._id}","${userName}","${session.scenario}",`;
      csv += `"${session.startedAt.toISOString()}","${completedAt}","${
        session.duration
      }s","${session.overallScore}","${session.status}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sessions-export.csv"
    );
    res.send(csv);
  })
);

// Get user performance
router.get(
  "/users/:userId/performance",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const sessions = await Session.find({
      userId,
      organizationId: req.user!.organizationId,
      createdAt: { $gte: startDate },
    }).sort({ createdAt: 1 });

    const performanceData = sessions.map((session) => ({
      date: session.startedAt.toISOString().split("T")[0],
      score: session.overallScore,
      duration: session.duration,
      scenario: session.scenario,
    }));

    res.json({ performanceData });
  })
);

// Get session analytics for charts
router.get(
  "/analytics",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { timeframe = "7d" } = req.query;

    const startDate = new Date();
    let days = 7;

    if (timeframe === "30d") days = 30;
    if (timeframe === "90d") days = 90;

    startDate.setDate(startDate.getDate() - days);

    const sessions = await Session.find({
      organizationId: req.user!.organizationId,
      createdAt: { $gte: startDate },
      status: "completed",
    });

    // Prepare data for radar chart (category scores)
    const categoryScores: { [key: string]: number[] } = {};

    sessions.forEach((session) => {
      session.feedbackMetrics.forEach((metric) => {
        if (!categoryScores[metric.category]) {
          categoryScores[metric.category] = [];
        }
        categoryScores[metric.category].push(metric.score);
      });
    });

    const radarData = Object.keys(categoryScores).map((category) => ({
      category,
      averageScore: Math.round(
        categoryScores[category].reduce((a, b) => a + b, 0) /
          categoryScores[category].length
      ),
    }));

    // Prepare data for bar chart (daily session counts)
    const dailyCounts: { [key: string]: number } = {};
    const currentDate = new Date(startDate);

    while (currentDate <= new Date()) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dailyCounts[dateKey] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    sessions.forEach((session) => {
      const dateKey = session.startedAt.toISOString().split("T")[0];
      if (dailyCounts[dateKey] !== undefined) {
        dailyCounts[dateKey]++;
      }
    });

    const barData = Object.keys(dailyCounts).map((date) => ({
      date,
      count: dailyCounts[date],
    }));

    res.json({
      radarData,
      barData,
      totalSessions: sessions.length,
      averageScore: Math.round(
        sessions.reduce((sum, s) => sum + s.overallScore, 0) /
          sessions.length || 0
      ),
    });
  })
);

export default router;
