import express from "express";
const router = express.Router();

import * as authController from "../controllers/auth.controller.js";
import * as authMiddleware from "../middlewares/auth.middleware.js";

router.post("/signup", [authMiddleware.signUp], authController.signUp);
router.post("/signin", [authMiddleware.signIn], authController.signIn);
router.post("/logout", authController.logout);
router.get("/check", authController.authCheck);
export default router;
