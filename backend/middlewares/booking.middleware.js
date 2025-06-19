import Show from "../models/showModel.js";

const checkSeatAvailability = async (req, res, next) => {
  const { userReferenceId, showId, seats } = req.body;

  if (!userReferenceId || !showId || !seats?.length) {
    return res.status(400).json({ message: "Missing showId or seats" });
  }

  try {
    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }

    const alreadyBooked = seats.filter(seat =>
      show.bookedSeats.some(
        booked =>
          booked.row === seat.row &&
          booked.col === seat.col
      )
    );

    if (alreadyBooked.length > 0) {
      return res.status(409).json({
        message: "Some seats are already booked",
        conflictedSeats: alreadyBooked
      });
    }

    next(); // All seats available, proceed
  } catch (err) {
    console.error("Error checking seat availability:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default checkSeatAvailability;
