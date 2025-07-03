local log = {}

-- ARGV[1] = lock ID (e.g., UUID)
-- ARGV[2] = expiration time in ms (TTL, PX)
-- ARGV[3] = showId
-- ARGV[4] = user-defined center seat (e.g., "A-5")

-- Step 1: Check if any seat is already locked
for i = 1, #KEYS do
  local redisKey = "seat:lock:" .. ARGV[3] .. ":" .. KEYS[i]
  if redis.call("exists", redisKey) == 1 then 
    table.insert(log, "Seat already locked: " .. KEYS[i])
    return cjson.encode(log)
  end
end

-- Utility: Parse seat "A-5" => "A", 5
local function parseSeat(s)
  local row, col = string.match(s, "([A-Z]+)%-(%d+)")
  return row, tonumber(col)
end

-- Manhattan distance between two seats
local function manhattan(row1, col1, row2, col2)
  local rowDist = math.abs(string.byte(row1, 1) - string.byte(row2, 1))
  local colDist = math.abs(col1 - col2)
  return rowDist + colDist
end

local userCenterRow, userCenterCol = parseSeat(ARGV[4])

local function splitSegment(showId, seat)
  local seatToCenterKey = "segment:seat-to-center:" .. showId
  local centerToDataKey = "segment:center-to-data:" .. showId

  local center = redis.call("HGET", seatToCenterKey, seat)
  table.insert(log, "Splitting seat: " .. seat .. " center: " .. tostring(center))
  if not center then return end

  local segmentJson = redis.call("HGET", centerToDataKey, center)
  if not segmentJson then return end

  local segment = cjson.decode(segmentJson)
  local startSeat = segment["start"]
  local endSeat = segment["end"]
  local segmentLength = segment["length"]
  local sortedCentersKey = "segment:sorted-centers:" .. showId .. ":" .. segmentLength

  local row, col = parseSeat(seat)
  local _, startCol = parseSeat(startSeat)
  local _, endCol = parseSeat(endSeat)

  -- Delete original segment
  redis.call("HDEL", centerToDataKey, center)
  redis.call("ZREM", sortedCentersKey, center)
  for i = startCol, endCol do
    redis.call("HDEL", seatToCenterKey, row .. "-" .. i)
  end

  -- Left segment (if any)
  if col > startCol then
    local newStart = startSeat
    local newEnd = row .. "-" .. (col - 1)
    local newLen = col - startCol
    local newCenterCol = startCol + math.floor((col - startCol) / 2)
    local newCenter = row .. "-" .. newCenterCol
    local newDistance = manhattan(row, newCenterCol, userCenterRow, userCenterCol)

    local leftSegment = {
      start = newStart,
      ["end"] = newEnd,
      length = newLen,
      distance = newDistance
    }

    table.insert(log, "Created left segment: " .. cjson.encode(leftSegment))

    local leftZsetKey = "segment:sorted-centers:" .. showId .. ":" .. newLen
    redis.call("HSET", centerToDataKey, newCenter, cjson.encode(leftSegment))
    redis.call("ZADD", leftZsetKey, newDistance, newCenter)
    for i = startCol, col - 1 do
      redis.call("HSET", seatToCenterKey, row .. "-" .. i, newCenter)
    end
  end

  -- Right segment (if any)
  if col < endCol then
    local newStart = row .. "-" .. (col + 1)
    local newEnd = endSeat
    local newLen = endCol - col
    local newCenterCol = col + 1 + math.floor((endCol - col - 1) / 2)
    local newCenter = row .. "-" .. newCenterCol
    local newDistance = manhattan(row, newCenterCol, userCenterRow, userCenterCol)

    local rightSegment = {
      start = newStart,
      ["end"] = newEnd,
      length = newLen,
      distance = newDistance
    }

    table.insert(log, "Created right segment: " .. cjson.encode(rightSegment))

    local rightZsetKey = "segment:sorted-centers:" .. showId .. ":" .. newLen
    redis.call("HSET", centerToDataKey, newCenter, cjson.encode(rightSegment))
    redis.call("ZADD", rightZsetKey, newDistance, newCenter)
    for i = col + 1, endCol do
      redis.call("HSET", seatToCenterKey, row .. "-" .. i, newCenter)
    end
  end
end

-- Step 2: Lock + Split each seat
for i = 1, #KEYS do
  local seat = KEYS[i]
  local redisKey = "seat:lock:" .. ARGV[3] .. ":" .. seat
  redis.call("set", redisKey, ARGV[1], "PX", ARGV[2])
  table.insert(log, "Locked seat: " .. seat)
  splitSegment(ARGV[3], seat)
end

return 1
-- return cjson.encode(log)
