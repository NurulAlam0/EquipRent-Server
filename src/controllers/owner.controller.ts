import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking";
import { Equipment } from "../models/Equipment";
import { Payment } from "../models/Payment";

export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const ownerId = req.user?.sub;
    if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    monthStart.setMonth(monthStart.getMonth() - 5);

    const [totalListedEquipment, completedRentals, paymentAnalytics] =
      await Promise.all([
        Equipment.countDocuments({ owner: ownerObjectId }),
        Booking.countDocuments({ owner: ownerObjectId, status: "completed" }),
        Payment.aggregate([
          { $match: { status: "succeeded" } },
          {
            $lookup: {
              from: Booking.collection.name,
              localField: "booking",
              foreignField: "_id",
              as: "booking",
            },
          },
          { $unwind: "$booking" },
          { $match: { "booking.owner": ownerObjectId } },
          {
            $facet: {
              total: [{ $group: { _id: null, amount: { $sum: "$amount" } } }],
              monthly: [
                { $match: { paidAt: { $gte: monthStart } } },
                {
                  $group: {
                    _id: {
                      year: { $year: "$paidAt" },
                      month: { $month: "$paidAt" },
                    },
                    earnings: { $sum: "$amount" },
                  },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
              ],
            },
          },
        ]),
      ]);

    const analytics = paymentAnalytics[0];
    return res.json({
      stats: {
        totalListedEquipment,
        completedRentals,
        totalEarnings: analytics?.total[0]?.amount ?? 0,
      },
      monthlyEarnings: analytics?.monthly ?? [],
    });
  } catch (err) {
    return next(err);
  }
}

