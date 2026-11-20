import { Router } from "express";
import { verifyAdmin } from "../middlewares/auth.middleware";
import * as adminController from "../controllers/admin.controller";

export const adminRouter = Router();

adminRouter.use(verifyAdmin);

adminRouter.get("/overview", adminController.getOverview);
adminRouter.get("/users", adminController.getUsers);
adminRouter.patch("/users/:id/role", adminController.updateUserRole);
adminRouter.get("/equipment", adminController.getEquipment);
adminRouter.patch("/equipment/:id/status", adminController.updateEquipmentStatus);
adminRouter.patch("/equipment/:id", adminController.updateEquipment);
adminRouter.delete("/equipment/:id", adminController.deleteEquipment);
adminRouter.get("/bookings", adminController.getBookings);

export default adminRouter;

