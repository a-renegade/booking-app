import redis from "../../lib/redis/redis.js";
import Survey from "../../models/surveyModel.js";

const SURVEY_KEY_PREFIX = "survey:data:";

const fetchAllSurveyData = async () => {
  try {
    const keys = await redis.keys(`${SURVEY_KEY_PREFIX}*`);
    if (keys.length == 0) return null;

    const allSurveys = {};

    for (const key of keys) {
      const count = key.split(":")[2]; // `survey:data:count`
      const data = await redis.hGetAll(key);
      allSurveys[count] = {
        booked: data.booked ? JSON.parse(data.booked) : 0,
        notBooked: data.notBooked ? JSON.parse(data.notBooked) : 0,
      };
    }

    return allSurveys;
  } catch (err) {
    console.error("Error fetching all survey data:", err.message);
    throw new Error("Survey fetch failed");
  }
};

const deleteAllSurveyDataFromCache = async () => {
  try {
    const keys = await redis.keys(`${SURVEY_KEY_PREFIX}*`);
    if (keys.length === 0) {
      console.log("No survey data found in cache.");
      return;
    }

    await redis.del(keys);
  } catch (err) {
    console.error("Error deleting survey data from Redis:", err.message);
  }
};

const commitSurveyData = async () => {
  try {
    const surveyData = await fetchAllSurveyData();

    if (!surveyData) {
      console.log("No survey data to commit");
      return;
    }

    await Survey.create({
      show: "all",
      data: surveyData,
      updatedAt: new Date(),
    });

    await deleteAllSurveyDataFromCache();
    console.log("Deleted all survey data");
  } catch (err) {
    console.error("Error committing survey data:", err.message);
  }
};

const addSurveyData = async (count, booked, notBooked) => {
  try {
    const key = `${SURVEY_KEY_PREFIX}${count}`;
    const existingData = await redis.hGetAll(key);

    const currentBooked = parseInt(existingData.booked) || 0;
    const currentNotBooked = parseInt(existingData.notBooked) || 0;

    const newBooked = currentBooked + booked;
    const newNotBooked = currentNotBooked + notBooked;

    await redis.hSet(key, {
      booked: JSON.stringify(newBooked),
      notBooked: JSON.stringify(newNotBooked),
    });

    await redis.expire(key, 86400); // 24 hours

    return { message: "Survey data updated successfully" };
  } catch (err) {
    console.error("Error updating survey data:", err.message);
    throw new Error("Internal server error");
  }
};

const processSurveyData = async (surveyData) => {
  try {
    const { showId, userID, seats } = surveyData;

    for (const seat of seats) {
      const redisKey = `seat:${showId}:${seat.row}-${seat.col}`;
      const seatUsers = await redis.hGetAll(redisKey);

      for (const [otherUserID, value] of Object.entries(seatUsers)) {
        if (otherUserID === userID) {
          await addSurveyData(value, 1, 0);
        } else {
          await addSurveyData(value, 0, 1);
        }
      }

      await redis.del(redisKey);
    }
  } catch (err) {
    console.error("Error processing survey data:", err.message);
    throw new Error("Internal server error");
  }
};

const getAllSurveyData = async (req, res) => {
  try {
    const allSurveys = await fetchAllSurveyData();
    res.status(200).json(allSurveys);
  } catch (err) {
    console.error("Error fetching all survey data:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  addSurveyData,
  processSurveyData,
  getAllSurveyData,
  commitSurveyData,
};
