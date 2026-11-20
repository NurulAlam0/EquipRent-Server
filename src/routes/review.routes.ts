import { Router } from "express";
import { verifyRenter, verifyToken } from "../middlewares/auth.middleware";
import * as reviewController from "../controllers/review.controller";

export const reviewsRouter = Router();

reviewsRouter.get("/equipment/:id", verifyToken, reviewController.getEquipmentReviews);
reviewsRouter.post("/equipment/:id", verifyRenter, reviewController.createEquipmentReview);
reviewsRouter.get("/", reviewController.getHomeReviews);

export default reviewsRouter;

