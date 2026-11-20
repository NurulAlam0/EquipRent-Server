import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Favorite } from "../models/Favorite";
import { Equipment } from "../models/Equipment";

function currentUserId(req: Request): string | null {
  return req.user?.sub ?? null;
}

export async function getFavorites(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = currentUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const rows = await Favorite.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("equipment")
      .lean();

    // Equipment deleted since it was saved would populate as null — drop it.
    const items = rows.filter((row) => row.equipment);

    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function addFavorite(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = currentUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { equipmentId } = req.params;
    if (!mongoose.isValidObjectId(equipmentId)) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    const exists = await Equipment.exists({ _id: equipmentId });
    if (!exists) {
      return res.status(404).json({ message: "Equipment not found." });
    }

    try {
      await Favorite.updateOne(
        { user: userId, equipment: equipmentId },
        { $setOnInsert: { user: userId, equipment: equipmentId } },
        { upsert: true }
      );
    } catch (err) {
      // Two saves in the same tick can race the unique index — the row
      // exists either way, so report success rather than a duplicate error.
      if ((err as { code?: number }).code !== 11000) throw err;
    }

    return res.json({ saved: true });
  } catch (err) {
    return next(err);
  }
}

export async function removeFavorite(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = currentUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { equipmentId } = req.params;
    if (!mongoose.isValidObjectId(equipmentId)) {
      return res.status(404).json({ message: "Equipment not found." });
    }

    // Deleting zero rows still leaves the caller in the desired state.
    await Favorite.deleteOne({ user: userId, equipment: equipmentId });

    return res.json({ saved: false });
  } catch (err) {
    return next(err);
  }
}

