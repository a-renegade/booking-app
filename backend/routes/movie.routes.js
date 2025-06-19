import express from "express";
const router = express.Router();

import * as movieController from "../controllers/movie.controller.js";
import { validateMovie } from "../middlewares/movie.middleware.js";
import { authCheck } from "../middlewares/auth.middleware.js";

router.post("/", [authCheck], validateMovie, movieController.createMovie);
router.get("/", [authCheck], movieController.getAllMovies);
router.get("/:id", [authCheck], movieController.getMovieById);
router.put("/:id", [authCheck], validateMovie, movieController.updateMovie);
router.delete("/:id", [authCheck], movieController.deleteMovie);

export default router; 
