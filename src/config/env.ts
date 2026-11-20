import "dotenv/config";

export const ENV = {
  PORT: Number(process.env.PORT ?? 5050),
  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:3000",
  SERVER_URL: process.env.SERVER_URL ?? "http://localhost:5000",
  MONGODB_URI: process.env.MONGODB_URI ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  GOOGLE_REDIRECT_URI:
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.SERVER_URL ?? "http://localhost:5000"}/api/auth/google/callback`,
  IMGBB_API_KEY: process.env.IMGBB_API_KEY ?? "",
  CRON_SECRET: process.env.CRON_SECRET ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
