import mongoose from "mongoose";

export interface EquipmentReviewDoc {
  _id: mongoose.Types.ObjectId;
  equipment: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const equipmentReviewSchema = new mongoose.Schema<EquipmentReviewDoc>(
  {
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

equipmentReviewSchema.index({ equipment: 1, createdAt: -1 });

export const EquipmentReview = mongoose.model<EquipmentReviewDoc>(
  "EquipmentReview",
  equipmentReviewSchema
);
