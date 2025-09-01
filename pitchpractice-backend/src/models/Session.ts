import mongoose, { Document, Schema } from "mongoose";

export interface ITranscriptChunk {
  text: string;
  timestamp: Date;
  isFinal: boolean;
  confidence: number;
}

export interface IFeedbackMetric {
  category: string;
  score: number;
  feedback: string;
}

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  scenario: string;
  audioUrl?: string;
  transcript: ITranscriptChunk[];
  duration: number;
  feedbackMetrics: IFeedbackMetric[];
  overallScore: number;
  status: "ready" | "in-progress" | "completed" | "failed";
  language: string;
  sampleRate: number;
  audioFormat: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TranscriptChunkSchema: Schema = new Schema({
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isFinal: { type: Boolean, default: false },
  confidence: { type: Number, default: 0 },
});

const SessionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    scenario: { type: String, required: true },
    audioUrl: { type: String },
    transcript: [TranscriptChunkSchema],
    duration: { type: Number, default: 0 },
    feedbackMetrics: [
      {
        category: String,
        score: Number,
        feedback: String,
      },
    ],
    overallScore: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ready", "in-progress", "completed", "failed"],
      default: "in-progress",
    },
    language: { type: String, default: "en" },
    sampleRate: { type: Number, default: 16000 },
    audioFormat: { type: String, default: "pcm" },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
SessionSchema.index({ organizationId: 1, createdAt: -1 });
SessionSchema.index({ userId: 1, createdAt: -1 });
SessionSchema.index({ organizationId: 1, status: 1 });

export default mongoose.model<ISession>("Session", SessionSchema);
