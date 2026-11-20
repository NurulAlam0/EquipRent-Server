import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ENV } from "./config/env";
import apiRouter from "./routes";
import { stripeWebhook } from "./controllers/booking.controller";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";

export const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));

// Stripe webhook must receive raw binary body before express.json middleware
app.post(
  "/api/bookings/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// Standard body parsers
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Health check endpoint
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "rentora-api" });
});

// Mount application API routes
app.use("/api", apiRouter);

// 404 Catch-all handler
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;

