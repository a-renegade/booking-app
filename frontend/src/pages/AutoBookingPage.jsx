import { useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export default function AutoBookingPage() {
  const { showId } = useParams();
  const [peopleCount, setPeopleCount] = useState(1);
  const [sets, setSets] = useState([[1]]);
  const [allowSolo, setAllowSolo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const updateSet = (setIdx, value) => {
    const sizes = value
      .split(",")
      .map((v) => parseInt(v.trim()))
      .filter((v) => !isNaN(v));
    const total = sizes.reduce((a, b) => a + b, 0);
    if (total === peopleCount) {
      const newSets = [...sets];
      newSets[setIdx] = sizes;
      setSets(newSets);
    }
  };

  const addSet = () => {
    if (sets.length >= 4) return;
    setSets([...sets, [peopleCount]]);
  };

  const deleteSet = (index) => {
    if (sets.length === 1) return;
    const newSets = sets.filter((_, i) => i !== index);
    setSets(newSets);
  };

  const handleBooking = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.post(
        "/booking/auto", // 🔁 make sure this matches your Express router
        {
          showId,
          sets,
          allowSolo,
        },
        { withCredentials: true } // 🔐 to send cookies if needed for auth
      );

      setResult(response.data);
      console.log("Booking:", response.data);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Auto booking failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auto Booking for Show: {showId}</h1>

      <div className="mb-4 text-sm text-gray-700 leading-relaxed border border-blue-300 bg-blue-50 p-4 rounded">
        <p>
          The system will try to allocate seats using <strong>Set 1</strong> first, then fallback to Set 2, 3, or 4.
        </p>
        <p>
          If all sets fail and <strong>solo booking</strong> is allowed, it will try to assign seats individually.
        </p>
      </div>

      <div className="mb-4">
        <label className="font-semibold mr-2">Total People:</label>
        <input
          type="number"
          min={1}
          value={peopleCount}
          onChange={(e) => setPeopleCount(parseInt(e.target.value))}
          className="border px-2 py-1 w-20"
        />
      </div>

      {sets.map((set, setIdx) => (
        <div key={setIdx} className="border rounded p-4 mb-4 relative">
          <h2 className="text-lg font-semibold mb-2">Set {setIdx + 1}</h2>

          <div className="flex gap-4 mb-2">
            <label>Subgroups (comma-separated):</label>
            <input
              type="text"
              placeholder="e.g. 3,2,2"
              onChange={(e) => updateSet(setIdx, e.target.value)}
              className="border px-2 py-1 w-60"
            />
          </div>

          <div className="flex gap-6 mb-2">
            {set.map((size, i) => (
              <div
                key={i}
                className="border px-2 py-2 flex items-center flex-col min-w-[60px]"
              >
                <div className="flex gap-1">
                  {Array.from({ length: size }).map((_, j) => (
                    <div
                      key={j}
                      className="w-5 h-5 border rounded bg-gray-200"
                    />
                  ))}
                </div>
                <div className="text-xs mt-1">subgroup {i + 1}</div>
              </div>
            ))}
          </div>

          {sets.length > 1 && (
            <button
              onClick={() => deleteSet(setIdx)}
              className="absolute top-2 right-2 text-sm text-red-600 hover:underline"
            >
              Delete Set
            </button>
          )}
        </div>
      ))}

      <div className="flex gap-4 items-center flex-wrap">
        <button
          onClick={addSet}
          disabled={sets.length >= 4}
          className={`px-4 py-2 border rounded hover:bg-gray-100 ${
            sets.length >= 4 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Add Another Set
        </button>

        <label className="flex items-center gap-2"> 
          <input
            type="checkbox"
            checked={allowSolo}
            onChange={(e) => setAllowSolo(e.target.checked)}
            className="accent-blue-600"
          />
          Allow Solo Booking
        </label>

        <button
          onClick={handleBooking}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          // disabled={loading}
          disabled={false}
        >
          {loading ? "Booking..." : "Book"}
        </button>

        {sets.length >= 4 && (
          <div className="text-sm text-red-600 ml-2">
            Maximum of 4 sets allowed.
          </div>
        )}
        {result && (
          <div className="mt-6 border border-green-400 bg-green-50 p-4 rounded text-sm">
            <h2 className="font-bold text-green-800 mb-2">✅ Booking Successful</h2>
            <p className="mb-1">Message: {result.message}</p>
            <p className="mb-1">Booking ID: {result.booking?._id}</p>
            <p className="mb-2">Allocated Seats:</p>
            <ul className="list-disc list-inside">
              {result.allocatedSeats?.map((seat, idx) => (
                <li key={idx}>{`${seat.row}-${seat.col}`}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    
  );
}
