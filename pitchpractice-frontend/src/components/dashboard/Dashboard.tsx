import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  LinearProgress,
  Chip,
  IconButton,
  Skeleton,
  Alert,
  useTheme,
} from "@mui/material";
import {
  Mic,
  People,
  TrendingUp,
  Download,
  BarChart,
  Refresh,
  PlayArrow,
  Timer,
  Grade,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { dashboardAPI } from "../../services/api";
import { useNavigate } from "react-router-dom";
import RequireRole from "../../components/RequireRole";

interface DashboardStats {
  totalSessions: number;
  totalUsers: number;
  averageScore: number;
  categoryScores: { [key: string]: number };
  recentSessions: any[];
  weeklyTrend?: { date: string; sessions: number; score: number }[];
  userStats?: {
    userSessions: number;
    userAverageScore: number;
    improvement: number;
  };
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { user, organization } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setError("");
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Failed to load dashboard data"
      );
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const handleExport = async () => {
    try {
      const response = await dashboardAPI.exportSessions();
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sessions-export-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setError(error.response?.data?.message || "Export failed");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.palette.success.main;
    if (score >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getPerformanceText = (score: number) => {
    if (score >= 80) return "Excellent 🎯";
    if (score >= 60) return "Good 👍";
    if (score >= 40) return "Needs Practice 📈";
    return "Needs Improvement 🔄";
  };

  if (loading) {
    return (
      <Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Skeleton variant="rectangular" width={200} height={40} />
          <Skeleton variant="rectangular" width={180} height={40} />
        </Box>
        <Box display="flex" flexWrap="wrap" gap={3}>
          {[1, 2, 3, 4].map((item) => (
            <Box key={item} flex="1 1 calc(25% - 24px)" minWidth="200px">
              <Skeleton variant="rectangular" height={120} />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Welcome back, {user?.firstName}! 👋
            {organization && (
              <Chip
                label={organization.name}
                variant="outlined"
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </Typography>
        </Box>

        <Box display="flex" gap={1} flexWrap="wrap">
          <IconButton
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh data"
          >
            <Refresh />
          </IconButton>
          <RequireRole allowedRoles={["admin", "manager"]}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExport}
              disabled={!stats?.totalSessions}
            >
              Export
            </Button>
          </RequireRole>
          <RequireRole allowedRoles={["trainee"]}>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={() => navigate("/session/new")}
            >
              New Session
            </Button>
          </RequireRole>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box
        display="flex"
        flexWrap="wrap"
        gap={3}
        sx={{
          mb: 4,
          "& > *": {
            flex: "1 1 calc(25% - 24px)",
            minWidth: "200px",
          },
        }}
      >
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Mic color="primary" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                TOTAL SESSIONS
              </Typography>
            </Box>
            <Typography variant="h4" component="div" gutterBottom>
              {stats?.totalSessions || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Across all users
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <People color="secondary" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                ACTIVE USERS
              </Typography>
            </Box>
            <Typography variant="h4" component="div" gutterBottom>
              {stats?.totalUsers || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              In your organization
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <TrendingUp
                sx={{ color: getScoreColor(stats?.averageScore || 0), mr: 1 }}
              />
              <Typography color="textSecondary" variant="body2">
                AVERAGE SCORE
              </Typography>
            </Box>
            <Typography
              variant="h4"
              component="div"
              gutterBottom
              color={getScoreColor(stats?.averageScore || 0)}
            >
              {stats?.averageScore ? Math.round(stats.averageScore) : 0}%
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {getPerformanceText(stats?.averageScore || 0)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Timer color="info" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                YOUR SESSIONS
              </Typography>
            </Box>
            <Typography variant="h4" component="div" gutterBottom>
              {stats?.userStats?.userSessions || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {stats?.userStats?.improvement &&
              stats.userStats.improvement > 0 ? (
                <Box component="span" color="success.main">
                  +{stats.userStats.improvement}% improvement
                </Box>
              ) : (
                "Keep practicing!"
              )}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Two-column layout */}
      <Box display="flex" flexDirection={{ xs: "column", lg: "row" }} gap={3}>
        {/* Category Scores */}
        {stats?.categoryScores &&
          Object.keys(stats.categoryScores).length > 0 && (
            <Box flex={2} minWidth={0}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Performance by Category
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  {Object.entries(stats.categoryScores).map(
                    ([category, score]) => (
                      <Box key={category}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={1}
                        >
                          <Typography variant="body2" fontWeight="medium">
                            {category}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {Math.round(score)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={score}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: theme.palette.grey[200],
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: getScoreColor(score),
                            },
                          }}
                        />
                      </Box>
                    )
                  )}
                </Box>
              </Paper>
            </Box>
          )}

        {/* Quick Actions */}
        <Box flex={1} minWidth={0}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="contained"
                startIcon={<Mic />}
                onClick={() => navigate("/session/new")}
                fullWidth
              >
                Start Practice Session
              </Button>
              <Button
                variant="outlined"
                startIcon={<BarChart />}
                onClick={() => navigate("/sessions")}
                fullWidth
              >
                View My Sessions
              </Button>
              <RequireRole allowedRoles={["admin", "manager"]}>
                <Button
                  variant="outlined"
                  startIcon={<People />}
                  onClick={() => navigate("/users")}
                  fullWidth
                >
                  Manage Users
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TrendingUp />}
                  onClick={() => navigate("/analytics")}
                  fullWidth
                >
                  View Analytics
                </Button>
              </RequireRole>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Recent Activity */}
      {stats?.recentSessions && stats.recentSessions.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            {stats.recentSessions.slice(0, 5).map((session, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                py={1}
                sx={{
                  borderBottom:
                    index < stats.recentSessions.slice(0, 5).length - 1
                      ? `1px solid ${theme.palette.divider}`
                      : "none",
                }}
              >
                <Box flex={1}>
                  <Typography variant="body2" noWrap>
                    {session.scenario}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(session.startedAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} ml={2}>
                  <Grade fontSize="small" color="primary" />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    minWidth="40px"
                  >
                    {session.score}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          {stats.recentSessions.length > 5 && (
            <Box textAlign="center" mt={2}>
              <Button
                variant="text"
                size="small"
                onClick={() => navigate("/sessions")}
              >
                View All Sessions
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Empty State */}
      {!loading && stats?.totalSessions === 0 && (
        <Paper sx={{ p: 6, textAlign: "center", mt: 3 }}>
          <Mic sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No sessions yet
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Get started by creating your first practice session
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={() => navigate("/session/new")}
            size="large"
          >
            Start Your First Session
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Dashboard;
