import { deepgramService } from "./deepgramService";
import { deepgramRestService } from "./deepgramRestService";

// Mock responses for fallback
const mockResponses = [
  "This is a sample transcription of spoken words.",
  "The quick brown fox jumps over the lazy dog.",
  "Hello, welcome to our voice coaching session.",
  "Practice makes perfect when it comes to public speaking.",
  "Today we'll be working on your presentation skills.",
];

// Choose which service to use (live or REST)
const USE_LIVE_API = true;

export const speechToText = async (
  sessionId: string,
  audioChunk: ArrayBuffer
): Promise<any> => {
  try {
    const buffer = Buffer.from(audioChunk);

    if (USE_LIVE_API) {
      // Use Live API for real-time streaming
      return await deepgramService.processAudioChunk(sessionId, buffer);
    } else {
      // Use REST API for individual chunks
      return await deepgramRestService.transcribeAudio(buffer);
    }
  } catch (error) {
    console.error("Deepgram processing failed, using mock response:", error);

    // Fallback to mock response
    // return {
    //   transcript:
    //     mockResponses[Math.floor(Math.random() * mockResponses.length)],
    //   is_final: true,
    //   confidence: 0.8,
    // };
  }
};

export const closeSTTConnection = (sessionId: string) => {
  deepgramService.closeConnection(sessionId);
};

export const initializeSTTConnection = async (
  sessionId: string,
  language: string = "en"
) => {
  try {
    await deepgramService.createLiveConnection(sessionId, language);
    return true;
  } catch (error) {
    console.error("Failed to initialize STT connection:", error);
    return false;
  }
};
