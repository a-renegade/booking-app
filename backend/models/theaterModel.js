import mongoose from "mongoose";

const theaterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    layout: {
      rows: {
        type: Number,
        required: true
      },
      columns: {
        type: Number,
        required: true
      }
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true, versionKey: false }
);

const Theater = mongoose.model("Theater", theaterSchema);
export default Theater;
