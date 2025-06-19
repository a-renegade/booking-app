import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ShowPage = () => {
  const { movieId } = useParams();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const movieRes = await axiosInstance.get(`/movie/${movieId}`);
        setMovie(movieRes.data);

        const showRes = await axiosInstance.get(`/show/movie/${movieId}`);
        setShows(showRes.data);
        // console.log(showRes)
      } catch (err) {
        toast.error("Failed to load show info");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [movieId]);

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{movie.title} - Showtimes</h2>

      <div className="flex flex-col gap-4">
        {shows.map((show) => (
          <div
            key={show._id}
            className="p-4 border rounded-md shadow flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">{show.theaterId.name}</p>
              <p className="text-sm text-gray-600">
                Time: {new Date(show.showTime).toLocaleString()}
              </p>
            </div>
            <Link
              to={`/shows/${show._id}/book`}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Book Now
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShowPage;
