import { v4 as uuidv4 } from "uuid";
import redis from '../lib/redis/redis.js';
import { lockAndSplitSeatsScript , subgroupAllocationScript } from '../lib/redis/luaScripts.js';
import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import { getIO } from "../socket/index.js";
import { processSurveyData } from "../controllers/cacheControllers/surveyData.controller.js";
function formatSeats(showId, seats) {
  return seats.map(seat => `${seat.row}-${seat.col}`);
}

const allocateSubgroups = async (showId, userCenter, subgroups) => {
  const ttl = 30000;
  const lockId = uuidv4();

  const luaResult = await redis.eval(subgroupAllocationScript, {
    keys: [],
    arguments: [
      lockId,
      ttl.toString(),
      showId,
      userCenter,
      JSON.stringify(subgroups),
    ],
  });
  console.log(luaResult);
    
  const result = JSON.parse(luaResult);
  if (!result.success) {
    return { success: false, failedSubgroup: result.failedSubgroup };
  }

  const seats = [];
  for (const alloc of result.allocations) {
    const row = alloc.range.start[0];
    const startCol = parseInt(alloc.range.start.split("-")[1], 10);
    const endCol = parseInt(alloc.range.end.split("-")[1], 10);
    for (let col = startCol; col <= endCol; col++) {
      seats.push({ row, col });
    }
  }

  return {
    success: true,
    lockId,
    seats,
  };
};


async function lockSeats(showId, seats, ttlMs = 10 * 60 * 1000) {
  const lockToken = uuidv4();
  const formattedSeats = formatSeats(showId, seats);
  const theaterCenter="E-5";
  const result = await redis.eval(lockAndSplitSeatsScript, {
    keys: formattedSeats, // This becomes KEYS in Lua
    arguments: [
      lockToken,           // ARGV[1]
      String(ttlMs),       // ARGV[2]
      showId,              // ARGV[3]
      theaterCenter       // ARGV[4]
    ]
  });
  // const logs = JSON.parse(result);
  // console.log(logs)
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
  const booking = await Booking.findById(bookingId).populate("userReferenceId");
  if (!booking || booking.paymentStatus !== "pending") return false;

  const { showId, seats, lockToken } = booking;
  const userID = booking.userReferenceId.userID;
  const alreadyBooked = await isAnySeatBooked(showId, seats);
  if (alreadyBooked) {
    return false;
  }

  const success = await cacheBookedSeats( showId, seats);
  if (!success) return false;

  const show = await Show.findById(showId);
  if (!show) return false;

  const seatUpdates = {};
  for (const { row, col } of seats) {
    const seatKey = `${row}-${col}`;
    if (!show.bookedSeats?.get(seatKey)) {
      seatUpdates[`bookedSeats.${seatKey}`] = { bookedBy: booking._id };
    } else {
      
      booking.paymentStatus = "failed";
      await booking.save();
      return false;
    }
  }

  if (Object.keys(seatUpdates).length > 0) {
    await Show.findByIdAndUpdate(showId, { $set: seatUpdates });
  }

  booking.paymentStatus = "confirmed";
  await booking.save();


  const io = getIO();
  for (const seat of seats) {
    io.to(`show:${showId}`).emit("seatBooked", {
      seat,
      userID,
    });
  }

  // Trigger survey logic
  processSurveyData({ showId, userID , seats });
  return true;
};


export {
    lockSeats,
    unlockSeats,
    cacheBookedSeats,
    isAnySeatBooked,
    confirmBooking,
    allocateSubgroups,
}
