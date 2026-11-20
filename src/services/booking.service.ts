import mongoose from "mongoose";
import Stripe from "stripe";
import { Booking, type BookingDoc } from "../models/Booking";
import { Equipment } from "../models/Equipment";
import { Payment } from "../models/Payment";
import { ENV } from "../config/env";

export const CURRENCY = "bdt";
export const CHECKOUT_EXPIRY_SECONDS = 30 * 60;

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = ENV.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeInstance) stripeInstance = new Stripe(key);
  return stripeInstance;
}

export function parseBookingDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

export function getDurationUnits(
  startDate: Date,
  endDate: Date,
  rentalType: string
): number {
  const days =
    Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  if (rentalType === "Weekly") return Math.ceil(days / 7);
  if (rentalType === "Monthly") return Math.ceil(days / 30);
  return days;
}

export function getStripeOrigin(value: string | undefined, fallback: string): string {
  try {
    return new URL(value ?? fallback).origin;
  } catch {
    return fallback;
  }
}

export const CLIENT_ORIGIN = getStripeOrigin(
  ENV.CLIENT_URL,
  "http://localhost:3000"
);

export async function completePaidSession(
  session: Stripe.Checkout.Session
): Promise<BookingDoc | null> {
  if (session.payment_status !== "paid") return null;
  const bookingId = session.metadata?.bookingId;
  if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
    throw new Error("Stripe session has no valid booking reference.");
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    stripeSessionId: session.id,
  });
  if (!booking) throw new Error("Booking for this Stripe session was not found.");

  const expectedAmount = Math.round(booking.totalAmount * 100);
  if (
    session.amount_total !== expectedAmount ||
    session.currency?.toLowerCase() !== booking.currency
  ) {
    throw new Error("Stripe payment amount does not match the booking.");
  }

  if (booking.status === "cancelled") {
    throw new Error("A cancelled booking cannot be marked paid.");
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? "";
  const paidAt = new Date();

  booking.status = "confirmed";
  booking.paymentStatus = "paid";
  booking.stripePaymentIntentId = paymentIntentId;
  booking.paidAt = booking.paidAt ?? paidAt;
  await booking.save();

  await Payment.updateOne(
    { booking: booking._id },
    {
      $setOnInsert: {
        booking: booking._id,
        customer: booking.customer,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: "succeeded",
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        transactionId: paymentIntentId || session.id,
        paidAt,
      },
    },
    { upsert: true }
  );

  return booking;
}

export async function releasePendingBooking(booking: BookingDoc): Promise<void> {
  const released = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      status: "pending_payment",
      inventoryReleased: false,
    },
    {
      $set: {
        status: "cancelled",
        paymentStatus: "failed",
        inventoryReleased: true,
      },
    },
    { new: true }
  );
  if (released) {
    await Equipment.updateOne(
      { _id: released.equipment },
      { $inc: { availableQuantity: released.quantity } }
    );
  }
}

export async function completeExpiredBookings(): Promise<void> {
  const stripe = getStripe();
  const pendingReservations = await Booking.find({
    status: "pending_payment",
    inventoryReleased: false,
    reservationExpiresAt: { $lte: new Date() },
  })
    .limit(100)
    .exec();

  for (const booking of pendingReservations) {
    if (!booking.stripeSessionId) {
      await releasePendingBooking(booking);
      continue;
    }
    if (!stripe) continue;

    try {
      const session = await stripe.checkout.sessions.retrieve(
        booking.stripeSessionId
      );
      if (session.payment_status === "paid") {
        await completePaidSession(session);
      } else if (session.status === "expired") {
        await releasePendingBooking(booking);
      }
    } catch (err) {
      console.error(
        `Could not reconcile expired Stripe session ${booking.stripeSessionId}:`,
        err
      );
    }
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const expired = await Booking.find({
    status: "confirmed",
    inventoryReleased: false,
    endDate: { $lt: today },
  })
    .select("_id")
    .lean();

  for (const candidate of expired) {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: candidate._id,
        status: "confirmed",
        inventoryReleased: false,
      },
      { $set: { status: "completed", inventoryReleased: true } },
      { new: true }
    );
    if (!booking) continue;

    try {
      await Equipment.updateOne(
        { _id: booking.equipment },
        { $inc: { availableQuantity: booking.quantity } }
      );
    } catch (err) {
      await Booking.updateOne(
        { _id: booking._id, status: "completed", inventoryReleased: true },
        { $set: { status: "confirmed", inventoryReleased: false } }
      );
      throw err;
    }
  }
}

