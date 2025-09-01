import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { transcriptionService } from "../../services/transcriptionService";
import { socketService } from "../../services/socket";
// import { env } from "../../config/env";
const DEEPGRAM_API_KEY = "d5ce089eec813f4ad59a4570e864981365068325";
import { TranscriptDisplay, type TranscriptItem } from "./TranscriptDisplay";

const Session = () => {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scenario, setScenario] = useState("Practice Session");
  const [showSessionDialog, setShowSessionDialog] = useState(!paramSessionId);

  const {
    isRecording,
    error: recorderError,
    startRecording,
    stopRecording,
    hasAudioSupport,
  } = useAudioRecorder({
    onTranscript: (text, isFinal, confidence) => {
      const newTranscript: TranscriptItem = {
        text,
        timestamp: new Date(),
        isFinal,
        confidence,
      };

      setTranscripts((prev) => {
        if (shouldDisplayTranscript(prev, newTranscript)) {
          return [...prev, newTranscript];
        }
        return prev;
      });

      if (isFinal && currentSessionId) {
        socketService.emit("transcript-update", {
          sessionId: currentSessionId,
          transcript: text,
          isFinal,
          confidence,
        });
      }
    },
  });

  const shouldDisplayTranscript = (
    transcripts: TranscriptItem[],
    newItem: TranscriptItem
  ): boolean => {
    if (transcripts.length === 0) return true;

    const lastItem = transcripts[transcripts.length - 1];

    // Don't show interim if we already have a final version
    if (
      !newItem.isFinal &&
      lastItem.isFinal &&
      calculateSimilarity(newItem.text, lastItem.text) > 0.8
    ) {
      return false;
    }

    // Don't show duplicates within short time window
    if (
      newItem.isFinal &&
      lastItem.isFinal &&
      calculateSimilarity(newItem.text, lastItem.text) > 0.7 &&
      newItem.timestamp.getTime() - lastItem.timestamp.getTime() < 2000
    ) {
      return false;
    }

    return true;
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;

    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter((word) => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  };
  // Check if we have a session ID from URL
  useEffect(() => {
    if (paramSessionId) {
      setCurrentSessionId(paramSessionId);
      setShowSessionDialog(false);
      loadSessionDetails(paramSessionId);
    }
  }, [paramSessionId]);

  useEffect(() => {
    if (recorderError) {
      setError(recorderError);
    }
  }, [recorderError]);

  const loadSessionDetails = async (sessionId: string) => {
    try {
      const sessionData = await transcriptionService.getSession(sessionId);
      setScenario(sessionData.scenario || "Practice Session");
    } catch (error) {
      console.error("Failed to load session details:", error);
    }
  };

  const handleCreateSession = async () => {
    if (!scenario.trim()) {
      setError("Please enter a session scenario");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const session = await transcriptionService.createSession(scenario);
      setCurrentSessionId(session.sessionId);
      setShowSessionDialog(false);
      navigate(`/session/${session.sessionId}`);
    } catch (error) {
      setError("Failed to create session: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRecording = async () => {
    if (!currentSessionId) {
      setError("No active session");
      return;
    }

    try {
      socketService.emit("join-session", currentSessionId);
      await startRecording(currentSessionId, DEEPGRAM_API_KEY);
    } catch (error) {
      setError("Failed to start recording: " + (error as Error).message);
    }
  };

  const handleStopRecording = async () => {
    try {
      stopRecording();

      if (currentSessionId && transcripts.length > 0) {
        const finalTranscript = transcripts
          .filter((t) => t.isFinal)
          .map((t) => t.text)
          .join(" ");

        await transcriptionService.completeSession(
          finalTranscript,
          Math.floor((Date.now() - transcripts[0].timestamp.getTime()) / 1000),
          transcripts.map((t) => ({
            category: "Speech",
            score: Math.round(t.confidence * 100),
            feedback: t.isFinal ? "Final transcript" : "Interim transcript",
          }))
        );

        socketService.emit("leave-session", currentSessionId);
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      setError("Failed to stop recording: " + (error as Error).message);
    }
  };

  const handleCancelSession = () => {
    navigate("/dashboard");
  };

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  const exportTranscripts = useCallback(() => {
    const transcriptText = transcripts
      .map(
        (t) =>
          `[${t.timestamp.toLocaleTimeString()}] ${t.text} (${Math.round(
            t.confidence * 100
          )}%${t.isFinal ? ", final" : ", interim"})`
      )
      .join("\n\n");

    const blob = new Blob([transcriptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [transcripts]);

  useEffect(() => {
    if (!hasAudioSupport) {
      setError("Audio recording is not supported in your browser");
    }
  }, [hasAudioSupport]);

  useEffect(() => {
    socketService.on("transcript-update", (data: any) => {
      if (data.sessionId === currentSessionId) {
        const newTranscript: TranscriptItem = {
          text: data.transcript,
          timestamp: new Date(),
          isFinal: data.isFinal,
          confidence: data.confidence,
        };
        setTranscripts((prev) => [...prev, newTranscript]);
      }
    });

    return () => {
      socketService.off("transcript-update");
      if (isRecording) {
        stopRecording();
      }
    };
  }, [currentSessionId, isRecording, stopRecording]);

  // If dialog is open, only render the dialog - nothing else
  if (showSessionDialog) {
    return (
      <Dialog
        open={true}
        onClose={handleCancelSession}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          style: {
            zIndex: 1300,
          },
        }}
      >
        <DialogTitle>Create New Practice Session</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Session Scenario"
            type="text"
            fullWidth
            variant="outlined"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="e.g., Sales pitch, Presentation, Interview practice..."
            sx={{ mt: 2 }}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSession}>Cancel</Button>
          <Button
            onClick={handleCreateSession}
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : "Create Session"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Only render main content if dialog is closed and we have a session ID
  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4">Practice Session</Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Scenario: {scenario}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Chip
            label={isRecording ? "Recording" : "Ready"}
            color={isRecording ? "error" : "default"}
          />
          <Chip
            label={`Session: ${currentSessionId?.substring(0, 8)}...`}
            variant="outlined"
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Session Controls
        </Typography>
        <Box display="flex" gap={2} mb={3} alignItems="center">
          <Button
            variant="contained"
            onClick={handleStartRecording}
            disabled={isRecording}
            size="large"
          >
            {isRecording ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Recording...
              </>
            ) : (
              "Start Recording"
            )}
          </Button>
          <Button
            variant="outlined"
            onClick={handleStopRecording}
            disabled={!isRecording}
            size="large"
          >
            Stop Recording
          </Button>

          {transcripts.length > 0 && (
            <Box display="flex" gap={1} ml="auto">
              <Tooltip title="Clear Transcript">
                <IconButton onClick={clearTranscripts} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export Transcript">
                <IconButton onClick={exportTranscripts} color="primary">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {isRecording && (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="textSecondary">
              Recording with Deepgram... Speak clearly into your microphone.
            </Typography>
          </Box>
        )}
      </Paper>

      <TranscriptDisplay
        transcripts={transcripts}
        title="Live Transcription"
        height={400}
      />

      {transcripts.length > 0 && (
        <Box sx={{ mt: 2 }} display="flex" gap={2}>
          <Button
            variant="outlined"
            onClick={clearTranscripts}
            startIcon={<DeleteIcon />}
          >
            Clear Transcript
          </Button>
          <Button
            variant="outlined"
            onClick={exportTranscripts}
            startIcon={<DownloadIcon />}
          >
            Export Transcript
          </Button>
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" color="textSecondary">
            {transcripts.length} utterances •{" "}
            {transcripts.filter((t) => t.isFinal).length} final •{" "}
            {Math.round(
              (transcripts.reduce((sum, t) => sum + t.confidence, 0) /
                transcripts.length) *
                100
            )}
            % avg confidence
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Session;
