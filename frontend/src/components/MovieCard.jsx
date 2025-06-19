import React from "react";

const MovieCard = ({ movie }) => {
  return (
    <div className="w-60 bg-white shadow-md rounded-lg overflow-hidden hover:shadow-xl transition duration-300">
      <div className="h-80 bg-gray-200 flex items-center justify-center text-gray-500 text-xl">
        No Image
      </div>
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2">{movie.title}</h2>
        <p className="text-sm text-gray-600 mb-1">
          Duration: {movie.durationMinutes} min
        </p>
        <p className="text-sm text-gray-600">
          Release: {new Date(movie.releaseDate).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
