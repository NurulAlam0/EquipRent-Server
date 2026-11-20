import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Stripe from "stripe";
import { Booking, type BookingDoc } from "../models/Booking";
import { Equipment } from "../models/Equipment";
import { Payment } from "../models/Payment";
import {
  getStripe,
  parseBookingDate,
  getDurationUnits,
  completePaidSession,
  releasePendingBooking,
  CURRENCY,
  CHECKOUT_EXPIRY_SECONDS,
  CLIENT_ORIGIN,
} from "../services/booking.service";
import { ENV } from "../config/env";

export async function getOwnerBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const ownerId = req.user?.sub;
    if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const items = await Booking.find({ owner: ownerId })
      .sort({ createdAt: -1 })
      .populate("customer", "name email photo")
      .populate("equipment", "name image")
      .lean();

    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function getMyBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const customerId = req.user?.sub;
    if (!customerId || !mongoose.isValidObjectId(customerId)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const items = await Booking.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .populate("equipment", "name image")
      .lean();

    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function checkout(req: Request, res: Response, next: NextFunction) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({
      message: "Stripe is not configured. Set STRIPE_SECRET_KEY in server/.env.",
    });
  }
  const customerId = req.user?.sub;
  const {
    equipmentId,
    startDate: startValue,
    endDate: endValue,
    quantity: quantityValue,
    contactNumber: contactValue,
    deliveryAddress: addressValue,
    additionalNotes: notesValue,
  } = req.body ?? {};

  if (!customerId || !mongoose.isValidObjectId(customerId)) {
    return res.status(401).json({ message: "Authentication required." });
  }
  if (typeof equipmentId !== "string" || !mongoose.isValidObjectId(equipmentId)) {
    return res.status(400).json({ message: "Choose valid equipment." });
  }

  const startDate = parseBookingDate(startValue);
  const endDate = parseBookingDate(endValue);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (!startDate || !endDate || startDate < today || endDate < startDate) {
    return res.status(400).json({ message: "Choose a valid rental date range." });
  }

  const quantity = Number(quantityValue);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: "Quantity must be at least one." });
  }
  const contactNumber =
    typeof contactValue === "string" ? contactValue.trim() : "";
  const deliveryAddress =
    typeof addressValue === "string" ? addressValue.trim() : "";
  const additionalNotes =
    typeof notesValue === "string" ? notesValue.trim().slice(0, 1000) : "";
  if (
    contactNumber.length < 7 ||
    contactNumber.length > 30 ||
    deliveryAddress.length < 5 ||
    deliveryAddress.length > 300
  ) {
    return res.status(400).json({
      message: "Enter a valid contact number and delivery address.",
    });
  }

  let booking: BookingDoc | null = null;
  let reservedEquipmentId: mongoose.Types.ObjectId | null = null;
  let checkoutSession: Stripe.Checkout.Session | null = null;
  const reservationExpiresAt = new Date(
    Date.now() + CHECKOUT_EXPIRY_SECONDS * 1000
  );

  try {
    const equipment = await Equipment.findOneAndUpdate(
      {
        _id: equipmentId,
        status: "approved",
        owner: { $ne: customerId },
        availableQuantity: { $gte: quantity },
      },
      { $inc: { availableQuantity: -quantity } },
      { new: true }
    );
    if (!equipment) {
      const listing = await Equipment.findById(equipmentId)
        .select("status owner availableQuantity")
        .lean();
      if (!listing || listing.status !== "approved") {
        return res.status(404).json({ message: "Equipment is not available." });
      }
      if (String(listing.owner) === customerId) {
        return res.status(403).json({ message: "You cannot rent your own equipment." });
      }
      return res.status(409).json({
        message: "The requested quantity is no longer available.",
      });
    }

    reservedEquipmentId = equipment._id;
    const durationUnits = getDurationUnits(
      startDate,
      endDate,
      equipment.rentalType
    );
    const unitAmountMinor = Math.round(
      equipment.rentalPrice * durationUnits * 100
    );
    const totalAmount = (unitAmountMinor * quantity) / 100;
    if (
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0 ||
      Math.round(totalAmount * 100) > 99_999_999
    ) {
      await Equipment.updateOne(
        { _id: equipment._id },
        { $inc: { availableQuantity: quantity } }
      );
      reservedEquipmentId = null;
      return res.status(400).json({ message: "The rental total is invalid." });
    }

    booking = await Booking.create({
      equipment: equipment._id,
      customer: customerId,
      owner: equipment.owner,
      startDate,
      endDate,
      durationUnits,
      rentalType: equipment.rentalType,
      quantity,
      contactNumber,
      deliveryAddress,
      additionalNotes,
      totalAmount,
      currency: CURRENCY,
      status: "pending_payment",
      paymentStatus: "unpaid",
      inventoryReleased: false,
      reservationExpiresAt,
    });

    checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: String(booking._id),
      expires_at: Math.floor(reservationExpiresAt.getTime() / 1000),
      line_items: [
        {
          quantity,
          price_data: {
            currency: CURRENCY,
            unit_amount: unitAmountMinor,
            product_data: {
              name: equipment.name,
              description: `${durationUnits} ${equipment.rentalType.toLowerCase()} period(s)`,
              images: /^https:\/\//i.test(equipment.image)
                ? [equipment.image]
                : undefined,
            },
          },
        },
      ],
      metadata: {
        bookingId: String(booking._id),
        customerId,
        equipmentId: String(equipment._id),
      },
      success_url: `${CLIENT_ORIGIN}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_ORIGIN}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
    });

    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    await Booking.updateOne(
      { _id: booking._id },
      { $set: { stripeSessionId: checkoutSession.id } }
    );
    return res.status(201).json({ url: checkoutSession.url });
  } catch (err) {
    if (checkoutSession?.status === "open") {
      try {
        await stripe.checkout.sessions.expire(checkoutSession.id);
      } catch {
        // The reservation is still released below; Stripe expiry can retry.
      }
    }
    if (booking) {
      await Booking.updateOne(
        { _id: booking._id, status: "pending_payment" },
        { $set: { status: "cancelled", paymentStatus: "failed", inventoryReleased: true } }
      );
    }
    if (reservedEquipmentId) {
      await Equipment.updateOne(
        { _id: reservedEquipmentId },
        { $inc: { availableQuantity: quantity } }
      );
    }
    if (err instanceof Stripe.errors.StripeError) {
      console.error("Stripe Checkout creation failed:", err.message);
      return res.status(502).json({
        message: `Stripe could not start checkout: ${err.message}`,
      });
    }
    return next(err);
  }
}

export async function verifyBooking(req: Request, res: Response, next: NextFunction) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ message: "Stripe is not configured." });
  }

  const sessionId =
    typeof req.query.session_id === "string" ? req.query.session_id : "";
  if (!sessionId.startsWith("cs_")) {
    return res.status(400).json({ message: "A valid Stripe session is required." });
  }

  try {
    const booking = await Booking.findOne({
      stripeSessionId: sessionId,
      customer: req.user?.sub,
    }).populate("equipment", "name image");
    if (!booking) {
      return res.status(404).json({ message: "Booking was not found." });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.metadata?.bookingId !== String(booking._id) ||
      session.metadata?.customerId !== req.user?.sub
    ) {
      return res.status(403).json({ message: "This checkout does not belong to you." });
    }
    if (session.payment_status !== "paid") {
      return res.status(402).json({ message: "Payment has not completed yet." });
    }

    await completePaidSession(session);
    const payment = await Payment.findOne({ booking: booking._id }).lean();
    return res.json({
      booking: {
        id: String(booking._id),
        equipment: booking.equipment,
        startDate: booking.startDate,
        endDate: booking.endDate,
        quantity: booking.quantity,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        transactionId: payment?.transactionId ?? session.id,
        paymentStatus: "paid",
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function cancelBooking(req: Request, res: Response, next: NextFunction) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ message: "Stripe is not configured." });
  }
  const sessionId =
    typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
  if (!sessionId.startsWith("cs_")) {
    return res.status(400).json({ message: "A valid Stripe session is required." });
  }

  try {
    const booking = await Booking.findOne({
      stripeSessionId: sessionId,
      customer: req.user?.sub,
    });
    if (!booking) {
      return res.status(404).json({ message: "Booking was not found." });
    }

    let session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open") {
      session = await stripe.checkout.sessions.expire(sessionId);
    }
    if (session.payment_status === "paid") {
      await completePaidSession(session);
      return res.status(409).json({
        message: "Payment completed. The booking has been confirmed.",
      });
    }
    if (session.status === "expired") {
      await releasePendingBooking(booking);
    }
    return res.json({ cancelled: session.status === "expired" });
  } catch (err) {
    return next(err);
  }
}

export async function stripeWebhook(req: Request, res: Response) {
  const stripe = getStripe();
  const webhookSecret = ENV.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = req.headers["stripe-signature"];
  if (!stripe || !webhookSecret) {
    return res.status(503).send("Stripe webhook is not configured.");
  }
  if (typeof signature !== "string" || !Buffer.isBuffer(req.body)) {
    return res.status(400).send("Invalid Stripe webhook request.");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch {
    return res.status(400).send("Invalid Stripe webhook signature.");
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await completePaidSession(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const booking = await Booking.findOne({ stripeSessionId: session.id });
      if (booking) await releasePendingBooking(booking);
    } else if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const booking = await Booking.findOne({ stripeSessionId: session.id });
      if (booking) await releasePendingBooking(booking);
    }
    return res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook processing failed:", err);
    return res.status(500).send("Webhook processing failed.");
  }
}

