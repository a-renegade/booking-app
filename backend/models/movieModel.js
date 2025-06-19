import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1
    },
    releaseDate: {
      type: Date,
      required: true
    }
  },
  { timestamps: true, versionKey: false }
);

const Movie = mongoose.model("Movie", movieSchema);
export default Movie;
