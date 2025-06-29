import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import { processSurveyData } from "./cacheControllers/surveyData.controller.js";
import { getIO } from "../socket/index.js";
import { lockSeats, confirmBooking ,allocateSubgroups } from "../utils/booking.utils.js"
import { displaySegmentData } from "../utils/cache.utils.js"
import redis from "../lib/redis/redis.js";

const autoBooking = async (req, res) => {
  try {
    const { userID } = req.user;
    const { showId, sets, allowSolo } = req.body;

    const userCenter = "E-5"; // default or computed center
    let allocation = null;

    for (const subgroups of sets) {
      const sortedSubgroups = [...subgroups].sort((a, b) => b - a);
      // const sortedSubgroups=subgroups;
      const result = await allocateSubgroups(showId, sortedSubgroups , userCenter);
      
      if (result.success) {
        allocation = { ...result, sortedSubgroups };
        break;
      }
    }
    
    if (!allocation) { 
      return res.status(409).json({
        message: "Seat allocation failed",
        result: { success: false },
      });
    }
    
    const { lockId, seats } = allocation;
    const io = getIO();
    seats.forEach(seat => {
      io.to(`show:${showId}`).emit("seatLocked", {
        seat,
        userID,
      });
    });
    const booking = await Booking.create({
      userReferenceId: req.user.userReferenceId,
      showId,
      seats,
      lockToken: lockId,
      paymentStatus: "pending",
    });

    
    
    const bookingId=booking._id;
    
    const confirmed = await confirmBooking(bookingId); 
    // console.log(confirmed)
    if (!confirmed) {
      return res.status(400).json({ message: "Seat confirmation failed" });
    }
    await displaySegmentData(showId);
    // console.log(allocation.seats);
    res.status(201).json({
      message: "Auto booking confirmed",
      booking,
      allocatedSeats: allocation.seats,
    });
  } catch (err) {
    console.error("Error in auto booking:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};



const createBooking = async (req, res) => {
  try {
    const { userID } = req.user;
    const { showId, seats, paymentStatus } = req.body;
    const lockData=await lockSeats(showId, seats);
    if(!lockData.success){
      return res.status(409).json({
        message: "Some seats locked by someone else",
      });
    }
    // console.log(lockData.success)
    const io = getIO();
    seats.forEach(seat => {
      io.to(`show:${showId}`).emit("seatLocked", {
        seat,
        userID,
      });
    });

    const booking = await Booking.create({
      userReferenceId: req.user.userReferenceId,
      showId,
      seats,
      paymentStatus:"pending",
    });

    // Update bookedSeats as a map object after the payment

    // const seatUpdates = {};
    // seats.forEach(({ row, col }) => {
    //   const key = `bookedSeats.${row}-${col}`;
    //   seatUpdates[key] = { bookedBy: booking._id };
    // });

    // await Show.findByIdAndUpdate(showId, {
    //   $set: seatUpdates,
    // });

    // processSurveyData({ showId, userID, seats });

    await displaySegmentData(showId);
    const confirmedBooking = await confirmBooking(booking._id);


    
    res.status(201).json(booking);
  } catch (err) {
    console.error("Error creating booking:", err);
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
  autoBooking,
}; 
