import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId: mongoose.Types.ObjectId;
  role: "admin" | "manager" | "trainee";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "trainee"],
      required: true,
      default: "trainee",
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Index for organization-based queries
UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export default mongoose.model<IUser>("User", UserSchema);
