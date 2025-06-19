import { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ManageShowPage = () => {
  const [theaters, setTheaters] = useState([]);
  const [movies, setMovies] = useState([]);
  const [showsByTheater, setShowsByTheater] = useState({});
  const [form, setForm] = useState({
    theaterId: "",
    movieId: "",
    showTime: "",
  });
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    try {
      const [theatersRes, moviesRes] = await Promise.all([
        axiosInstance.get("/theater/owner"),
        axiosInstance.get("/movie"),
      ]);

      setTheaters(theatersRes.data);
      setMovies(moviesRes.data);

      const showsPromises = theatersRes.data.map((theater) =>
        axiosInstance.get(`/show/theater/${theater._id}`)
      );
      const showsResponses = await Promise.all(showsPromises);
      const showsMap = {};
      theatersRes.data.forEach((theater, index) => {
        showsMap[theater._id] = showsResponses[index].data;
      });
      setShowsByTheater(showsMap);
    } catch (err) {
      toast.error("Failed to load data");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axiosInstance.post("/show", {
        ...form,
        showTime: new Date(form.showTime),
      });
      toast.success("Show created successfully");
      setForm({ theaterId: "", movieId: "", showTime: "" });
      setShowForm(false);
      await fetchData(); // Refresh shows
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create show");
    }
  };

  return (
    <div className="p-6 pt-24 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Manage Shows</h2>

      {theaters.map((theater) => (
        <div key={theater._id} className="border p-4 rounded mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">{theater.name}</h3>
            <button
              onClick={() => {
                setForm({ ...form, theaterId: theater._id });
                setShowForm(true);
              }}
              className="border border-solid border-gray-500 px-3 py-1 rounded"
            >
              Add Show
            </button>
          </div>
          <ul className="list-disc list-inside">
            {(showsByTheater[theater._id] || []).map((show) => (
              <li key={show._id}>
                {new Date(show.showTime).toLocaleString()} – Movie: {show.movieId.title}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {showForm && (
        <div className="border p-4 rounded bg-white shadow">
          <h3 className="text-lg font-semibold mb-4">Add New Show</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Select Theater</label>
              <select
                name="theaterId"
                value={form.theaterId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-solid border-gray-400 rounded"
                required
              >
                <option value="" disabled>
                  Choose theater
                </option>
                {theaters.map((theater) => (
                  <option key={theater._id} value={theater._id}>
                    {theater.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">Select Movie</label>
              <select
                name="movieId"
                value={form.movieId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-solid border-gray-400 rounded"
                required
              >
                <option value="" disabled>
                  Choose movie
                </option>
                {movies.map((movie) => (
                  <option key={movie._id} value={movie._id}>
                    {movie.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">Show Time</label>
              <input
                type="datetime-local"
                name="showTime"
                value={form.showTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-solid border-gray-400 rounded"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white border border-solid border-blue-700 rounded hover:bg-blue-700 transition"
            >
              Create Show
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManageShowPage;
