import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  useTheme,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { sessionAPI } from "../../services/api";
import { type Session, type FeedbackMetric } from "../../types";

interface AnalyticsData {
  totalSessions: number;
  averageScore: number;
  averageDuration: number;
  sessionsByStatus: { status: string; count: number }[];
  scoresByCategory: { category: string; averageScore: number }[];
  sessionsOverTime: { date: string; count: number; averageScore: number }[];
  topScenarios: { scenario: string; count: number; averageScore: number }[];
}

const Analytics: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState<
    "7days" | "30days" | "90days" | "all"
  >("30days");
  // const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    fetchSessions();
  }, [timeRange]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await sessionAPI.getSessions({ timeRange });
      console.log(sessions.length);
      setSessions(response.data.sessions || []);
      calculateAnalytics(response.data.sessions || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (sessionsData: Session[]) => {
    const completedSessions = sessionsData.filter(
      (s) => s.status === "completed"
    );

    const data: AnalyticsData = {
      totalSessions: sessionsData.length,
      averageScore:
        completedSessions.reduce(
          (sum, session) => sum + (session.overallScore || 0),
          0
        ) / (completedSessions.length || 1),
      averageDuration:
        completedSessions.reduce(
          (sum, session) => sum + (session.duration || 0),
          0
        ) / (completedSessions.length || 1),
      sessionsByStatus: [
        {
          status: "Completed",
          count: sessionsData.filter((s) => s.status === "completed").length,
        },
        {
          status: "In Progress",
          count: sessionsData.filter((s) => s.status === "in-progress").length,
        },
        {
          status: "Ready",
          count: sessionsData.filter((s) => s.status === "ready").length,
        },
        {
          status: "Failed",
          count: sessionsData.filter((s) => s.status === "failed").length,
        },
      ],
      scoresByCategory: calculateScoresByCategory(completedSessions),
      sessionsOverTime: calculateSessionsOverTime(sessionsData),
      topScenarios: calculateTopScenarios(completedSessions),
    };

    setAnalyticsData(data);
  };

  const calculateScoresByCategory = (sessions: Session[]) => {
    const categoryMap = new Map<string, { total: number; count: number }>();
    sessions.forEach((session) => {
      session.feedbackMetrics?.forEach((metric: FeedbackMetric) => {
        if (!categoryMap.has(metric.category)) {
          categoryMap.set(metric.category, { total: 0, count: 0 });
        }
        const current = categoryMap.get(metric.category)!;
        categoryMap.set(metric.category, {
          total: current.total + (metric.score || 0),
          count: current.count + 1,
        });
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      averageScore: data.count > 0 ? data.total / data.count : 0,
    }));
  };

  const calculateSessionsOverTime = (sessions: Session[]) => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    return sessions
      .filter((s) => new Date(s.startedAt) >= last30Days)
      .reduce(
        (
          acc: { date: string; count: number; totalScore: number }[],
          session
        ) => {
          const date = new Date(session.startedAt).toLocaleDateString();
          const existing = acc.find((item) => item.date === date);

          if (existing) {
            existing.count++;
            existing.totalScore += session.overallScore || 0;
          } else {
            acc.push({ date, count: 1, totalScore: session.overallScore || 0 });
          }
          return acc;
        },
        []
      )
      .map((item) => ({
        date: item.date,
        count: item.count,
        averageScore: item.totalScore / item.count,
      }));
  };

  const calculateTopScenarios = (sessions: Session[]) => {
    const scenarioMap = new Map<
      string,
      { count: number; totalScore: number }
    >();
    sessions.forEach((session) => {
      if (!scenarioMap.has(session.scenario)) {
        scenarioMap.set(session.scenario, { count: 0, totalScore: 0 });
      }
      const current = scenarioMap.get(session.scenario)!;
      scenarioMap.set(session.scenario, {
        count: current.count + 1,
        totalScore: current.totalScore + (session.overallScore || 0),
      });
    });

    return Array.from(scenarioMap.entries())
      .map(([scenario, data]) => ({
        scenario,
        count: data.count,
        averageScore: data.count > 0 ? data.totalScore / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!analyticsData) {
    return null;
  }

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
  ];

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Analytics Dashboard
        </Typography>
        <FormControl sx={{ minWidth: 120 }} size="small">
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <MenuItem value="7days">Last 7 days</MenuItem>
            <MenuItem value="30days">Last 30 days</MenuItem>
            <MenuItem value="90days">Last 90 days</MenuItem>
            <MenuItem value="all">All time</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Box display="flex" flexWrap="wrap" gap={3} mb={4}>
        <Box flex={1} minWidth={250}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Sessions
              </Typography>
              <Typography variant="h4">
                {analyticsData.totalSessions}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box flex={1} minWidth={250}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Score
              </Typography>
              <Typography variant="h4">
                {analyticsData.averageScore.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box flex={1} minWidth={250}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Duration
              </Typography>
              <Typography variant="h4">
                {Math.round(analyticsData.averageDuration / 60)}m
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box flex={1} minWidth={250}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completion Rate
              </Typography>
              <Typography variant="h4">
                {analyticsData.totalSessions > 0
                  ? Math.round(
                      ((analyticsData.sessionsByStatus.find(
                        (s) => s.status === "Completed"
                      )?.count || 0) /
                        analyticsData.totalSessions) *
                        100
                    )
                  : 0}
                %
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Charts */}
      <Box display="flex" flexWrap="wrap" gap={3}>
        <Box flex={1} minWidth={400}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Sessions by Status
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={analyticsData.sessionsByStatus}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {analyticsData.sessionsByStatus.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        <Box flex={1} minWidth={400}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Scores by Category
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <RadarChart data={analyticsData.scoresByCategory}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Score"
                  dataKey="averageScore"
                  stroke={theme.palette.primary.main}
                  fill={theme.palette.primary.main}
                  fillOpacity={0.6}
                />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        <Box flex={1} minWidth={400}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Sessions Over Time
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={analyticsData.sessionsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  fill={theme.palette.primary.main}
                  name="Sessions"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        <Box flex={1} minWidth={400}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Top Scenarios
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                data={analyticsData.topScenarios}
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="scenario" width={80} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="averageScore"
                  fill={theme.palette.success.main}
                  name="Avg Score"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Analytics;
