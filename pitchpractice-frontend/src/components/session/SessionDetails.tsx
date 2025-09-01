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
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  IconButton,
} from "@mui/material";
import { Close, BarChart } from "@mui/icons-material";
import { type Session, type FeedbackMetric, type User } from "../../types";

interface SessionDetailsProps {
  session: Session | null;
  open: boolean;
  onClose: () => void;
  onViewAnalytics: (session: Session) => void;
}

const SessionDetails: React.FC<SessionDetailsProps> = ({
  session,
  open,
  onClose,
  onViewAnalytics,
}) => {
  if (!session) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getUserDisplayName = (session: Session): string => {
    if (typeof session.userId === "string") {
      return "Unknown User";
    }
    const user = session.userId as User;
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Session Details</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Header Info */}
        <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
          <Box flex="1 1 45%">
            <Typography variant="subtitle2" color="textSecondary">
              User
            </Typography>
            <Typography variant="body1">
              {getUserDisplayName(session)}
            </Typography>
          </Box>
          <Box flex="1 1 45%">
            <Typography variant="subtitle2" color="textSecondary">
              Scenario
            </Typography>
            <Typography variant="body1">{session.scenario}</Typography>
          </Box>

          <Box flex="1 1 45%">
            <Typography variant="subtitle2" color="textSecondary">
              Status
            </Typography>
            <Chip
              label={session.status}
              color={
                session.status === "completed"
                  ? "success"
                  : session.status === "in-progress"
                  ? "warning"
                  : session.status === "failed"
                  ? "error"
                  : "default"
              }
            />
          </Box>

          <Box flex="1 1 45%">
            <Typography variant="subtitle2" color="textSecondary">
              Duration
            </Typography>
            <Typography variant="body1">
              {session.duration ? formatDuration(session.duration) : "N/A"}
            </Typography>
          </Box>

          <Box flex="1 1 45%">
            <Typography variant="subtitle2" color="textSecondary">
              Overall Score
            </Typography>
            {session.overallScore ? (
              <Box display="flex" alignItems="center" gap={1}>
                <LinearProgress
                  variant="determinate"
                  value={session.overallScore}
                  sx={{ width: 100, height: 8 }}
                />
                <Typography variant="body1">{session.overallScore}%</Typography>
              </Box>
            ) : (
              <Typography variant="body1">N/A</Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Feedback Metrics */}
        {session.feedbackMetrics && session.feedbackMetrics.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              Feedback Metrics
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
              {session.feedbackMetrics.map(
                (metric: FeedbackMetric, index: number) => (
                  <Box key={index} flex="1 1 45%">
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {metric.category}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <LinearProgress
                          variant="determinate"
                          value={metric.score}
                          sx={{ flexGrow: 1, height: 8 }}
                        />
                        <Typography variant="body2">{metric.score}%</Typography>
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {metric.feedback}
                      </Typography>
                    </Paper>
                  </Box>
                )
              )}
            </Box>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* Transcript */}
        <Typography variant="h6" gutterBottom>
          Transcript
        </Typography>
        {session.transcript && session.transcript.length > 0 ? (
          <Paper sx={{ p: 2, maxHeight: 300, overflow: "auto" }}>
            <List dense>
              {session.transcript.map((chunk: any, index: number) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={chunk.text}
                    secondary={
                      <Typography variant="caption" color="textSecondary">
                        {new Date(chunk.timestamp).toLocaleTimeString()} •
                        {chunk.isFinal ? " Final" : " Partial"} • Confidence:{" "}
                        {(chunk.confidence * 100).toFixed(1)}%
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No transcript available
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {session.status === "completed" && (
          <Button
            variant="contained"
            startIcon={<BarChart />}
            onClick={() => onViewAnalytics(session)}
          >
            View Analytics
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SessionDetails;
