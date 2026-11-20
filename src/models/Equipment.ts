import mongoose from "mongoose";

export const EQUIPMENT_CATEGORIES = [
  "Construction Equipment",
  "Photography Equipment",
  "Vehicles & Transportation",
  "Agriculture Equipment",
  "Electronics",
  "Event Equipment",
] as const;

export type EquipmentStatus = "pending" | "approved" | "rejected";

export interface EquipmentDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  category: (typeof EQUIPMENT_CATEGORIES)[number];
  rentalPrice: number;
  rentalType: "Daily" | "Weekly" | "Monthly";
  location: string;
  availableQuantity: number;
  image: string;
  brand: string;
  model: string;
  condition: string;
  rentalTerms: string;
  status: EquipmentStatus;
  owner: mongoose.Types.ObjectId;
  rating: number;
  reviews: number;
  createdAt: Date;
  updatedAt: Date;
}

const equipmentSchema = new mongoose.Schema<EquipmentDoc>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: EQUIPMENT_CATEGORIES,
    },
    rentalPrice: { type: Number, required: true, min: 0 },
    rentalType: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      default: "Daily",
    },
    location: { type: String, required: true, trim: true },
    availableQuantity: { type: Number, required: true, min: 0, default: 1 },
    image: { type: String, required: true, unique: true },
    brand: { type: String, default: "" },
    model: { type: String, default: "" },
    condition: { type: String, default: "" },
    rentalTerms: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Equipment = mongoose.model<EquipmentDoc>(
  "Equipment",
  equipmentSchema
);
