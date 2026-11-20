import mongoose from "mongoose";

export type UserRole = "customer" | "owner" | "admin";

export interface UserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  photo: string;
  phoneNumber: string;
  address: string;
  /** bcrypt hash — empty string for accounts created via Google sign-in */
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    photo: { type: String, default: "" },
    phoneNumber: { type: String, default: "", trim: true, maxlength: 30 },
    address: { type: String, default: "", trim: true, maxlength: 300 },
    password: { type: String, default: "", select: false },
    role: {
      type: String,
      enum: ["customer", "owner", "admin"],
      default: "customer",
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDoc>("User", userSchema);

/** Shape safe to return to the client (never includes the password hash). */
export function publicUser(user: UserDoc) {
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    photo: user.photo,
    phoneNumber: user.phoneNumber ?? "",
    address: user.address ?? "",
    role: user.role,
  };
}
