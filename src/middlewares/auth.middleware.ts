import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User";
import { verifyAccessToken, type TokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      /** Set by verifyToken once the JWT has been validated. */
      user?: TokenPayload;
    }
  }
}

/** Pulls the JWT from the Authorization header or the httpOnly cookie. */
function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookie = req.cookies?.access_token;
  if (cookie) return String(cookie);
  return null;
}

/**
 * Verifies the JWT access token. On success attaches the claims to
 * `req.user` and continues; otherwise responds 401.
 */
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  let payload: TokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  try {
    const user = await User.findById(payload.sub)
      .select("email name role")
      .lean();
    if (!user) {
      return res.status(401).json({ message: "Account no longer exists." });
    }

    req.user = {
      ...payload,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

/** verifyToken + customer (renter) role check. */
export function verifyRenter(req: Request, res: Response, next: NextFunction) {
  verifyToken(req, res, () => {
    if (req.user?.role !== "customer") {
      return res.status(403).json({ message: "Access denied: customers only." });
    }
    return next();
  });
}

/** verifyToken + equipment owner role check (admins may pass too). */
export function verifyOwner(req: Request, res: Response, next: NextFunction) {
  verifyToken(req, res, () => {
    const role = req.user?.role;
    if (role !== "owner" && role !== "admin") {
      return res.status(403).json({ message: "Access denied: owners only." });
    }
    return next();
  });
}

/** verifyToken + admin role check. */
export function verifyAdmin(req: Request, res: Response, next: NextFunction) {
  verifyToken(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Access denied: admins only." });
    }
    return next();
  });
}

