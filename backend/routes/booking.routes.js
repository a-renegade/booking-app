import express from "express";
const router = express.Router();

import { authCheck } from "../middlewares/auth.middleware.js";
import checkSeatAvailability from "../middlewares/booking.middleware.js";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  autoBooking,
} from "../controllers/booking.controller.js";

router.post("/", [authCheck, checkSeatAvailability], createBooking);
router.post("/auto", [authCheck], autoBooking);
router.get("/", [authCheck], getAllBookings);
router.get("/:id", [authCheck], getBookingById);

export default router;
