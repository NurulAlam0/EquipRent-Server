import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking";
import { Equipment } from "../models/Equipment";
import { Favorite } from "../models/Favorite";
import { Payment } from "../models/Payment";
import { User, type UserRole } from "../models/User";
import { validateEquipmentInput } from "./equipment.controller";

const USER_ROLES: readonly UserRole[] = ["customer", "owner", "admin"];
const ACTIVE_BOOKING_STATUSES = ["pending_payment", "confirmed"];

export async function getOverview(_req: Request, res: Response, next: NextFunction) {
  try {
    const [
      totalUsers,
      totalEquipment,
      totalBookings,
      pendingApprovals,
      completedRentals,
      revenueRows,
      monthlyBookings,
    ] = await Promise.all([
      User.countDocuments(),
      Equipment.countDocuments(),
      Booking.countDocuments(),
      Equipment.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: "completed" }),
      Payment.aggregate([
        { $match: { status: "succeeded" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Booking.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            bookings: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    return res.json({
      stats: {
        totalUsers,
        totalEquipment,
        totalBookings,
        pendingApprovals,
        completedRentals,
        totalRevenue: revenueRows[0]?.total ?? 0,
      },
      monthlyBookings,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await User.find()
      .select("name email photo role createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const adminId = req.user?.sub;
    const role = req.body?.role;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "User not found." });
    }
    if (!(USER_ROLES as readonly unknown[]).includes(role)) {
      return res.status(400).json({ message: "Choose a valid user role." });
    }
    if (id === adminId) {
      return res.status(400).json({
        message: "You cannot change your own administrator role.",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (user.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(409).json({
          message: "The last administrator cannot be demoted.",
        });
      }
    }

    user.role = role as UserRole;
    await user.save();
    return res.json({
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getEquipment(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await Equipment.find()
      .sort({ createdAt: -1 })
      .populate("owner", "name email")
      .lean();
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function updateEquipmentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const status = req.body?.status;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({
        message: "Equipment status must be approved or rejected.",
      });
    }
    const item = await Equipment.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    ).lean();
    if (!item) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    return res.json({ item });
  } catch (err) {
    return next(err);
  }
}

export async function updateEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    const body =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};
    const result = validateEquipmentInput(body);
    if ("error" in result) {
      return res.status(400).json({ message: result.error });
    }

    const item = await Equipment.findByIdAndUpdate(
      id,
      { $set: result.fields },
      { new: true, runValidators: true }
    ).lean();
    if (!item) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    return res.json({ item });
  } catch (err) {
    return next(err);
  }
}

export async function deleteEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    const activeBooking = await Booking.exists({
      equipment: id,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    });
    if (activeBooking) {
      return res.status(409).json({
        message: "Equipment with active rentals cannot be deleted.",
      });
    }

    const item = await Equipment.findByIdAndDelete(id).select("_id");
    if (!item) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    await Favorite.deleteMany({ equipment: id });
    return res.json({ deleted: true });
  } catch (err) {
    return next(err);
  }
}

export async function getBookings(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await Booking.find()
      .sort({ createdAt: -1 })
      .populate("customer", "name email photo")
      .populate("owner", "name email photo")
      .populate("equipment", "name image")
      .lean();
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

