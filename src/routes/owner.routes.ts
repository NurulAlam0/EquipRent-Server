import { Router } from "express";
import { verifyOwner } from "../middlewares/auth.middleware";
import * as ownerController from "../controllers/owner.controller";

export const ownerRouter = Router();

ownerRouter.get("/overview", verifyOwner, ownerController.getOverview);

export default ownerRouter;

