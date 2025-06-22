import Show from "../models/showModel.js";
import { lockSeats, isAnySeatBooked, cacheBookedSeats } from "../utils/booking.utils.js"
const checkSeatAvailability = async (req, res, next) => {
  const { userReferenceId } = req.user;
  const { showId, seats } = req.body;

  if (!userReferenceId || !showId || !seats?.length) {
    return res.status(400).json({ message: "Missing some data in request body" });
  }

  try {
    const alreadyBookedSeatsInCache=await isAnySeatBooked(showId , seats);
    if( alreadyBookedSeatsInCache ){
      return res.status(409).json({
        message: "Some seats are already booked",
      });
    }
    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }

    const bookedSeatMap = show.bookedSeats || {};

    const alreadyBooked = seats.filter(seat => {
      const key = `${seat.row}-${seat.col}`;
      if( bookedSeatMap.get(key) ) return seat;

    });

    if (alreadyBooked.length > 0) {
      await cacheBookedSeats(showId, alreadyBooked);
      return res.status(409).json({
        message: "Some seats are already booked",
        conflictedSeats: alreadyBooked 
      });
    }
    
    next();
  } catch (err) {
    console.error("Error checking seat availability:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


export default checkSeatAvailability;
