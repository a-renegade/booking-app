import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import { processSurveyData } from "./cacheControllers/surveyData.controller.js";
import { getIO } from "../socket/index.js";

const createBooking = async (req, res) => {
  try {
    console.log(req.body);
    const { userID }=req.user;
    const { showId, seats, paymentStatus } = req.body;

    const booking = await Booking.create({
      userReferenceId: req.user.userReferenceId,
      showId,
      seats,
      paymentStatus,
    });

    const seatEntries = seats.map(seat => ({
      row: seat.row,
      col: seat.col,
      bookedBy: booking._id,
    }));

    await Show.findByIdAndUpdate(showId, {
      $push: { bookedSeats: { $each: seatEntries } },
    });

    const io = getIO();
    seats.forEach(seat => {
      io.to(`show:${showId}`).emit("seatBooked", {
        seat,
        userID,
      });
    });

    processSurveyData({ showId, userID, seats });
    res.status(201).json(booking);
  } catch (err) {
    console.error("Error creating booking:", err.message);
    res.status(500).json({ message: "Error creating booking" });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("userReferenceId")
      .populate("showId");
    res.status(200).json(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err.message);
    res.status(500).json({ message: "Error fetching bookings" });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate("userReferenceId")
      .populate("showId");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json(booking);
  } catch (err) {
    console.error("Error fetching booking:", err.message);
    res.status(500).json({ message: "Error fetching booking" });
  }
};

export {
  createBooking,
  getAllBookings,
  getBookingById,
};
