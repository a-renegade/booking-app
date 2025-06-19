import { addSurveyData } from "../controllers/cacheControllers/surveyData.controller.js";

const surveyWindowDays = 180;
const maxUsers = 10;

const sampleData = {
  0:  { booked: 93, notBooked: 7  },  // 93%
  1:  { booked: 67, notBooked: 33 },  // 67%
  2:  { booked: 56, notBooked: 44 },  // 56%
  3:  { booked: 48, notBooked: 52 },  // 48%
  4:  { booked: 41, notBooked: 59 },  // 41%
  5:  { booked: 34, notBooked: 66 },  // 34%
  6:  { booked: 29, notBooked: 71 },  // 29%
  7:  { booked: 24, notBooked: 76 },  // 24%
  8:  { booked: 19, notBooked: 81 },  // 19%
  9:  { booked: 14, notBooked: 86 },  // 14%
  10: { booked: 10, notBooked: 90 },  // 10%
};
// const sampleData = {
//   0: { booked: 96, notBooked: 4 },
//   1: { booked: 94, notBooked: 6 },
//   2: { booked: 91, notBooked: 9 },
//   3: { booked: 92, notBooked: 8 },   // bump
//   4: { booked: 88, notBooked: 12 },
//   5: { booked: 86, notBooked: 14 },
//   6: { booked: 87, notBooked: 13 },  // bump
//   7: { booked: 84, notBooked: 16 },
//   8: { booked: 80, notBooked: 20 },
//   9: { booked: 82, notBooked: 18 },  // bump
//   10: { booked: 78, notBooked: 22 },
//   11: { booked: 75, notBooked: 25 },
//   12: { booked: 77, notBooked: 23 }, // bump
//   13: { booked: 73, notBooked: 27 },
//   14: { booked: 70, notBooked: 30 },
//   15: { booked: 72, notBooked: 28 }, // bump
//   16: { booked: 68, notBooked: 32 },
//   17: { booked: 66, notBooked: 34 },
//   18: { booked: 67, notBooked: 33 }, // bump
//   19: { booked: 64, notBooked: 36 },
//   20: { booked: 60, notBooked: 40 },
//   21: { booked: 62, notBooked: 38 }, // bump
//   22: { booked: 57, notBooked: 43 },
//   23: { booked: 54, notBooked: 46 },
//   24: { booked: 56, notBooked: 44 }, // bump
//   25: { booked: 50, notBooked: 50 },
//   26: { booked: 48, notBooked: 52 },
//   27: { booked: 49, notBooked: 51 }, // bump
//   28: { booked: 46, notBooked: 54 },
//   29: { booked: 43, notBooked: 57 },
//   30: { booked: 45, notBooked: 55 }, // bump
//   31: { booked: 41, notBooked: 59 },
//   32: { booked: 38, notBooked: 62 },
//   33: { booked: 40, notBooked: 60 }, // bump
//   34: { booked: 35, notBooked: 65 },
//   35: { booked: 33, notBooked: 67 },
//   36: { booked: 34, notBooked: 66 }, // bump
//   37: { booked: 30, notBooked: 70 },
//   38: { booked: 28, notBooked: 72 },
//   39: { booked: 29, notBooked: 71 }, // bump
//   40: { booked: 26, notBooked: 74 },
//   41: { booked: 24, notBooked: 76 },
//   42: { booked: 25, notBooked: 75 }, // bump
//   43: { booked: 22, notBooked: 78 },
//   44: { booked: 20, notBooked: 80 },
//   45: { booked: 21, notBooked: 79 }, // bump
//   46: { booked: 18, notBooked: 82 },
//   47: { booked: 16, notBooked: 84 },
//   48: { booked: 17, notBooked: 83 }, // bump
//   49: { booked: 14, notBooked: 86 },
//   50: { booked: 12, notBooked: 88 }
// };
// for (const count in sampleData) {
//   const { booked, notBooked } = sampleData[count];
//   addSurveyData( count ,booked , notBooked);
// } 
 
export { surveyWindowDays, maxUsers , sampleData };
