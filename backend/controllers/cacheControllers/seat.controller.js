import redis from "../../lib/redis/redis.js";

const fetchSeatSelectionCounts = async (showId) => {
  const pattern = `seat:${showId}:*`;
  const keys = await redis.keys(pattern);

  const seatCounts = {};
  for (const key of keys) {
    const count = await redis.hLen(key);
    const seat = key.split(":")[2];
    seatCounts[seat] = count;
  }

  return seatCounts;
};
const fetchSelectedSeatsByUser = async (showId, userID) => {
  const pattern = `seat:${showId}:*`;
  const keys = await redis.keys(pattern);

  const selectedSeats = [];

  for (const key of keys) {
    const exists = await redis.hExists(key, userID);
    if (exists) {
      const seat = key.split(":")[2]; // row-col
      const [row, col] = seat.split("-");
      selectedSeats.push({ row, col: Number(col) });
    }
  }

  return selectedSeats;
};

const selectSeat = async (req, res) => {
  try {
    const { userID }=req.user;
    const { showId, row, col } = req.body;
    console.log(showId,userID,row,col)
    const key = `seat:${showId}:${row}-${col}`;

    const count = await redis.hLen(key);
    await redis.hSet(key, userID, count);
    await redis.expire(key, 300); // 5 minutes

    res.status(200).json({ message: "Seat selected" });
  } catch (err) {
    console.error("Error selecting seat:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deselectSeat = async (req, res) => {
  try {
    const { userID }=req.user;
    const { showId , row, col } = req.body;
    const key = `seat:${showId}:${row}-${col}`;

    await redis.hDel(key, userID);

    res.status(200).json({ message: "Seat deselected" });
  } catch (err) {
    console.error("Error deselecting seat:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSeatUserCount = async (req, res) => {
  try {
    const { showId, row, col } = req.body;
    const key = `seat:${showId}:${row}-${col}`;

    const count = await redis.hLen(key);
    res.status(200).json({ count });
  } catch (err) {
    console.error("Error getting seat user count:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSeatUsers = async (req, res) => {
  try {
    const { showId, row, col } = req.body;
    const key = `seat:${showId}:${row}-${col}`;

    const users = await redis.hGetAll(key);
    res.status(200).json({ users });
  } catch (err) {
    console.error("Error getting seat users:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getShowSeatSelectionCounts = async (req, res) => {
  try {
    const { showId } = req.body;
    const seatCounts = await fetchSeatSelectionCounts(showId);
    res.status(200).json({ seatCounts });
  } catch (err) {
    console.error("Error getting seat counts for show:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getSegmentInfo = async (req, res) => {
  try {
    const { showId } = req.query;
    if (!showId) return res.status(400).json({ message: "showId required" });

    const redisKey = `segment:sorted-centers:${showId}`;
    const raw = await redis.zRangeWithScores(redisKey, 0, -1); // [{ value, score }]
    const segmentLengths = raw.map((entry) => entry.score);

    res.json({
      segmentLengths,
      fetchedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error in getSegmentInfo:", err);
    res.status(500).json({ message: "Failed to fetch segment info" });
  }
};
export {
  fetchSelectedSeatsByUser,
  selectSeat,
  deselectSeat,
  getSeatUserCount,
  getSeatUsers,
  getShowSeatSelectionCounts,
  fetchSeatSelectionCounts,
  getSegmentInfo,
};
