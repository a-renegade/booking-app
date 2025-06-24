-- ARGV
-- [1] lockId
-- [2] ttl (ms)
-- [3] showId
-- [4] userCenter (e.g., "B-7")
-- [5] subgroupsJSON (e.g., "[3,2,4]")

local cjson = cjson
local lockId = ARGV[1]
local ttl = tonumber(ARGV[2])
local showId = ARGV[3]
local userCenter = ARGV[4]
local subgroups = cjson.decode(ARGV[5])

local function parseSeat(seat)
  local row, col = string.match(seat, "([A-Z])%-(%d+)")
  return row, tonumber(col)
end

local function makeSeat(row, col)
  return row .. "-" .. col
end

local function manhattan(row1, col1, row2, col2)
  return math.abs(row1:byte() - row2:byte()) + math.abs(col1 - col2)
end

local userRow, userCol = parseSeat(userCenter)

local finalAllocations = {}
local addedSegments = {}
local deletedSegments = {}
local seatRanges = {}
local prefix = "segment:"

for _, subgroupSize in ipairs(subgroups) do
  local candidates = redis.call("ZRANGEBYSCORE", prefix .. "sorted-centers:" .. showId, subgroupSize, "+inf", "LIMIT", 0, 20)

  local bestSegment = nil
  local bestWindow = nil
  local bestDistance = nil

  for _, center in ipairs(candidates) do
    local dataStr = redis.call("HGET", prefix .. "center-to-data:" .. showId, center)
    if dataStr then
      local ok, data = pcall(cjson.decode, dataStr)
      if ok and data.start and data["end"] then
        local row1, startCol = parseSeat(data.start)
        local _, endCol = parseSeat(data["end"])
        local length = endCol - startCol + 1

        if length >= subgroupSize then
          for i = startCol, endCol - subgroupSize + 1 do
            local centerCol = i + math.floor((subgroupSize - 1) / 2)
            local dist = manhattan(userRow, userCol, row1, centerCol)
            if not bestDistance or dist < bestDistance then
              bestDistance = dist
              bestWindow = { row = row1, startCol = i, endCol = i + subgroupSize - 1 }
              bestSegment = {
                center = center,
                data = data,
                score = redis.call("ZSCORE", prefix .. "sorted-centers:" .. showId, center)
              }
            end
          end
        end
      end
    end
  end

  if not bestSegment then
    for _, s in ipairs(addedSegments) do
      redis.call("HDEL", prefix .. "center-to-data:" .. showId, s.center)
      redis.call("ZREM", prefix .. "sorted-centers:" .. showId, s.center)
    end
    for _, s in ipairs(deletedSegments) do
      redis.call("HSET", prefix .. "center-to-data:" .. showId, s.center, cjson.encode(s.data))
      redis.call("ZADD", prefix .. "sorted-centers:" .. showId, s.score, s.center)
    end
    return cjson.encode({ success = false, failedSubgroup = subgroupSize })
  end

  -- Remove original segment
  redis.call("HDEL", prefix .. "center-to-data:" .. showId, bestSegment.center)
  redis.call("ZREM", prefix .. "sorted-centers:" .. showId, bestSegment.center)
  table.insert(deletedSegments, bestSegment)

  local leftStart = bestSegment.data.start
  local rightEnd = bestSegment.data["end"]

  local row = bestWindow.row
  local leftStartRow, leftStartCol = parseSeat(leftStart)
  local _, rightEndCol = parseSeat(rightEnd)

  local leftEndCol = bestWindow.startCol - 1
  local rightStartCol = bestWindow.endCol + 1

  if leftStartCol <= leftEndCol then
    local leftCenter = makeSeat(row, math.floor((leftStartCol + leftEndCol) / 2))
    local leftData = {
      start = makeSeat(row, leftStartCol),
      ["end"] = makeSeat(row, leftEndCol)
    }
    redis.call("HSET", prefix .. "center-to-data:" .. showId, leftCenter, cjson.encode(leftData))
    redis.call("ZADD", prefix .. "sorted-centers:" .. showId, leftEndCol - leftStartCol + 1, leftCenter)
    table.insert(addedSegments, { center = leftCenter, data = leftData })
  end

  if rightStartCol <= rightEndCol then
    local rightCenter = makeSeat(row, math.floor((rightStartCol + rightEndCol) / 2))
    local rightData = {
      start = makeSeat(row, rightStartCol),
      ["end"] = makeSeat(row, rightEndCol)
    }
    redis.call("HSET", prefix .. "center-to-data:" .. showId, rightCenter, cjson.encode(rightData))
    redis.call("ZADD", prefix .. "sorted-centers:" .. showId, rightEndCol - rightStartCol + 1, rightCenter)
    table.insert(addedSegments, { center = rightCenter, data = rightData })
  end

  table.insert(seatRanges, {
    size = subgroupSize,
    range = {
      start = makeSeat(row, bestWindow.startCol),
      ["end"] = makeSeat(row, bestWindow.endCol)
    }
  })
end

-- Lock seats
for _, alloc in ipairs(seatRanges) do
  local row, startCol = parseSeat(alloc.range.start)
  local _, endCol = parseSeat(alloc.range["end"])
  for col = startCol, endCol do
    local seat = makeSeat(row, col)
    local ok = redis.call("SET", "seat:lock:" .. showId .. ":" .. seat, lockId, "PX", ttl, "NX")
    if not ok then
      for _, s in ipairs(addedSegments) do
        redis.call("HDEL", prefix .. "center-to-data:" .. showId, s.center)
        redis.call("ZREM", prefix .. "sorted-centers:" .. showId, s.center)
      end
      for _, s in ipairs(deletedSegments) do
        redis.call("HSET", prefix .. "center-to-data:" .. showId, s.center, cjson.encode(s.data))
        redis.call("ZADD", prefix .. "sorted-centers:" .. showId, s.score, s.center)
      end
      return cjson.encode({ success = false, failedSubgroup = alloc.size })
    end
  end
end

-- Update seat-to-center
for _, s in ipairs(addedSegments) do
  local rowStart, colStart = parseSeat(s.data.start)
  local _, colEnd = parseSeat(s.data["end"])
  for c = colStart, colEnd do
    local seat = makeSeat(rowStart, c)
    redis.call("HSET", prefix .. "seat-to-center:" .. showId, seat, s.center)
  end
end

return cjson.encode({ success = true, allocations = seatRanges })
