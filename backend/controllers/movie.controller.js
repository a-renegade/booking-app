import Movie from "../models/movieModel.js";

// Create a new movie
const createMovie = async (req, res) => {
  try {
    const userType=req.user.userType;
    if(userType !== "ADMIN"){
      return res.status(403).send({
          success: false,
          message: "You are not authorized to create a movie"
      });
    }
    const { title, durationMinutes, releaseDate } = req.body;
    console.log("Creating movie with data:", req.body);

    const existingMovie = await Movie.findOne({ title: title.trim() });

    if (existingMovie) {
      console.log("Duplicate movie found:", existingMovie);
      return res.status(409).send({ message: "Movie with same title and release date already exists" });
    }

    const movie = await Movie.create({
      title: title.trim(),
      durationMinutes,
      releaseDate,
    });

    console.log("Movie successfully created:", movie);
    res.status(201).send(movie);
  } catch (err) {
    console.log("Error while creating movie:", err.message);
    res.status(500).send({ message: "Error while creating movie" });
  }
};

// Get all movies
const getAllMovies = async (req, res) => {
  try {
    const movies = await Movie.find().sort({ releaseDate: -1 });
    res.status(200).send(movies);
  } catch (err) {
    console.log("Error fetching all movies:", err.message);
    res.status(500).send({ message: "Error fetching all movies" });
  }
};

// Get movie by ID
const getMovieById = async (req, res) => {
  try {
    const id = req.params.id;
    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).send({ message: "Movie not found" });
    }

    res.status(200).send(movie);
  } catch (err) {
    console.log("Error fetching movie by ID:", err.message);
    res.status(400).send({ message: "Invalid movie ID" });
  }
};

// Update movie
const updateMovie = async (req, res) => {
  try {
    const id = req.params.id;
    const { title, durationMinutes, releaseDate } = req.body;

    const updatedMovie = await Movie.findByIdAndUpdate(
      id,
      { title, durationMinutes, releaseDate },
      { new: true, runValidators: true }
    );

    if (!updatedMovie) {
      return res.status(404).send({ message: "Movie not found" });
    }

    console.log("Movie updated:", updatedMovie);
    res.status(200).send(updatedMovie);
  } catch (err) {
    console.log("Error updating movie:", err.message);
    res.status(400).send({ message: "Error updating movie" });
  }
};

// Delete movie
const deleteMovie = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Movie.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).send({ message: "Movie not found" });
    }

    console.log("Movie deleted:", deleted);
    res.status(200).send({ message: "Movie deleted successfully" });
  } catch (err) {
    console.log("Error deleting movie:", err.message);
    res.status(400).send({ message: "Error deleting movie" });
  }
};

export {
  createMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
};
