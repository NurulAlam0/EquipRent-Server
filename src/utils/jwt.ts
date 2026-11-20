import jwt from "jsonwebtoken";
import type { UserRole } from "../models/User";

/** Claims carried by the JWT access token. */
export type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set in server/.env");
  return secret;
}

/** Generates the access token issued on successful login/register. */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
}

/** Verifies an access token and returns its claims. Throws if invalid/expired. */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, getSecret()) as TokenPayload;
}
