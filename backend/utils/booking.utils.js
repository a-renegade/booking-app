import { v4 as uuidv4 } from "uuid";
import redis from '../lib/redis.js';

/**
 * Formats seat keys for Redis lock.
 * @param {string} showId
 * @param {{ row: string, col: number }[]} seats
 * @returns {string[]}
 */
function formatSeatKeys(showId, seats) {
  return seats.map(seat => `lock:seat:${showId}:${seat.row}-${seat.col}`);
}

/**
 * Locks multiple seats for a show using Redis Lua script.
 * @param {Redis} redis - Redis client instance 
 * @param {string} showId
 * @param {{ row: string, col: number }[]} seats
 * @param {number} ttlMs - Lock TTL in milliseconds (default 10 minutes)
 * @returns {{ success: boolean, lockToken: string | null }}
 */
async function lockSeats( showId, seats, ttlMs = 10 * 60 * 1000) {
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

  const result = await redis.eval(luaScript, keys.length, ...keys, lockToken, ttlMs);

  return {
    success: result === 1,
    lockToken: result === 1 ? lockToken : null,
  };
}

/**
 * Unlocks seats by checking that lockToken matches.
 * @param {Redis} redis - Redis client instance
 * @param {string} showId
 * @param {{ row: string, col: number }[]} seats
 * @param {string} lockToken
 * @returns {boolean}
 */
async function unlockSeats( showId, seats, lockToken) {
  const keys = formatSeatKeys(showId, seats);

  const luaScript = `
    for i = 1, #KEYS do
      if redis.call("get", KEYS[i]) == ARGV[1] then
        redis.call("del", KEYS[i])
      end
    end
    return 1
  `;

  const result = await redis.eval(luaScript, keys.length, ...keys, lockToken);
  return result === 1;
}

async function cacheBookedSeats( showId, seats) {
  const pipeline = redis.pipeline();

  for (const seat of seats) {
    const key = `booked:seat:${showId}:${seat.row}-${seat.col}`;
    pipeline.set(key, "true");
  }

  await pipeline.exec();
  return true;
}
async function isAnySeatBooked( showId, seats) {
  const keys = seats.map(seat => `booked:seat:${showId}:${seat.row}-${seat.col}`);
  const results = await redis.mGet(...keys);

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
