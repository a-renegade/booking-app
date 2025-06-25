import Theater from "../models/theaterModel.js";

// Create a new theater
const createTheater = async (req, res) => {
  try {
    const userType=req.user.userType;
    if(userType !== "OWNER"){
      return res.status(403).send({
          success: false,
          message: "You are not authorized to create a theater"
      });
    }
    const { name, layout } = req.body;

    if (!name || !layout?.rows || !layout?.columns) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await Theater.findOne({ name, ownerId: req.user.userReferenceId });
    if (existing) {
      return res.status(409).json({ message: "You already have a theater with this name" });
    }

    const theater = await Theater.create({
      name,
      layout,
      ownerId: req.user.userReferenceId
    });

    res.status(201).json(theater);
  } catch (err) {
    console.error("Error creating theater:", err.message);
    res.status(500).json({ message: "Error creating theater" });
  }
};


// Get all theaters
const getAllTheaters = async (req, res) => {
  try {
    const theaters = await Theater.find();
    res.status(200).json(theaters);
  } catch (err) {
    console.error("Error fetching theaters:", err.message);
    res.status(500).json({ message: "Error fetching theaters" });
  }
};

// Get a single theater by ID
const getTheaterById = async (req, res) => { 
  try {
    const { id } = req.params;
    const theater = await Theater.findById(id); 
    if (!theater) {
      return res.status(404).json({ message: "Theater not found" });
    }
    res.status(200).json(theater);
  } catch (err) {
    console.error("Error fetching theater:", err.message);
    res.status(500).json({ message: "Error fetching theater" });
  }
};
const getTheatersByOwner = async (req, res) => {
  try {
    const ownerId = req.user.userReferenceId;
    // console.log(ownerId)
    const theaters = await Theater.find({ ownerId });
    res.status(200).json(theaters);
  } catch (err) {
    console.error("Error fetching theaters by owner:", err.message);
    res.status(500).json({ message: "Error fetching theaters" });
  }
};

export {
  createTheater,
  getAllTheaters,
  getTheaterById,
  getTheatersByOwner, 
};
  