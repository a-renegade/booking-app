import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minLength: 3
    },
    userID: {
      type: String,
      unique: true,
      required: true
    },
    userType: {
      type: String,
      default: "USER",
      enum: ["ADMIN", "OWNER", "USER"]
    }
  },
  { timestamps: true, versionKey: false }
);

const User = mongoose.model("User", userSchema);
export default User;
