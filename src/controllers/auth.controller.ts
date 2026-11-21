import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { publicUser, User, type UserDoc } from "../models/User";
import { signToken } from "../utils/jwt";
import { ENV } from "../config/env";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHOTO_RE = /^(https:\/\/|\/)/;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const isGoogleConfigured = Boolean(
  ENV.GOOGLE_CLIENT_ID &&
    ENV.GOOGLE_CLIENT_SECRET &&
    !ENV.GOOGLE_CLIENT_ID.includes("PASTE")
);

/** httpOnly cookie carrying the JWT so Next.js middleware can guard pages. */
export function setAuthCookie(res: Response, token: string, maxAge?: number) {
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  });
}

export function issueAuth(res: Response, user: UserDoc, persist: boolean) {
  const token = signToken({
    sub: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
  });
  setAuthCookie(res, token, persist ? WEEK_MS : undefined);
  return token;
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, photo, password } = req.body ?? {};

    const trimmedName = String(name ?? "").trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ message: "Please enter your full name." });
    }

    const trimmedEmail = String(email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email address." });
    }

    const trimmedPhoto = String(photo ?? "").trim();
    if (!PHOTO_RE.test(trimmedPhoto)) {
      return res.status(400).json({
        message:
          "Photo must be a valid image URL starting with https:// (or /image/...).",
      });
    }

    if (typeof password !== "string" || !/[A-Z]/.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must include an uppercase letter." });
    }
    if (!/[a-z]/.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must include a lowercase letter." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(409).json({
        message: "An account with this email already exists. Please sign in.",
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      photo: trimmedPhoto,
      password: hash,
      role: "customer",
    });

    const token = issueAuth(res, user, true);
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, keepSignedIn } = req.body ?? {};

    const trimmedEmail = String(email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email address." });
    }
    if (typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Please enter your password." });
    }

    const user = await User.findOne({ email: trimmedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({
        message: "No account found for this email. Please sign up first.",
      });
    }
    if (!user.password) {
      return res.status(401).json({
        message: "This account uses Google sign-in. Please continue with Google.",
      });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res
        .status(401)
        .json({ message: "Incorrect password. Please try again." });
    }

    const token = issueAuth(res, user, Boolean(keepSignedIn));
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
}

export function logout(_req: Request, res: Response) {
  // Clear with the same attributes used when the cookie was set, or the
  // cross-site cookie survives in production (sameSite: "none" + secure).
  res.clearCookie("access_token", {
    path: "/",
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.json({ message: "Logged out successfully." });
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user?.sub);
    if (!user) {
      return res.status(404).json({ message: "User no longer exists." });
    }
    // Also return a fresh JWT: the Next.js client lives on a different
    // origin, so it cannot read the server-domain `access_token` cookie.
    // A Google sign-in lands with only that cookie; exchanging it here
    // for a Bearer token is what lets the client call the API (and the
    // route guard verify the session) after a reload.
    const token = signToken({
      sub: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    });
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user?.sub);
    if (!user) {
      return res.status(404).json({ message: "User no longer exists." });
    }

    const { name, photo, phoneNumber, address } = req.body ?? {};
    if (typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ message: "Please enter your full name." });
    }
    if (
      typeof photo !== "string" ||
      (photo.trim() !== "" && !PHOTO_RE.test(photo.trim()))
    ) {
      return res.status(400).json({ message: "Enter a valid profile image URL." });
    }
    if (
      typeof phoneNumber !== "string" ||
      phoneNumber.trim().length > 30
    ) {
      return res.status(400).json({ message: "Enter a valid phone number." });
    }
    if (typeof address !== "string" || address.trim().length > 300) {
      return res.status(400).json({ message: "Address must be 300 characters or fewer." });
    }

    user.name = name.trim();
    user.photo = photo.trim();
    user.phoneNumber = phoneNumber.trim();
    user.address = address.trim();
    await user.save();

    return res.json({ user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lets a signed-in customer switch to the owner role (and back to the
 * owner dashboard) without waiting for an admin to promote them. The
 * project's own smoke test (`scripts/smoke.mjs`) expects this endpoint;
 * it did not exist before, so the owner flow was unreachable from the UI.
 * Admins cannot use it, and it returns a fresh JWT carrying the new role.
 */
export async function becomeOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user?.sub);
    if (!user) {
      return res.status(404).json({ message: "User no longer exists." });
    }
    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin accounts cannot switch to the owner role.",
      });
    }
    if (user.role !== "owner") {
      user.role = "owner";
      await user.save();
    }
    const token = issueAuth(res, user, true);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
}

export function verify(req: Request, res: Response) {
  return res.json({ role: req.user?.role, email: req.user?.email });
}

export function googleRedirect(_req: Request, res: Response) {
  if (!isGoogleConfigured) {
    return res.redirect(`${ENV.CLIENT_URL}/login?error=google-config`);
  }

  const state = crypto.randomUUID();
  res.cookie("oauth_state", state, {
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    sameSite: "lax",
    path: "/",
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", ENV.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", ENV.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return res.redirect(url.toString());
}

export async function googleCallback(req: Request, res: Response) {
  const fail = () => res.redirect(`${ENV.CLIENT_URL}/login?error=google-failed`);
  try {
    const { code, state } = req.query;
    const expectedState = req.cookies?.oauth_state;
    res.clearCookie("oauth_state", { path: "/" });

    if (!code || !state || !expectedState || state !== expectedState) {
      return fail();
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: ENV.GOOGLE_CLIENT_ID,
        client_secret: ENV.GOOGLE_CLIENT_SECRET,
        redirect_uri: ENV.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail();

    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) return fail();

    const infoRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (!infoRes.ok) return fail();

    const info = (await infoRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!info.email) return fail();

    const email = info.email.toLowerCase();
    let user = await User.findOne({ email });
    if (!user) {
      // Google accounts default to the Customer role.
      user = await User.create({
        name: info.name?.trim() || email.split("@")[0],
        email,
        photo: info.picture ?? "",
        password: "",
        role: "customer",
      });
    }

    const token = signToken({
      sub: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    });
    setAuthCookie(res, token, WEEK_MS);
    return res.redirect(`${ENV.CLIENT_URL}/dashboard?auth=google`);
  } catch (err) {
    console.error("Google callback error:", err);
    return fail();
  }
}
