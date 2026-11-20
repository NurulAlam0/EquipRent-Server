import mongoose from "mongoose";

export interface PaymentDoc {
  _id: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: "succeeded" | "refunded";
  stripeSessionId: string;
  stripePaymentIntentId: string;
  transactionId: string;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new mongoose.Schema<PaymentDoc>(
  {
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
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, lowercase: true },
    status: { type: String, enum: ["succeeded", "refunded"], required: true },
    stripeSessionId: { type: String, required: true, unique: true },
    stripePaymentIntentId: { type: String, default: "" },
    transactionId: { type: String, required: true },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Payment = mongoose.model<PaymentDoc>("Payment", paymentSchema);
