import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  userReferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  showId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Show",
    required: true
  },
  seats: [
    {
      row: String,
      col: Number
    }
  ],
  paymentStatus: {
    type: String,
    enum: ["pending", "confirmed", "failed"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
