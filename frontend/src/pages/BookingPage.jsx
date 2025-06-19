import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import Seat from "../components/Seat";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BookingPage = () => {
  const { showId } = useParams();
  const [layout, setLayout] = useState({ rows: 0, columns: 0 });
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [probabilities, setProbabilities] = useState([]);
  const [seatSelectionCount, setseatSelectionCount] = useState([]);
  
  useEffect(() => {
    const socket = io("http://localhost:8888");
    socket.emit("joinShowRoom", showId);

    socket.on("seatBooked", ({ seat }) => {
      console.log("Seat booked in room", seat);
      setBookedSeats(prev => [...prev, seat]);
      
      setSelectedSeats(prev =>
        prev.filter(s => !(s.row === seat.row && s.col === seat.col))
      );
      // toggleSeat(seat.row,seat.col);
    });


    const fetchShow = async () => {
      try {
        const res = await axiosInstance.get(`/show/${showId}`);

        // console.log(res.data.probabilities);
        // console.log(res.data.seatSelectionCount);
        
        setLayout(res.data.theaterId.layout);
        setBookedSeats(res.data.bookedSeats);
        setSelectedSeats(res.data.selectedSeats);
        setProbabilities(res.data.probabilities);
        setseatSelectionCount(res.data.seatSelectionCount);
      } catch (err) {
        console.error("Error fetching show:", err);
        toast.error("Failed to load show data");
      } finally {
        setLoading(false);
      }
    };
    fetchShow();
    return ()=>{
      socket.disconnect();
    }
  }, [showId]);

  const isBooked = (row, col) =>
    bookedSeats.some(seat => seat.row === row && seat.col === col);

  const isSelected = (row, col) =>
    selectedSeats.some(seat => seat.row === row && seat.col === col);

const toggleSeat = (row, col) => {
  if (isBooked(row, col)) return;

  const exists = selectedSeats.find(seat => seat.row === row && seat.col === col);

  if (exists) {
    setSelectedSeats(prev => prev.filter(seat => seat.row !== row || seat.col !== col));
    // toast.success("Seat deselected");

    axiosInstance.post(`/seat/deselect`, { showId, row, col }).catch(err => {
      console.error("Background deselect error:", err);
      toast.error("Failed to deselect seat");
    });
  } else {
    setSelectedSeats(prev => [...prev, { row, col ,}]);
    // toast.success("Seat selected");

    axiosInstance.post(`/seat/select`, { showId, row, col }).catch(err => {
      console.error("Background select error:", err);
      toast.error("Failed to select seat");
    });
  }
};


  const handleBooking = async () => {
    if (selectedSeats.length === 0) {
      return toast.error("Select at least one seat");
    }

    try {
      const res = await axiosInstance.post(
        "/booking",
        {
          
          showId,
          seats: selectedSeats,
          paymentStatus:"confirmed",
        },
        
        { withCredentials: true } // to send the JWT cookie
      );
      toast.success("Booking successful!");
      setSelectedSeats([]); // reset after booking
      setBookedSeats(prev => [...prev, ...selectedSeats]);
    } catch (err) {
      console.error("Booking error:", err);
      toast.error(err.response.data.message);
    }
  };
  if (loading) return <p className="text-center mt-10">Loading...</p>;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const getProbability = (row, col) => {
    const key = `${row}-${col}`;
    const count = seatSelectionCount[key] || 0;
    const max = 10; // maximum observed selection count
    const cnt=Math.min(count, max); // clamp to 1
    return probabilities[cnt];
  };
  return (
    <div className="p-6 pt-20">
      <h2 className="flex justify-center text-xl font-semibold mb-4">Select Your Seats</h2>
      <div className="flex flex-col gap-2 items-center">
        {Array.from({ length: layout.rows }, (_, i) => {
          const rowLabel = alphabet[i];
          return (
            <div key={rowLabel} className="flex gap-2">
              {Array.from({ length: layout.columns }, (_, j) => (
                //how can i write js code here
                <Seat
                  key={`${rowLabel}-${j + 1}`}
                  row={rowLabel}
                  col={j + 1}
                  isBooked={isBooked(rowLabel, j + 1)}
                  isSelected={isSelected(rowLabel, j + 1)}
                  onClick={() => toggleSeat(rowLabel, j + 1)}
                  probability={getProbability(rowLabel, j + 1)}
                />
              ))}
            </div>
          );
        })}
      </div>
      <div className="flex justify-center">
        <button
          onClick={handleBooking}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default BookingPage;
