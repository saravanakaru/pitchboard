export interface User {
  id: string;
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "manager" | "trainee";
  organizationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type: "company" | "individual";
  description?: string;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  organization: Organization;
}

export interface Session {
  _id: string;
  userId: string | User;
  organizationId: string;
  scenario: string;
  transcript: TranscriptChunk[];
  duration: number;
  feedbackMetrics: FeedbackMetric[];
  overallScore: number;
  status: "ready" | "in-progress" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
}

export interface TranscriptChunk {
  text: string;
  timestamp: string;
  isFinal: boolean;
  confidence: number;
}

export interface FeedbackMetric {
  category: string;
  score: number;
  feedback: string;
}

export interface ScoringResult {
  overallScore: number;
  metrics: FeedbackMetric[];
}
