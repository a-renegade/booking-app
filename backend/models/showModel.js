import mongoose from "mongoose";

const seatSchema = new mongoose.Schema({
  row: String,
  col: Number,
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
});

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
    bookedSeats: [seatSchema],
  },
  { timestamps: true, versionKey: false }
);

const Show = mongoose.model("Show", showSchema);
export default Show;
