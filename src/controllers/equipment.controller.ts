import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { EQUIPMENT_CATEGORIES, Equipment } from "../models/Equipment";
import { Booking } from "../models/Booking";
import { Favorite } from "../models/Favorite";
import { User } from "../models/User";
import { ENV } from "../config/env";

export const RENTAL_TYPES = ["Daily", "Weekly", "Monthly"] as const;
export const EQUIPMENT_SORTS = ["recent", "price-asc", "price-desc"] as const;

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type EquipmentInput = {
  name: string;
  description: string;
  category: (typeof EQUIPMENT_CATEGORIES)[number];
  location: string;
  rentalPrice: number;
  rentalType: (typeof RENTAL_TYPES)[number];
  availableQuantity: number;
  condition: string;
  brand: string;
  model: string;
  image: string;
  rentalTerms: string;
};

export function validateEquipmentInput(body: Record<string, unknown>):
  | { fields: EquipmentInput }
  | { error: string } {
  const text = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";
  const name = text(body.name);
  const description = text(body.description);
  const category = text(body.category);
  const location = text(body.location);
  const rentalType = text(body.rentalType);
  const brand = text(body.brand);
  const model = text(body.model);
  const condition = text(body.condition);
  const image = text(body.image);
  const rentalTerms = text(body.rentalTerms);
  const rentalPrice = Number(body.rentalPrice);
  const availableQuantity = Number(body.availableQuantity);

  if (
    name.length < 2 ||
    !description ||
    !location ||
    !brand ||
    !model ||
    !condition ||
    !rentalTerms
  ) {
    return { error: "Please complete all equipment information fields." };
  }
  if (
    !EQUIPMENT_CATEGORIES.includes(
      category as (typeof EQUIPMENT_CATEGORIES)[number]
    )
  ) {
    return { error: "Choose a valid category." };
  }
  if (!(RENTAL_TYPES as readonly string[]).includes(rentalType)) {
    return { error: "Choose a valid rental type." };
  }
  if (!Number.isFinite(rentalPrice) || rentalPrice <= 0) {
    return { error: "Rental price must be greater than zero." };
  }
  if (!Number.isInteger(availableQuantity) || availableQuantity < 1) {
    return { error: "Available quantity must be at least one." };
  }
  if (!/^https:\/\/\S+$/i.test(image)) {
    return { error: "Upload an equipment image before submitting." };
  }

  return {
    fields: {
      name,
      description,
      category: category as EquipmentInput["category"],
      location,
      rentalPrice,
      rentalType: rentalType as EquipmentInput["rentalType"],
      availableQuantity,
      condition,
      brand,
      model,
      image,
      rentalTerms,
    },
  };
}

export async function createEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const body =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};
    const result = validateEquipmentInput(body);
    if ("error" in result) {
      return res.status(400).json({ message: result.error });
    }
    if (!req.user?.sub || !mongoose.isValidObjectId(req.user.sub)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const item = await Equipment.create({
      ...result.fields,
      status: "pending",
      owner: req.user.sub,
    });

    return res.status(201).json({ item });
  } catch (err) {
    return next(err);
  }
}

export async function getMyEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const ownerId = req.user?.sub;
    if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const items = await Equipment.find({ owner: ownerId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function updateEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const ownerId = req.user?.sub;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const body =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};
    const result = validateEquipmentInput(body);
    if ("error" in result) {
      return res.status(400).json({ message: result.error });
    }

    const item = await Equipment.findOneAndUpdate(
      { _id: id, owner: ownerId },
      { $set: { ...result.fields, status: "pending" } },
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
    const ownerId = req.user?.sub;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const item = await Equipment.findOne({ _id: id, owner: ownerId }).select("_id");
    if (!item) {
      return res.status(404).json({ message: "Equipment not found." });
    }
    const activeBooking = await Booking.exists({
      equipment: id,
      status: { $in: ["pending_payment", "confirmed"] },
    });
    if (activeBooking) {
      return res.status(409).json({
        message: "This equipment has active rentals and cannot be deleted yet.",
      });
    }

    await Promise.all([
      Equipment.deleteOne({ _id: id, owner: ownerId }),
      Favorite.deleteMany({ equipment: id }),
    ]);
    return res.json({ deleted: true });
  } catch (err) {
    return next(err);
  }
}

