import express from "express";
const router = express.Router();

import {
  selectSeat,
  deselectSeat,
  getSeatUserCount,
  getSeatUsers,
  getShowSeatSelectionCounts
} from "../controllers/cacheControllers/seat.controller.js";

import { authCheck } from "../middlewares/auth.middleware.js";

router.post("/select", [authCheck], selectSeat);
router.post("/deselect", [authCheck], deselectSeat);
router.post("/count", getSeatUserCount);
router.post("/users", getSeatUsers);
router.post("/data", getShowSeatSelectionCounts);

export default router;
