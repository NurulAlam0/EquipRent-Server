import mongoose from "mongoose";

export interface OAuthTicketDoc {
  _id: mongoose.Types.ObjectId;
  ticketHash: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const oauthTicketSchema = new mongoose.Schema<OAuthTicketDoc>(
  {
    ticketHash: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB cleans up expired tickets eventually; exchange also checks expiresAt
// in its atomic findOneAndDelete query, so TTL monitor delay cannot extend use.
oauthTicketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthTicket =
  mongoose.models.OAuthTicket ||
  mongoose.model<OAuthTicketDoc>("OAuthTicket", oauthTicketSchema);
