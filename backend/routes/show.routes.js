import express from "express";
const router = express.Router();

import {
  createShow,
  getAllShows,
  getShowsByMovie,
  getShowById,
  getShowsByTheaterId
} from "../controllers/show.controller.js";

import { authCheck } from "../middlewares/auth.middleware.js";

router.post("/", [authCheck], createShow);
router.get("/", [authCheck], getAllShows);
router.get("/movie/:movieId", [authCheck], getShowsByMovie);
router.get("/:id", [authCheck], getShowById);
router.get("/theater/:id",[authCheck],getShowsByTheaterId);
export default router;
