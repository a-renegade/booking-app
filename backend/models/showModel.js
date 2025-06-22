import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    theaterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theater",
      required: true,
    },
    showTime: {
      type: Date,
      required: true,
    },
    bookedSeats: {
      type: Map,
      of: new mongoose.Schema({
        bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
        bookedAt: { type: Date, default: Date.now }, 
      }),
      default: {},
    },
  },
  { timestamps: true, versionKey: false }
);

const Show = mongoose.model("Show", showSchema);
export default Show;
