import { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ManageTheaterPage = () => {
  const [theaters, setTheaters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    rows: "",
    columns: "",
  });

  const fetchTheaters = async () => {
    try {
      const res = await axiosInstance.get("/theater/owner");
      setTheaters(res.data);
    } catch (err) {
      toast.error("Failed to fetch theaters");
    }
  };

  useEffect(() => {
    fetchTheaters();
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
      await axiosInstance.post("/theater", {
        name: form.name,
        layout: {
          rows: Number(form.rows),
          columns: Number(form.columns),
        },
      });
      toast.success("Theater added");
      setForm({ name: "", rows: "", columns: "" });
      setShowForm(false);
      fetchTheaters();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error adding theater");
    }
  };

  return (
    <div className="p-6 pt-24 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Your Theaters</h2>

      <button
        onClick={() => setShowForm((prev) => !prev)}
        className="mb-4 px-4 py-2 border border-solid border-blue-600 text-blue-600 rounded hover:bg-blue-50"
      >
        {showForm ? "Cancel" : "Add Theater"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded">
          <div>
            <label className="block font-medium mb-1">Theater Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. PVR City Center"
              required
              className="w-full px-3 py-2 border border-solid border-gray-400 rounded"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Rows</label>
            <input
              type="number"
              name="rows"
              value={form.rows}
              onChange={handleChange}
              placeholder="e.g. 10"
              required
              className="w-full px-3 py-2 border border-solid border-gray-400 rounded"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Columns</label>
            <input
              type="number"
              name="columns"
              value={form.columns}
              onChange={handleChange}
              placeholder="e.g. 12"
              required
              className="w-full px-3 py-2 border border-solid border-gray-400 rounded"
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white border border-solid border-blue-700 rounded hover:bg-blue-700 transition"
          >
            Add Theater
          </button>
        </form>
      )}

      <ul className="mt-6 space-y-2">
        {theaters.map((theater) => (
          <li key={theater._id} className="p-4 border rounded">
            <h3 className="font-semibold text-lg">{theater.name}</h3>
            <p className="text-sm text-gray-600">
              Layout: {theater.layout.rows} × {theater.layout.columns}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageTheaterPage;
