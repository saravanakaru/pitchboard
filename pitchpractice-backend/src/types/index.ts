export interface IFeedbackMetric {
  category: string;
  score: number;
  feedback: string;
}

export interface Session {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  organizationId: string;
  scenario: string;
  audioUrl?: string;
  transcript: any[];
  duration: number;
  feedbackMetrics: IFeedbackMetric[];
  overallScore: number;
  status: string;
  language: string;
  sampleRate: number;
  audioFormat: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
