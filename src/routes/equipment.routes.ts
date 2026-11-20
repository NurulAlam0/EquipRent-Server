import express, { Router } from "express";
import { verifyOwner, verifyToken } from "../middlewares/auth.middleware";
import * as equipmentController from "../controllers/equipment.controller";

export const equipmentRouter = Router();

equipmentRouter.post("/", verifyOwner, equipmentController.createEquipment);
equipmentRouter.get("/mine", verifyOwner, equipmentController.getMyEquipment);
equipmentRouter.patch("/:id", verifyOwner, equipmentController.updateEquipment);
equipmentRouter.delete("/:id", verifyOwner, equipmentController.deleteEquipment);
equipmentRouter.post(
  "/upload-image",
  verifyOwner,
  express.text({ type: "text/plain", limit: "8mb" }),
  equipmentController.uploadImage
);
equipmentRouter.get("/featured", equipmentController.getFeaturedEquipment);
equipmentRouter.get("/popular", equipmentController.getPopularEquipment);
equipmentRouter.get("/", equipmentController.getAllEquipment);
equipmentRouter.get("/:id", verifyToken, equipmentController.getEquipmentById);

export default equipmentRouter;

