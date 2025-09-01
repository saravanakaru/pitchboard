interface FeedbackMetric {
  category: string;
  score: number;
  feedback: string;
}

interface ScoringResult {
  overallScore: number;
  metrics: FeedbackMetric[];
}

export const analyzeSession = async (
  transcript: string
): Promise<ScoringResult> => {
  // Mock scoring logic - replace with actual analysis
  const categories = [
    "Clarity",
    "Pace",
    "Tone",
    "Confidence",
    "Vocabulary",
    "Engagement",
    "Structure",
  ];

  const metrics: FeedbackMetric[] = categories.map((category) => {
    const score = Math.floor(Math.random() * 40) + 60; // 60-100
    return {
      category,
      score,
      feedback: generateFeedback(category, score, transcript),
    };
  });

  const overallScore = Math.round(
    metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length
  );

  return { overallScore, metrics };
};

const generateFeedback = (
  category: string,
  score: number,
  transcript: string
): string => {
  const feedbacks: { [key: string]: string[] } = {
    Clarity: [
      "Your speech is very clear and easy to understand.",
      "Consider enunciating your words more clearly.",
      "Excellent articulation throughout your speech.",
    ],
    Pace: [
      "Your pacing is perfect for this context.",
      "Try to slow down slightly for better comprehension.",
      "The speed variation adds good dynamics to your speech.",
    ],
    // Add more category-specific feedbacks
  };

  const defaultFeedback = "Good effort. Continue practicing to improve.";
  return (
    feedbacks[category]?.[
      Math.floor(Math.random() * feedbacks[category].length)
    ] || defaultFeedback
  );
};
