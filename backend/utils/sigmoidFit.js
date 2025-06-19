import Survey from '../models/surveyModel.js';
import redis from '../lib/redis.js';
import { surveyWindowDays, maxUsers } from '../config/survey.config.js';



const getProbabilities = async (data , windowSize = 2) => {
  const counts = Object.keys(data).map(Number).sort((a, b) => a - b);
  
  const raw = counts.map(x => {
    const { booked, notBooked } = data[x];
    const total = booked + notBooked;
    return total === 0 ? 0 : booked / total;
  });

  const smoothed = raw.map((_, i, arr) => {
    let start = Math.max(0, i - Math.floor(windowSize / 2));
    let end = Math.min(arr.length, i + Math.ceil(windowSize / 2));
    const slice = arr.slice(start, end);
    return slice.reduce((sum, val) => sum + val, 0) / slice.length;
  });

  // Enforce monotonic decreasing
  for (let i = 1; i < smoothed.length; i++) {
    if (smoothed[i] > smoothed[i - 1]) {
      smoothed[i] = smoothed[i - 1];
    }
  }

  // Extend to maxUsers
  const result = {};
  for (let i = 0; i <= maxUsers; i++) {
    if (counts.includes(i)) {
      const index = counts.indexOf(i);
      result[i] = smoothed[index];
    } else {
      // use last available value (monotonic, so safe)
      result[i] = smoothed[smoothed.length - 1];
    }
  }

  return result;
};

const fitAndCacheSurveyCurve = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - surveyWindowDays); 

    const surveys = await Survey.find({ updatedAt: { $gte: cutoffDate } });

    const aggregateData = {};

    for (const doc of surveys) {
      const dataMap = doc.data;
      for (const [count, value] of dataMap.entries()) {
        if (!aggregateData[count]) {
          aggregateData[count] = { booked: 0, notBooked: 0 };
        }
        aggregateData[count].booked += value.booked;
        aggregateData[count].notBooked += value.notBooked;
      }
    }

    const probabilities = await getProbabilities(aggregateData);
    await redis.set("survey:curve", JSON.stringify(probabilities));
    return probabilities;
  } catch (err) {
    console.error("Error fitting and caching survey curve:", err.message);
    throw new Error("Curve fitting failed");
  }
};

const getCachedSurveyCurve = async () => {
  try {
    const data = await redis.get("survey:curve");
    if (!data) {
      throw new Error("No cached survey data found");
    }
    return JSON.parse(data);
  } catch (err) {
    console.error("Error fetching cached survey data:", err.message);
    throw err;
  }
};

export {
  getProbabilities,
  fitAndCacheSurveyCurve,
  getCachedSurveyCurve
}
