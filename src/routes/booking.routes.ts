import { Router } from "express";
import { verifyOwner, verifyRenter } from "../middlewares/auth.middleware";
import * as bookingController from "../controllers/booking.controller";

export const bookingsRouter = Router();

bookingsRouter.get("/owner", verifyOwner, bookingController.getOwnerBookings);
bookingsRouter.get("/mine", verifyRenter, bookingController.getMyBookings);
bookingsRouter.post("/checkout", verifyRenter, bookingController.checkout);
bookingsRouter.get("/verify", verifyRenter, bookingController.verifyBooking);
bookingsRouter.post("/cancel", verifyRenter, bookingController.cancelBooking);

export default bookingsRouter;

