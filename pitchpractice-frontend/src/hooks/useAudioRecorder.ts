import { useCallback, useState } from "react";
import { deepgramClientService } from "../services/deepgramClientService";

interface UseAudioRecorderProps {
  onTranscript?: (
    transcript: string,
    isFinal: boolean,
    confidence: number
  ) => void;
}

export const useAudioRecorder = ({ onTranscript }: UseAudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(
    async (sessionId: string, deepgramApiKey: string) => {
      try {
        setError(null);
        setIsRecording(true);

        await deepgramClientService.startTranscription(
          sessionId,
          deepgramApiKey
        );

        // Listen for transcript updates
        const handleTranscriptUpdate = (event: any) => {
          onTranscript?.(
            event.detail.transcript,
            event.detail.isFinal,
            event.detail.confidence
          );
        };

        window.addEventListener("transcriptUpdate", handleTranscriptUpdate);

        return () => {
          window.removeEventListener(
            "transcriptUpdate",
            handleTranscriptUpdate
          );
        };
      } catch (err) {
        setError("Failed to start recording: " + (err as Error).message);
        setIsRecording(false);
        throw err;
      }
    },
    [onTranscript]
  );

  const stopRecording = useCallback(() => {
    deepgramClientService.stopTranscription();
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    hasAudioSupport: !!navigator.mediaDevices?.getUserMedia,
  };
};
