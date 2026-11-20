import { Router, type Request, type Response, type NextFunction } from "express";
import { completeExpiredBookings } from "../services/booking.service";

export const cronRouter = Router();

cronRouter.get(
  "/release-expired",
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const expectedAuth = process.env.CRON_SECRET
      ? `Bearer ${process.env.CRON_SECRET}`
      : null;

    if (!expectedAuth || authHeader !== expectedAuth) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      await completeExpiredBookings();
      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  }
);

export default cronRouter;

