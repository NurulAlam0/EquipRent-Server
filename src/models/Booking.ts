import mongoose from "mongoose";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "completed";
export type BookingPaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export interface BookingDoc {
  _id: mongoose.Types.ObjectId;
  equipment: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  durationUnits: number;
  rentalType: "Daily" | "Weekly" | "Monthly";
  quantity: number;
  contactNumber: string;
  deliveryAddress: string;
  additionalNotes: string;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  reservationExpiresAt?: Date;
  paidAt?: Date;
  inventoryReleased: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new mongoose.Schema<BookingDoc>(
  {
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationUnits: { type: Number, required: true, min: 1 },
    rentalType: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    contactNumber: { type: String, required: true, trim: true },
    deliveryAddress: { type: String, required: true, trim: true },
    additionalNotes: { type: String, default: "", trim: true },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, lowercase: true },
    status: {
      type: String,
      enum: ["pending_payment", "confirmed", "cancelled", "completed"],
      default: "pending_payment",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
    },
    stripeSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },
    reservationExpiresAt: Date,
    paidAt: Date,
    inventoryReleased: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, createdAt: -1 });
bookingSchema.index({ stripeSessionId: 1 }, { sparse: true });

export const Booking = mongoose.model<BookingDoc>("Booking", bookingSchema);
