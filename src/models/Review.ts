import mongoose from "mongoose";

export interface ReviewDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  location: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new mongoose.Schema<ReviewDoc>(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Review = mongoose.model<ReviewDoc>("Review", reviewSchema);
