export class DeepgramErrorHandler {
  static handleError(error: any): string {
    if (error.code === "UNAUTHENTICATED") {
      return "Invalid Deepgram API key";
    } else if (error.code === "RESOURCE_EXHAUSTED") {
      return "API quota exceeded";
    } else if (error.code === "INVALID_ARGUMENT") {
      return "Invalid audio format";
    } else if (error.message?.includes("network")) {
      return "Network error connecting to Deepgram";
    } else {
      return "Speech recognition service temporarily unavailable";
    }
  }

  static shouldRetry(error: any): boolean {
    const retryableErrors = [
      "RESOURCE_EXHAUSTED",
      "NETWORK_ERROR",
      "SERVICE_UNAVAILABLE",
    ];

    return retryableErrors.some(
      (retryableError) =>
        error.code === retryableError || error.message?.includes(retryableError)
    );
  }
}
