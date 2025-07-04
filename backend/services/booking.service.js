import redis from '../lib/redis/redis.js';
function formatTimestamp(ms) {
  const d = new Date(ms);
  return d.toISOString().replace("T", " ").replace("Z", "");
}
async function rollbackSegments(showId, addedSegments, deletedSegments, subgroupSize) {
  const removePipeline = redis.multi();
  for (const s of addedSegments) {
    removePipeline.hDel(`segment:center-to-data:${showId}`, s.center);
    removePipeline.zRem(`segment:sorted-centers:${showId}:${s.data.length}`, s.center);
  }
  await removePipeline.exec();

  const restorePipeline = redis.multi();
  for (const s of deletedSegments) {
    restorePipeline.hSet(`segment:center-to-data:${showId}`, s.center, JSON.stringify(s.data));
    restorePipeline.zAdd(`segment:sorted-centers:${showId}:${s.data.length}`, {
      score: s.score,
      value: s.center,
    });
  }
  await restorePipeline.exec();

  return { success: false, failedSubgroup: subgroupSize };
  
}
const allocateSubgroupsBackend = async (showId, userCenter, subgroups, maxLength = 12) => {
  function parseSeat(seat) {
    const [row, col] = seat.split("-");
    return [row, parseInt(col, 10)];
  }

  function makeSeat(row, col) {
    return `${row}-${col}`;
  }

  function manhattan(row1, col1, row2, col2) {
    return Math.abs(row1.charCodeAt(0) - row2.charCodeAt(0)) + Math.abs(col1 - col2);
  }

  const [userRow, userCol] = parseSeat(userCenter);
  const addedSegments = [];
  const deletedSegments = [];
  const seatRanges = [];

  for (const subgroupSize of subgroups) {
    console.log("1",formatTimestamp(Date.now()));
    const fetchCentersPipeline = redis.multi();
    const keys = [];
    
    for (let tryLength = subgroupSize; tryLength <= maxLength; tryLength++) {
      const key = `segment:sorted-centers:${showId}:${tryLength}`;
      keys.push({ tryLength, key });
      fetchCentersPipeline.zRange(key, 0, 0);
    }
  
    const responses = await fetchCentersPipeline.exec();
    console.log("2",formatTimestamp(Date.now()));
    // console.log(responses)
    let bestDistance = Infinity;
    let bestTryLength = null;
    let bestCenter = null;
    // console.log(JSON.stringify(responses, null, 2));
    for (let i = 0; i < responses.length; i++) {
      const centers = responses[i];
      if (!centers || !centers.length) continue;

      const center = centers[0];
      const { tryLength } = keys[i];

      const [row, col] = parseSeat(center);
      const dist = manhattan(userRow, userCol, row, col);

      if (dist < bestDistance) {
        bestDistance = dist;
        bestTryLength = tryLength;
        bestCenter = center;
      }
    }

    
    if (!bestCenter) {
      const rollbackResult = await rollbackSegments(showId, addedSegments, deletedSegments, subgroupSize);
      return rollbackResult;
    }
    

    const dataStr = await redis.hGet(`segment:center-to-data:${showId}`, bestCenter);
    console.log("3",formatTimestamp(Date.now()));
    if (!dataStr) {
      const rollbackResult = await rollbackSegments(showId, addedSegments, deletedSegments, subgroupSize);
      return rollbackResult;
    }

    let data;
    try {
      data = JSON.parse(dataStr);
    } catch {
      return { success: false, failedSubgroup: subgroupSize };
    }

    if (!data.start || !data.end) {
      return { success: false, failedSubgroup: subgroupSize };
    }
    
    const [row1, startCol] = parseSeat(data.start);
    const [, endCol] = parseSeat(data.end);
    const length = endCol - startCol + 1;
    if (length < subgroupSize) {
      return { success: false, failedSubgroup: subgroupSize };
    }
    
    let bestWindow = null;
    let bestDistanceForWindow = Infinity;
    // console.log("first")
    for (let i = startCol; i <= endCol - subgroupSize + 1; i++) {
      const centerCol = i + Math.floor((subgroupSize - 1) / 2);
      const dist = manhattan(userRow, userCol, row1, centerCol);
      if (dist < bestDistanceForWindow) {
        bestDistanceForWindow = dist;
        bestWindow = { row: row1, startCol: i, endCol: i + subgroupSize - 1 };
      }
    }
    
    if (!bestWindow) {
      const rollbackResult = await rollbackSegments(showId, addedSegments, deletedSegments, subgroupSize);
      return rollbackResult;
    }
    
    const score = bestDistance;
    console.log("4",formatTimestamp(Date.now()));
    const bestSegment = { center: bestCenter, data, score };
    deletedSegments.push(bestSegment);
    const removeBestCenterPipeline = redis.multi();
    removeBestCenterPipeline.hDel(`segment:center-to-data:${showId}`, bestCenter);
    removeBestCenterPipeline.zRem(`segment:sorted-centers:${showId}:${data.length}`, bestCenter);
    await removeBestCenterPipeline.exec();

    console.log("5",formatTimestamp(Date.now()));
    

    const [leftStartRow, leftStartCol] = parseSeat(bestSegment.data.start);
    const [, rightEndCol] = parseSeat(bestSegment.data.end);
    const leftEndCol = bestWindow.startCol - 1;
    const rightStartCol = bestWindow.endCol + 1;

    const splitSegmentPipeline = redis.multi();
    if (leftStartCol <= leftEndCol) {
      const leftCenterCol = Math.floor((leftStartCol + leftEndCol) / 2);
      const leftCenter = makeSeat(bestWindow.row, leftCenterCol);
      const leftData = {
        start: makeSeat(bestWindow.row, leftStartCol),
        end: makeSeat(bestWindow.row, leftEndCol),
        length: leftEndCol - leftStartCol + 1,
        distance: manhattan(userRow, userCol, bestWindow.row, leftCenterCol),
      };
      splitSegmentPipeline.hSet(`segment:center-to-data:${showId}`, leftCenter, JSON.stringify(leftData));
      splitSegmentPipeline.zAdd(`segment:sorted-centers:${showId}:${leftData.length}`, {
        score: leftData.length,
        value: leftCenter,
      });
      addedSegments.push({ center: leftCenter, data: leftData });
    }
    console.log("6",formatTimestamp(Date.now()));
    if (rightStartCol <= rightEndCol) {
      const rightCenterCol = Math.floor((rightStartCol + rightEndCol) / 2);
      const rightCenter = makeSeat(bestWindow.row, rightCenterCol);
      const rightData = {
        start: makeSeat(bestWindow.row, rightStartCol),
        end: makeSeat(bestWindow.row, rightEndCol),
        length: rightEndCol - rightStartCol + 1,
        distance: manhattan(userRow, userCol, bestWindow.row, rightCenterCol),
      };
      splitSegmentPipeline.hSet(`segment:center-to-data:${showId}`, rightCenter, JSON.stringify(rightData));
      splitSegmentPipeline.zAdd(`segment:sorted-centers:${showId}:${rightData.length}`, {
        score: rightData.length,
        value: rightCenter,
      });
      addedSegments.push({ center: rightCenter, data: rightData });
    }
    await splitSegmentPipeline.exec();
    console.log("7",formatTimestamp(Date.now()));
    seatRanges.push({
      size: subgroupSize,
      range: {
        start: makeSeat(bestWindow.row, bestWindow.startCol),
        end: makeSeat(bestWindow.row, bestWindow.endCol),
      },
    });
  }
  
  const seatToCenterDel = redis.multi();
  for (const s of deletedSegments) {
    const [row, startCol] = parseSeat(s.data.start);
    const [, endCol] = parseSeat(s.data.end);
    for (let c = startCol; c <= endCol; c++) {
      seatToCenterDel.hDel(`segment:seat-to-center:${showId}`, makeSeat(row, c));
    }
  }
  await seatToCenterDel.exec();
  console.log("8",formatTimestamp(Date.now()));
  const seatToCenterAdd = redis.multi();
  for (const s of addedSegments) {
    const [row, startCol] = parseSeat(s.data.start);
    const [, endCol] = parseSeat(s.data.end);
    for (let c = startCol; c <= endCol; c++) {
      seatToCenterAdd.hSet(`segment:seat-to-center:${showId}`, makeSeat(row, c), s.center);
    }
  }
  await seatToCenterAdd.exec();
  console.log("9",formatTimestamp(Date.now()));
  return { success: true, allocations: seatRanges };
}; 

export { allocateSubgroupsBackend };
