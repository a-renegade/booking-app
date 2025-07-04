import redis from '../lib/redis/redis.js';

const allocateSubgroupsBackend = async ( showId, userCenter, subgroups, maxLength = 10 )=> {
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
    let bestSegment = null;
    let bestWindow = null;
    let bestDistance = Infinity;
    let bestLengthDiff = Infinity;

    for (let tryLength = subgroupSize; tryLength <= maxLength; tryLength++) {
      const key = `segment:sorted-centers:${showId}:${tryLength}`;
      const centers = await redis.zRange(key, 0, 0); // closest by score
      const center = centers[0];
      if (!center) continue;

      const dataStr = await redis.hGet(`segment:center-to-data:${showId}`, center);
      if (!dataStr) continue;

      let data;
      try {
        data = JSON.parse(dataStr);
      } catch (e) {
        continue;
      }

      if (!data.start || !data.end) continue;
      const [row1, startCol] = parseSeat(data.start);
      const [, endCol] = parseSeat(data.end);
      const length = endCol - startCol + 1;

      if (length < subgroupSize) continue;

      for (let i = startCol; i <= endCol - subgroupSize + 1; i++) {
        const centerCol = i + Math.floor((subgroupSize - 1) / 2);
        const dist = manhattan(userRow, userCol, row1, centerCol);
        const lengthDiff = Math.abs(tryLength - subgroupSize);

        if (
          lengthDiff < bestLengthDiff ||
          (lengthDiff === bestLengthDiff && dist < bestDistance)
        ) {
          bestLengthDiff = lengthDiff;
          bestDistance = dist;
          bestWindow = { row: row1, startCol: i, endCol: i + subgroupSize - 1 };
          bestSegment = {
            center,
            data,
            score: await redis.zScore(key, center),
          };
        }
      }
    }

    if (!bestSegment) {
      // rollback everything done so far
      for (const s of addedSegments) {
        await redis.hDel(`segment:center-to-data:${showId}`, s.center);
        await redis.zRem(`segment:sorted-centers:${showId}:${s.data.length}`, s.center);
      }
      for (const s of deletedSegments) {
        await redis.hSet(
          `segment:center-to-data:${showId}`,
          s.center,
          JSON.stringify(s.data)
        );
        await redis.zAdd(`segment:sorted-centers:${showId}:${s.data.length}`, {
          score: s.score,
          value: s.center,
        });
      }
      return { success: false, failedSubgroup: subgroupSize };
    }

    // delete original segment
    await redis.hDel(`segment:center-to-data:${showId}`, bestSegment.center);
    await redis.zRem(`segment:sorted-centers:${showId}:${bestSegment.data.length}`, bestSegment.center);
    deletedSegments.push(bestSegment);

    const [leftStartRow, leftStartCol] = parseSeat(bestSegment.data.start);
    const [, rightEndCol] = parseSeat(bestSegment.data.end);
    const leftEndCol = bestWindow.startCol - 1;
    const rightStartCol = bestWindow.endCol + 1;

    // left part
    if (leftStartCol <= leftEndCol) {
      const leftCenterCol = Math.floor((leftStartCol + leftEndCol) / 2);
      const leftCenter = makeSeat(bestWindow.row, leftCenterCol);
      const leftData = {
        start: makeSeat(bestWindow.row, leftStartCol),
        end: makeSeat(bestWindow.row, leftEndCol),
        length: leftEndCol - leftStartCol + 1,
        distance: manhattan(userRow, userCol, bestWindow.row, leftCenterCol),
      };
      await redis.hSet(`segment:center-to-data:${showId}`, leftCenter, JSON.stringify(leftData));
      await redis.zAdd(`segment:sorted-centers:${showId}:${leftData.length}`, {
        score: leftData.length,
        value: leftCenter,
      });
      addedSegments.push({ center: leftCenter, data: leftData });
    }

    // right part
    if (rightStartCol <= rightEndCol) {
      const rightCenterCol = Math.floor((rightStartCol + rightEndCol) / 2);
      const rightCenter = makeSeat(bestWindow.row, rightCenterCol);
      const rightData = {
        start: makeSeat(bestWindow.row, rightStartCol),
        end: makeSeat(bestWindow.row, rightEndCol),
        length: rightEndCol - rightStartCol + 1,
        distance: manhattan(userRow, userCol, bestWindow.row, rightCenterCol),
      };
      await redis.hSet(`segment:center-to-data:${showId}`, rightCenter, JSON.stringify(rightData));
      await redis.zAdd(`segment:sorted-centers:${showId}:${rightData.length}`, {
        score: rightData.length,
        value: rightCenter,
      });
      addedSegments.push({ center: rightCenter, data: rightData });
    }

    seatRanges.push({
      size: subgroupSize,
      range: {
        start: makeSeat(bestWindow.row, bestWindow.startCol),
        end: makeSeat(bestWindow.row, bestWindow.endCol),
      },
    });
  }

  // clean old seat-to-center
  for (const s of deletedSegments) {
    const [row, startCol] = parseSeat(s.data.start);
    const [, endCol] = parseSeat(s.data.end);
    for (let c = startCol; c <= endCol; c++) {
      await redis.hDel(`segment:seat-to-center:${showId}`, makeSeat(row, c));
    }
  }

  // update new seat-to-center
  for (const s of addedSegments) {
    const [row, startCol] = parseSeat(s.data.start);
    const [, endCol] = parseSeat(s.data.end);
    for (let c = startCol; c <= endCol; c++) {
      await redis.hSet(`segment:seat-to-center:${showId}`, makeSeat(row, c), s.center);
    }
  }

  return { success: true, allocations: seatRanges };
}

export {
    allocateSubgroupsBackend,
}
