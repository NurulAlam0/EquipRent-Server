import { Router } from "express";
import { authRouter } from "./auth.routes";
import { adminRouter } from "./admin.routes";
import { equipmentRouter } from "./equipment.routes";
import { bookingsRouter } from "./booking.routes";
import { reviewsRouter } from "./review.routes";
import { favoritesRouter } from "./favorite.routes";
import { ownerRouter } from "./owner.routes";
import { cronRouter } from "./cron.routes";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/equipment", equipmentRouter);
apiRouter.use("/bookings", bookingsRouter);
apiRouter.use("/reviews", reviewsRouter);
apiRouter.use("/favorites", favoritesRouter);
apiRouter.use("/owner", ownerRouter);
apiRouter.use("/cron", cronRouter);

export {
  apiRouter,
  authRouter,
  adminRouter,
  equipmentRouter,
  bookingsRouter,
  reviewsRouter,
  favoritesRouter,
  ownerRouter,
  cronRouter,
};

export default apiRouter;
