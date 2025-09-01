import React from "react";
import { Box, Paper, Typography, Chip, Divider, useTheme } from "@mui/material";
import {
  Mic,
  Schedule,
  CheckCircle,
  RadioButtonUnchecked,
} from "@mui/icons-material";

export interface TranscriptItem {
  text: string;
  timestamp: Date;
  isFinal: boolean;
  confidence: number;
}

interface TranscriptDisplayProps {
  transcripts: TranscriptItem[];
  title?: string;
  height?: number;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcripts,
  title = "Live Transcript",
  height = 400,
}) => {
  const theme = useTheme();

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const formatDuration = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) {
      return `${diffSec}s ago`;
    } else {
      return `${Math.floor(diffSec / 60)}m ${diffSec % 60}s ago`;
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence > 0.8) return theme.palette.success.main;
    if (confidence > 0.5) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <Paper
      sx={{
        p: 3,
        height: height,
        overflow: "auto",
        bgcolor: "grey.50",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h6" color="primary" gutterBottom>
          <Mic sx={{ mr: 1, verticalAlign: "bottom" }} />
          {title}
        </Typography>
        <Chip
          label={`${transcripts.length} utterances`}
          size="small"
          variant="outlined"
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ flex: 1, overflow: "auto" }}>
        {transcripts.length === 0 ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
            color="text.secondary"
          >
            <Typography variant="body1" textAlign="center">
              Start speaking to see the live transcription here.
              <br />
              Your words will appear in real-time with timestamps.
            </Typography>
          </Box>
        ) : (
          transcripts.map((item, index) => (
            <Box
              key={index}
              sx={{
                mb: 2,
                p: 2,
                bgcolor: item.isFinal ? "background.paper" : "action.hover",
                border: `1px solid ${
                  item.isFinal
                    ? theme.palette.divider
                    : theme.palette.action.selected
                }`,
                borderRadius: 2,
                transition: "all 0.2s ease",
              }}
            >
              <Box
                display="flex"
                alignItems="flex-start"
                justifyContent="space-between"
                mb={1}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Schedule
                    fontSize="small"
                    color="disabled"
                    sx={{ mt: 0.5 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(item.timestamp)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({formatDuration(item.timestamp)})
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  {item.isFinal ? (
                    <CheckCircle fontSize="small" color="success" />
                  ) : (
                    <RadioButtonUnchecked fontSize="small" color="disabled" />
                  )}
                  <Chip
                    label={`${Math.round(item.confidence * 100)}%`}
                    size="small"
                    variant="filled"
                    sx={{
                      backgroundColor: getConfidenceColor(item.confidence),
                      color: "white",
                      fontSize: "0.7rem",
                      height: 20,
                    }}
                  />
                </Box>
              </Box>

              <Typography
                variant="body1"
                sx={{
                  lineHeight: 1.6,
                  color: item.isFinal ? "text.primary" : "text.secondary",
                  fontStyle: item.isFinal ? "normal" : "italic",
                }}
              >
                {item.text}
              </Typography>
            </Box>
          ))
        )}
      </Box>

      {transcripts.length > 0 && (
        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Typography variant="caption" color="text.secondary">
            Last updated: {formatTime(new Date())}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
