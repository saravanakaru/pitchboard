import mongoose, { Document, Schema } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  description?: string;
  type: "company" | "individual";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["company", "individual"],
      required: true,
      default: "company",
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema
);
