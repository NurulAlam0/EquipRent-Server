import "dotenv/config";
import { app } from "./app";
import { connectDB } from "./config/db";
import { ENV } from "./config/env";
import { completeExpiredBookings } from "./services/booking.service";

async function startServer() {
  try {
    await connectDB();

    const releaseExpired = () => {
      void completeExpiredBookings().catch((err) => {
        console.error("Could not release completed rental inventory:", err);
      });
    };

    // Run inventory cleanup initially, then every 60s
    releaseExpired();
    const inventoryTimer = setInterval(releaseExpired, 60_000);
    inventoryTimer.unref();

    app.listen(ENV.PORT, () => {
      console.log(`✓ Rentora API listening on ${ENV.SERVER_URL}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

void startServer();

