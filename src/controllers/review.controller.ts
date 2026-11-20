import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking";
import { Equipment } from "../models/Equipment";
import { EquipmentReview } from "../models/EquipmentReview";
import { Review } from "../models/Review";

export async function getEquipmentReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Equipment not found." });
    }

    const equipment = await Equipment.findById(id)
      .select("_id owner status")
      .lean();
    if (!equipment) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    const canView =
      equipment.status === "approved" ||
      req.user?.role === "admin" ||
      req.user?.sub === String(equipment.owner);
    if (!canView) {
      return res.status(404).json({ message: "Equipment not found." });
    }

    const [items, stats] = await Promise.all([
      EquipmentReview.find({ equipment: id })
        .select("customerName rating comment createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      EquipmentReview.aggregate([
        {
          $match: { equipment: new mongoose.Types.ObjectId(id) },
        },
        {
          $group: {
            _id: null,
            rating: { $avg: "$rating" },
            reviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    let completedBookings: Array<{
      _id: mongoose.Types.ObjectId;
      startDate: Date;
      endDate: Date;
    }> = [];
    if (req.user?.role === "customer" && req.user.sub) {
      completedBookings = await Booking.find({
        equipment: id,
        customer: req.user.sub,
        status: "completed",
        paymentStatus: "paid",
      })
        .select("_id startDate endDate")
        .sort({ endDate: -1 })
        .lean();
    }

    const reviewedBookings = await EquipmentReview.find({
      booking: { $in: completedBookings.map((booking) => booking._id) },
    })
      .select("booking")
      .lean();
    const reviewedIds = new Set(
      reviewedBookings.map((review) => String(review.booking))
    );
    const eligibleBookings = completedBookings
      .filter((booking) => !reviewedIds.has(String(booking._id)))
      .map((booking) => ({
        _id: String(booking._id),
        startDate: booking.startDate,
        endDate: booking.endDate,
      }));

    return res.json({
      items,
      eligibleBookings,
      hasCompletedRental: completedBookings.length > 0,
      rating: Number(stats[0]?.rating ?? 0),
      reviews: Number(stats[0]?.reviews ?? 0),
    });
  } catch (err) {
    return next(err);
  }
}

export async function createEquipmentReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const customerId = req.user?.sub;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    if (!customerId || !mongoose.isValidObjectId(customerId)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const body =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};
    const bookingId =
      typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ message: "Choose a valid rental." });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be from 1 to 5." });
    }
    if (comment.length < 3 || comment.length > 1000) {
      return res.status(400).json({
        message: "Comment must be between 3 and 1000 characters.",
      });
    }

    const [equipment, booking] = await Promise.all([
      Equipment.findById(id).select("_id").lean(),
      Booking.findOne({
        _id: bookingId,
        equipment: id,
        customer: customerId,
        status: "completed",
        paymentStatus: "paid",
      })
        .select("_id")
        .lean(),
    ]);
    if (!equipment) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    if (!booking) {
      return res.status(403).json({
        message: "Only customers with a paid, completed rental can review this equipment.",
      });
    }

    const existing = await EquipmentReview.exists({ booking: bookingId });
    if (existing) {
      return res.status(409).json({
        message: "You have already reviewed this rental.",
      });
    }

    let item;
    try {
      item = await EquipmentReview.create({
        equipment: id,
        booking: bookingId,
        customer: customerId,
        customerName: req.user?.name || "Customer",
        rating,
        comment,
      });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === 11000
      ) {
        return res.status(409).json({
          message: "You have already reviewed this rental.",
        });
      }
      throw err;
    }

    const [stats] = await EquipmentReview.aggregate([
      {
        $match: { equipment: new mongoose.Types.ObjectId(id) },
      },
      {
        $group: {
          _id: null,
          rating: { $avg: "$rating" },
          reviews: { $sum: 1 },
        },
      },
    ]);
    const averageRating = Number(stats?.rating ?? 0);
    const reviewCount = Number(stats?.reviews ?? 0);
    await Equipment.updateOne(
      { _id: id },
      { $set: { rating: averageRating, reviews: reviewCount } }
    );

    return res.status(201).json({
      item: {
        _id: String(item._id),
        customerName: item.customerName,
        rating: item.rating,
        comment: item.comment,
        createdAt: item.createdAt,
      },
      rating: averageRating,
      reviews: reviewCount,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getHomeReviews(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await Review.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

