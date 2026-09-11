import React from "react";

const Seat = ({ row, col, isBooked, isSelected, onClick }) => {
  const handleClick = () => {
    if (!isBooked) {
      onClick({ row, col });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-16 h-16 m-1 rounded border text-xs flex items-center justify-center transition
        ${
          isBooked
            ? "bg-gray-400 cursor-not-allowed"
            : isSelected
            ? "bg-blue-500 text-white"
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
    >
      {row}
      {col}
    </button>
  );
};

export default Seat;