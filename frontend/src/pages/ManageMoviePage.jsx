import { useState } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ManageMoviePage = () => {
  const [form, setForm] = useState({
    title: "",
    durationMinutes: "",
    releaseDate: "",
  });

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axiosInstance.post("/movie", {
        title: form.title,
        durationMinutes: Number(form.durationMinutes),
        releaseDate: new Date(form.releaseDate),
      });

      toast.success("Movie added successfully");
      setForm({ title: "", durationMinutes: "", releaseDate: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add movie");
    }
  };

  return (
    <div className="p-6 pt-24 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">Add a New Movie</h2>
      <form
        onSubmit={handleSubmit}
        className="space-y-5 border border-gray-300 p-6 rounded-md shadow-md"
      >
        <div>
          <label className="block mb-1 font-medium">Title</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Inception"
            className="w-full px-3 py-2 border border-solid border-gray-400 rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Duration (in minutes)</label>
          <input
            name="durationMinutes"
            type="number"
            min="1"
            value={form.durationMinutes}
            onChange={handleChange}
            placeholder="e.g. 148"
            className="w-full px-3 py-2 border border-solid border-gray-400 rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Release Date</label>
          <input
            name="releaseDate"
            type="date"
            value={form.releaseDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-solid border-gray-400 rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white border border-solid border-blue-700 rounded hover:bg-blue-700 transition"
        >
          Add Movie
        </button>
      </form>
    </div>
  );
};

export default ManageMoviePage;
