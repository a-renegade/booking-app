import Show from "../models/showModel.js";
import Theater from "../models/theaterModel.js";
import redis from "../lib/redis/redis.js";

function manhattan(a, b) {
  const [r1, c1] = a.split("-");
  const [r2, c2] = b.split("-");
  const rowDist = Math.abs(r1.charCodeAt(0) - r2.charCodeAt(0));
  return rowDist + Math.abs(+c1 - +c2);
}

function buildSegmentsForRow(row, availableCols, userCenter, bookedSeats) {
  const segments = [];
  let start = null;

  for (let i = 0; i < availableCols.length; i++) {
    const col = availableCols[i];
    const seat = `${row}-${col}`;

    if (bookedSeats.has(seat)) {
      if (start !== null) {
        const end = availableCols[i - 1];
        const length = end - start + 1;
        const centerCol = start + Math.floor((end - start) / 2);
        const center = `${row}-${centerCol}`;
        const distance = manhattan(center, userCenter);
        const seats = Array.from({ length }, (_, k) => `${row}-${start + k}`);

        segments.push({ center, segment: { start: `${row}-${start}`, end: `${row}-${end}`, length, distance }, seats });
        start = null;
      }
    } else {
      if (start === null) start = col;

      const isLast = i === availableCols.length - 1;
      const nextCol = availableCols[i + 1];
      const isGap = !isLast && (nextCol !== col + 1 || bookedSeats.has(`${row}-${nextCol}`));

      if (isLast || isGap) {
        const end = col;
        const length = end - start + 1;
        const centerCol = start + Math.floor((end - start) / 2);
        const center = `${row}-${centerCol}`;
        const distance = manhattan(center, userCenter);
        const seats = Array.from({ length }, (_, k) => `${row}-${start + k}`);

        segments.push({ center, segment: { start: `${row}-${start}`, end: `${row}-${end}`, length, distance }, seats });
        start = null;
      }
    }
  }

  return segments;
}

export async function generateSegmentsForAllShows() {
  const allShowIds = await Show.find({}, { _id: 1 }).lean();
  const allKeys = await redis.keys("segment:*");
  if (allKeys.length > 0) await redis.del(allKeys);

  for (const { _id: showId } of allShowIds) {
    await generateSegmentForShow(showId);
  }

  console.log("✅ All segments built based on theater layout + booked seats.");
}

export async function generateSegmentForShow(showId) {
  const show = await Show.findById(showId).lean();
  if (!show) return;

  const bookedSeats = new Set(Object.keys(show.bookedSeats || {}));
  const theater = await Theater.findById(show.theaterId).lean();
  if (!theater) return;

  const rows = theater.layout.rows;
  const cols = theater.layout.columns;
  const userCenter = "E-5"; // static center reference

  const seatToCenter = {};
  const centerToData = {};
  const sortedCenters = [];

  for (let r = 0; r < rows; r++) {
    const rowChar = String.fromCharCode(65 + r);
    const colsArray = Array.from({ length: cols }, (_, i) => i + 1);
    const segments = buildSegmentsForRow(rowChar, colsArray, userCenter, bookedSeats);
    for (const { center, segment, seats } of segments) {
      centerToData[center] = JSON.stringify(segment);
      sortedCenters.push({ score: segment.length, value: center });
      for (const seat of seats) {
        seatToCenter[seat] = center;
      }
    }
  }

  
  const pipeline = redis.multi();

  pipeline.del(
    `segment:seat-to-center:${showId}`,
    `segment:center-to-data:${showId}`,
    `segment:sorted-centers:${showId}`
  );

  if (Object.keys(seatToCenter).length > 0) {
    pipeline.hSet(`segment:seat-to-center:${showId}`, seatToCenter);
  }

  if (Object.keys(centerToData).length > 0) {
    pipeline.hSet(`segment:center-to-data:${showId}`, centerToData);
  }

  if (Object.keys(sortedCenters).length > 0) {
    pipeline.zAdd(`segment:sorted-centers:${showId}`, sortedCenters);
  }

  await pipeline.exec();

  console.log(`✅ Segments cached for show ${showId}`);
  // displaySegmentData(showId)
}
 



export async function displaySegmentData(showId) {
  const seatToCenterKey = `segment:seat-to-center:${showId}`;
  const centerToDataKey = `segment:center-to-data:${showId}`;
  const sortedCentersKey = `segment:sorted-centers:${showId}`;

  // Get segment data
  const [seatToCenter, centerToData, sortedCenters] = await Promise.all([
    redis.hGetAll(seatToCenterKey),
    redis.hGetAll(centerToDataKey),
    redis.zRangeWithScores(sortedCentersKey, 0, -1),
  ]);

  // Get all locked seat keys
  const lockedSeatKeys = await redis.keys(`seat:lock:${showId}:*`);
  const lockedSeats = lockedSeatKeys.map(key => key.split(":").pop());

  console.log(`\n--- 🔍 Segment Data for Show ID: ${showId} ---\n`);

  // 🔐 Locked seats
  console.log("🔐 Locked Seats:");
  if (lockedSeats.length === 0) {
    console.log("  None");
  } else {
    for (const seat of lockedSeats) {
      console.log(`  ${seat}`);
    }
  }

  // 🟢 Seat to Center Mapping
  console.log("\n📌 segment:seat-to-center");
  for (const [seat, center] of Object.entries(seatToCenter)) {
    console.log(`  ${seat} → ${center}`);
  }

  // 📦 Segment metadata
  console.log("\n📌 segment:center-to-data");
  for (const [center, json] of Object.entries(centerToData)) {
    const parsed = JSON.parse(json);
    console.log(`  ${center}:`, parsed);
  }

  // 🔢 Sorted Centers
  console.log("\n📌 segment:sorted-centers (ZSET)");
  for (const entry of sortedCenters) {
    console.log(`  ${entry.value} (length: ${entry.score})`);
  }

  console.log("\n--- ✅ End of Segment Dump ---\n");
} 

export async function getSegmentLengths(showId) {
  const key = `segment:sorted-centers:${showId}`;
  try {
    const results = await redis.zRangeWithScores(key, 0, -1); // ascending order
    const scores = results.map(({ score }) => score);
    return scores;
  } catch (err) {
    console.error("❌ Failed to get segment scores:", err);
    return [];
  }
}