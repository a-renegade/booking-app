import express from "express";
const router = express.Router();

import {
  createTheater,
  getAllTheaters,
  getTheaterById,
  getTheatersByOwner,
} from "../controllers/theater.controller.js";

import { authCheck } from "../middlewares/auth.middleware.js";

router.post("/", [authCheck], createTheater);
router.get("/", [authCheck], getAllTheaters);
router.get("/owner",[ authCheck ], getTheatersByOwner);
router.get("/:id", [authCheck], getTheaterById);


export default router;
