import type { NextFunction, Request, Response } from "express";

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({ message: "Route not found" });
}

export function errorHandler(
  err: Error & {
    code?: string | number;
    keyPattern?: Record<string, number>;
  },
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  if (String(err.code) === "11000") {
    if (err.keyPattern?.image) {
      return res.status(409).json({
        message: "This equipment image is already used by another listing.",
      });
    }
    return res.status(409).json({
      message: "An account with this email already exists. Please sign in.",
    });
  }
  return res.status(500).json({ message: "Internal server error" });
}