export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  const apiKey = ENV.IMGBB_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      message:
        "Image uploads are not configured. Add IMGBB_API_KEY to server/.env.",
    });
  }

  const image = typeof req.body === "string" ? req.body.trim() : "";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    return res.status(400).json({ message: "Choose a valid image file." });
  }

  try {
    const form = new FormData();
    form.set("image", image);
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
      { method: "POST", body: form }
    );
    const result = (await response.json()) as {
      success?: boolean;
      data?: { url?: string };
      error?: { message?: string };
    };

    if (!response.ok || !result.success || !result.data?.url) {
      return res.status(502).json({
        message: result.error?.message ?? "The image host could not upload this file.",
      });
    }

    return res.json({ url: result.data.url });
  } catch (err) {
    return next(err);
  }
}

export async function getFeaturedEquipment(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await Equipment.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function getPopularEquipment(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await Equipment.find({ status: "approved" })
      .sort({ reviews: -1, rating: -1 })
      .limit(4)
      .lean();
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function getAllEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const queryValue = (key: string) => {
      const value = req.query[key];
      return typeof value === "string" ? value.trim() : "";
    };

    const search = queryValue("search");
    const location = queryValue("location");
    const category = queryValue("category");
    const rentalType = queryValue("rentalType");
    const availability = queryValue("availability");
    const sort = queryValue("sort") || "recent";
    const minPriceValue = queryValue("minPrice");
    const maxPriceValue = queryValue("maxPrice");
    const pageValue = queryValue("page") || "1";
    const pageSizeValue = queryValue("pageSize") || "9";
    const minPrice = minPriceValue ? Number(minPriceValue) : undefined;
    const maxPrice = maxPriceValue ? Number(maxPriceValue) : undefined;
    const page = Number(pageValue);
    const pageSize = Number(pageSizeValue);

    if (
      (minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) ||
      (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) ||
      (minPrice !== undefined &&
        maxPrice !== undefined &&
        minPrice > maxPrice)
    ) {
      return res.status(400).json({ message: "Choose a valid price range." });
    }
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 24
    ) {
      return res.status(400).json({ message: "Choose a valid page." });
    }
    if (
      category &&
      !EQUIPMENT_CATEGORIES.includes(
        category as (typeof EQUIPMENT_CATEGORIES)[number]
      )
    ) {
      return res.status(400).json({ message: "Choose a valid category." });
    }
    if (
      rentalType &&
      !(RENTAL_TYPES as readonly string[]).includes(rentalType)
    ) {
      return res.status(400).json({ message: "Choose a valid rental type." });
    }
    if (!["all", "available", "unavailable"].includes(availability || "all")) {
      return res.status(400).json({ message: "Choose a valid availability." });
    }
    if (!(EQUIPMENT_SORTS as readonly string[]).includes(sort)) {
      return res.status(400).json({ message: "Choose a valid sort order." });
    }

    const filter: Record<string, unknown> = { status: "approved" };
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { name: expression },
        { category: expression },
      ];
    }
    if (location) {
      filter.location = new RegExp(escapeRegex(location), "i");
    }
    if (category) filter.category = category;
    if (rentalType) filter.rentalType = rentalType;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.rentalPrice = {
        ...(minPrice !== undefined ? { $gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { $lte: maxPrice } : {}),
      };
    }
    if (availability === "available") filter.availableQuantity = { $gt: 0 };
    if (availability === "unavailable") filter.availableQuantity = { $lte: 0 };

    const sortOrder: Record<string, 1 | -1> =
      sort === "price-asc"
        ? { rentalPrice: 1 as const }
        : sort === "price-desc"
          ? { rentalPrice: -1 as const }
          : { createdAt: -1 as const };

    const total = await Equipment.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const items = await Equipment.find(filter)
      .sort(sortOrder)
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean();
    return res.json({
      items,
      total,
      page: currentPage,
      pageSize,
      totalPages,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getEquipmentById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Equipment not found." });
    }

    const item = await Equipment.findById(id).lean();
    if (!item) {
      return res.status(404).json({ message: "Equipment not found." });
    }

    const isOwner = req.user?.sub === String(item.owner);
    const isAdmin = req.user?.role === "admin";
    if (item.status !== "approved" && !isOwner && !isAdmin) {
      return res.status(404).json({ message: "Equipment not found." });
    }

    const owner = await User.findById(item.owner)
      .select("name email photo role createdAt")
      .lean();

    return res.json({ item: { ...item, owner } });
  } catch (err) {
    return next(err);
  }
}

