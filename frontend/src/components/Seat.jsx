import React from "react";

const Seat = ({ row, col, isBooked, isSelected, onClick, probability }) => {
  const handleClick = () => {
    if (!isBooked) {
      onClick({ row, col });
    }
  };

  const interpolateColor = (prob) => {
    let hue;
    if (prob <= 0.5) {
      // Red (0°) to Yellow (60°)
      hue = 0 + 60 * (prob / 0.5);
    } else {
      // Yellow (60°) to Green (120°)
      hue = 60 + 60 * ((prob - 0.5) / 0.5);
    }

    return `hsl(${hue}, 85%, 45%)`; // <- tuned values: less saturated, less bright
  };



  const bgColor =
    !isBooked && !isSelected ? interpolateColor(probability) : undefined;

  return (
    <button
      onClick={handleClick}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      className={`w-16 h-16 m-1 rounded border text-xs flex items-center justify-center transition
        ${
          isBooked
            ? "bg-gray-400 cursor-not-allowed"
            : isSelected
            ? "bg-blue-500 text-white"
            : "hover:bg-blue-200 border-gray-400"
        }`}
    >
      {row}
      {col}
    </button>
  );
};

export default Seat;
