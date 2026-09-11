import express from "express";
const router = express.Router();

// import {
//   selectSeat,
//   deselectSeat,
//   getSeatUserCount,
//   getSeatUsers,
//   getShowSeatSelectionCounts,
//   getSegmentInfo,
// } from "../controllers/cacheControllers/seat.controller.js";

import { authCheck } from "../middlewares/auth.middleware.js";


// router.get("/segments", getSegmentInfo);
export default router;
