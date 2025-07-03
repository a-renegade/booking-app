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

  
  const centerRowChar = String.fromCharCode(65 + Math.floor(rows / 2));
  const centerCol = Math.floor(cols / 2) + 1;
  const userCenter = `${centerRowChar}-${centerCol}`;

  const seatToCenter = {};
  const centerToData = {};
  const lengthToSortedCenters = {}; // { 2: [{score, value}], 3: [...], ... }

  for (let r = 0; r < rows; r++) {
    const rowChar = String.fromCharCode(65 + r);
    const colsArray = Array.from({ length: cols }, (_, i) => i + 1);
    const segments = buildSegmentsForRow(rowChar, colsArray, userCenter, bookedSeats);

    for (const { center, segment, seats } of segments) {
      const { length, distance } = segment;

      centerToData[center] = JSON.stringify(segment);
      seatToCenter[seats[0]] = center;

      for (const seat of seats) {
        seatToCenter[seat] = center;
      }

      if (!lengthToSortedCenters[length]) lengthToSortedCenters[length] = [];
      lengthToSortedCenters[length].push({ score: distance, value: center });
    }
  }

  const pipeline = redis.multi();

  // Clear previous keys
  const delKeys = [
    `segment:seat-to-center:${showId}`,
    `segment:center-to-data:${showId}`,
  ];

  for (const length of Object.keys(lengthToSortedCenters)) {
    delKeys.push(`segment:sorted-centers:${showId}:${length}`);
  }
  pipeline.del(...delKeys);

  pipeline.hSet(`layout:${showId}`, {
    rows,
    cols
  });

  
  // Write new data
  if (Object.keys(seatToCenter).length > 0) {
    pipeline.hSet(`segment:seat-to-center:${showId}`, seatToCenter);
  }

  if (Object.keys(centerToData).length > 0) {
    pipeline.hSet(`segment:center-to-data:${showId}`, centerToData);
  }

  for (const [length, entries] of Object.entries(lengthToSortedCenters)) {
    pipeline.zAdd(`segment:sorted-centers:${showId}:${length}`, entries);
  }

  await pipeline.exec();

  console.log(`✅ Segments cached for show ${showId}`);
}

 



export async function displaySegmentData(showId) {
  const seatToCenterKey = `segment:seat-to-center:${showId}`;
  const centerToDataKey = `segment:center-to-data:${showId}`;

  const [seatToCenter, centerToData] = await Promise.all([
    redis.hGetAll(seatToCenterKey),
    redis.hGetAll(centerToDataKey),
  ]);

  const segmentZsetKeys = await redis.keys(`segment:sorted-centers:${showId}:*`);

  const sortedCentersByLength = {};
  for (const key of segmentZsetKeys) {
    const length = key.split(":").pop();
    sortedCentersByLength[length] = await redis.zRangeWithScores(key, 0, -1);
  }

  console.log(`\n--- 🔍 Segment Data for Show ID: ${showId} ---\n`);

  console.log("\n📌 segment:seat-to-center");
  for (const [seat, center] of Object.entries(seatToCenter)) {
    console.log(`  ${seat} → ${center}`);
  }

  console.log("\n📌 segment:center-to-data");
  for (const [center, json] of Object.entries(centerToData)) {
    const parsed = JSON.parse(json);
    console.log(`  ${center}:`, parsed);
  }

  for (const [length, entries] of Object.entries(sortedCentersByLength)) {
    console.log(`\n📌 segment:sorted-centers (length=${length})`);
    for (const entry of entries) {
      console.log(`  ${entry.value} (distance: ${entry.score})`);
    }
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