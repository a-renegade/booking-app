import { v4 as uuidv4 } from "uuid";
import redis from '../lib/redis.js';

function formatSeatKeys(showId, seats) {
  return seats.map(seat => `lock:seat:${showId}:${seat.row}-${seat.col}`);
}

async function lockSeats(showId, seats, ttlMs = 10 * 60 * 1000) {
  const lockToken = uuidv4();
  const keys = formatSeatKeys(showId, seats);

  const luaScript = `
    for i = 1, #KEYS do
      if redis.call("exists", KEYS[i]) == 1 then
        return 0
      end
    end
    for i = 1, #KEYS do
      redis.call("set", KEYS[i], ARGV[1], "PX", ARGV[2])
    end
    return 1
  `;

  const result = await redis.eval(luaScript, {
    keys,
    arguments: [lockToken, String(ttlMs)],
  });

  return {
    success: result === 1,
    lockToken: result === 1 ? lockToken : null,
  };
}


async function unlockSeats(showId, seats, lockToken) {
  const keys = formatSeatKeys(showId, seats);

  const luaScript = `
    for i = 1, #KEYS do
      if redis.call("get", KEYS[i]) == ARGV[1] then
        redis.call("del", KEYS[i])
      end
    end
    return 1
  `;

  const result = await redis.eval(luaScript, {
    keys,
    arguments: [lockToken],
  });

  return result === 1;
}

async function cacheBookedSeats(showId, seats) {
  const multi = redis.multi();
  for (const seat of seats) {
    const key = `booked:seat:${showId}:${seat.row}-${seat.col}`;
    multi.set(key, "true");
  }
  await multi.exec();
  return true;
}

async function isAnySeatBooked(showId, seats) {
  const keys = seats.map(seat => `booked:seat:${showId}:${seat.row}-${seat.col}`);
  const results = await redis.mGet(keys);
  return results.some(value => value !== null);
}

const confirmBooking = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.paymentStatus !== "pending") return;

  const { showId, seats, lockToken } = booking;

  const alreadyBooked = await isAnySeatBooked(showId, seats);
  if (alreadyBooked) {
    return;
  }

  const success = await bookSeats( showId, seats);
  if (!success) return;

  
  const seatUpdates = {};
  seats.forEach(({ row, col }) => {
    seatUpdates[`bookedSeats.${row}-${col}`] = { bookedBy: booking._id };
  });
  await Show.findByIdAndUpdate(showId, { $set: seatUpdates });

  
  booking.paymentStatus = "confirmed";
  await booking.save();


  const io = getIO();
  seats.forEach(seat => {
    io.to(`show:${showId}`).emit("seatBooked", {
      seat,
      userID: booking.userReferenceId,
    });
  });

  // Trigger survey logic
  processSurveyData({ showId, userID: booking.userReferenceId, seats });
};


export {
    lockSeats,
    unlockSeats,
    cacheBookedSeats,
    isAnySeatBooked,
    confirmBooking,
}
