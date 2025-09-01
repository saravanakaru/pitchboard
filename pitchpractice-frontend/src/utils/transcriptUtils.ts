export const filterLowQualityTranscripts = (
  transcripts: any[],
  minConfidence: number = 0.4,
  minLength: number = 3
): any[] => {
  return transcripts.filter(
    (transcript) =>
      transcript.confidence >= minConfidence &&
      transcript.text.trim().length >= minLength &&
      !isNonsensePhrase(transcript.text)
  );
};

export const isNonsensePhrase = (text: string): boolean => {
  const nonsensePatterns = [
    /^in the [a-z]+$/i,
    /^and the [a-z]+$/i,
    /^of the [a-z]+$/i,
    /^to the [a-z]+$/i,
    /^for the [a-z]+$/i,
    /^what do [a-z]+$/i,
    /^how do [a-z]+$/i,
    /^where do [a-z]+$/i,
    /^when do [a-z]+$/i,
    /^why do [a-z]+$/i,
  ];

  return nonsensePatterns.some((pattern) => pattern.test(text.toLowerCase()));
};

export const formatTranscriptText = (text: string): string => {
  // Remove extra spaces
  let formatted = text.replace(/\s+/g, " ").trim();

  // Capitalize first letter
  if (formatted.length > 0) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // Add period if missing
  if (!/[.!?]$/.test(formatted)) {
    formatted += ".";
  }

  return formatted;
};
