import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
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
} from "recharts";
import { type Session } from "../../types";

interface SessionAnalyticsProps {
  session: Session | null;
  open: boolean;
  onClose: () => void;
}

const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({
  session,
  open,
  onClose,
}) => {
  if (!session) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          Session Analytics - {session.scenario}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3}>
          {/* Feedback Metrics */}
          <Box flex={1}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                Feedback Metrics
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={session.feedbackMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Box>

          {/* Performance Radar */}
          <Box flex={1}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                Performance Radar
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={session.feedbackMetrics}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    dataKey="score"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionAnalytics;
