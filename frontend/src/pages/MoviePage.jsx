import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import MovieCard from "../components/MovieCard";
import toast from "react-hot-toast";

const MoviePage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await axiosInstance.get("/movie");
        setMovies(response.data);
      } catch (err) {
        console.error("Failed to fetch movies", err);
        toast.error("Failed to load movies");
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  if (loading) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Now Showing</h1>
      <div className="flex flex-wrap gap-4 justify-center">
        {movies.map((movie) => (
          <Link key={movie._id} to={`/shows/${movie._id}`} className="flex-shrink-0">
            <MovieCard movie={movie} />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MoviePage;
