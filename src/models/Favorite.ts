import mongoose from "mongoose";

export interface FavoriteDoc {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  equipment: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new mongoose.Schema<FavoriteDoc>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
  },
  { timestamps: true }
);

// One row per user + equipment: "save" becomes an idempotent upsert and
// "remove" a single delete. Enforced at the database level so a double
// click can never create duplicates.
favoriteSchema.index({ user: 1, equipment: 1 }, { unique: true });

export const Favorite = mongoose.model<FavoriteDoc>("Favorite", favoriteSchema);
