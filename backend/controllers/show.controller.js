import Show from "../models/showModel.js";
import { fetchSelectedSeatsByUser , fetchSeatSelectionCounts } from "./cacheControllers/seat.controller.js";
import { getCachedSurveyCurve } from "../utils/probabilities.utils.js"
import { generateSegmentForShow } from "../utils/cache.utils.js"
async function convertBookedSeatsMapToArray(bookedSeatsMap) {
  const seats = [];
  for (const [key, value] of bookedSeatsMap.entries()) {
    const [row, colStr] = key.split("-");
    seats.push({
      row,
      col: parseInt(colStr, 10), 
    });
  } 
  return seats; 
} 

 
// Create a new show
const createShow = async (req, res) => {
  try {
    const userType=req.user.userType;
    if(userType !== "OWNER"){
      return res.status(403).send({
          success: false,
          message: "You are not authorized to create a show"
      });
    }
    const { movieId, theaterId, showTime } = req.body;

    const show = await Show.create({
      movieId,
      theaterId,
      showTime,
      bookedSeats: {},
    });
    await generateSegmentForShow(show._id);
    res.status(201).json(show);
  } catch (err) {
    console.error("Error creating show:", err.message);
    res.status(500).json({ message: "Error creating show" });
  }
};


// Get all shows
const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find()
      .populate("movieId", "title posterUrl")
      .populate("theaterId", "name location");

    res.status(200).json(shows);
  } catch (err) {
    console.error("Error fetching shows:", err.message);
    res.status(500).json({ message: "Error fetching shows" });
  }
};

// Get shows by movie ID
const getShowsByMovie = async (req, res) => {
  try {
    const { movieId } = req.params;

    const shows = await Show.find({ movieId })
      .populate("theaterId", "name layout")  
      .sort("showTime");

    res.status(200).json(shows);
  } catch (err) {
    console.error("Error fetching shows by movie:", err.message);
    res.status(500).json({ message: "Error fetching shows" });
  }
};

// Get a single show by ID
const getShowById = async (req, res) => {
  try {
    const { id } = req.params;

    const show = await Show.findById(id)
      .populate("movieId", "title")
      .populate("theaterId", "name layout");

    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }

    const selectedSeats = await fetchSelectedSeatsByUser(id, req.user.userID);
    const probabilities= await getCachedSurveyCurve();
    const seatSelectionCount=await fetchSeatSelectionCounts(id);
    
    const showData = show.toObject();
    showData.selectedSeats=selectedSeats;
    showData.probabilities=probabilities;
    showData.seatSelectionCount=seatSelectionCount;
    showData.bookedSeats=await convertBookedSeatsMapToArray(show.bookedSeats);
    
    res.status(200).json(showData);
  } catch (err) {
    console.error("Error fetching show:", err.message);
    res.status(500).json({ message: "Error fetching show" });
  }
};

const getShowsByTheaterId = async (req, res) => {
  try {
    const { id } = req.params;

    const shows = await Show.find({ theaterId: id }).populate("movieId", "title");
    
    res.status(200).json(shows);
  } catch (err) {
    console.error("Error fetching shows:", err.message);
    res.status(500).json({ message: "Error fetching shows" });
  }
};

export {
  createShow,
  getAllShows,
  getShowsByMovie,
  getShowById,
  getShowsByTheaterId,
};
