import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import WebSocket from "ws";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";

import userModel from "./models/userModel.js";
import authRoutes from "./routes/auth.routes.js";
import movieRoutes from "./routes/movie.routes.js";
import showRoutes from "./routes/show.routes.js";
import theaterRoutes from "./routes/theater.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import seatRoutes from "./routes/seat.routes.js";
import { getAllSurveyData } from "./controllers/cacheControllers/surveyData.controller.js";
import { fitAndCacheSurveyCurve } from "./utils/probabilities.utils.js";
import { setupSocket } from "./socket/index.js";
import { generateSegmentsForAllShows, displaySegmentData } from "./utils/cache.utils.js"
import "./cron/surveyCron.js";
import "dotenv/config";
const app = express();
const salt = 8;
const serverPortNumber = process.env.PORT;
// const firstPort = 50000;

const server = http.createServer(app);
setupSocket(server);



const startServer = async () => {
  // const seatProbabilities = await fitAndCacheSurveyCurve();
  // console.log(seatProbabilities);
  await generateSegmentsForAllShows();
  await displaySegmentData("685b0cdb8a50e8342f4d84d4") 
  server.listen(serverPortNumber, () => {
    console.log("SERVER IS RUNNING AT PORT:", serverPortNumber);
  });
};
 
startServer();


const DB_URL = process.env.MONGO_URI; 
mongoose.connect(DB_URL);
const db = mongoose.connection;

db.on("error", () => {
  console.log("ERROR OCCURRED WHILE CONNECTING TO DATABASE");
});
db.once("open", () => {
  console.log("Connected to MongoDB");
  init();
});

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

async function init() {
  try {
    const user = await userModel.findOne({ userID: "abhishek_55" });

    if (user) {
      console.log("ADMIN IS ALREADY PRESENT ->", user.fullName);
      return;
    }
  } catch (err) {
    console.log(err, "ERROR OCCURRED WHILE CHECKING ADMIN");
  }

  try {
    await userModel.create({
      fullName: "Abhishek Yadav",
      userID: "abhishek_55",
      password: bcrypt.hashSync("abhi123", salt),
      email: "abhishek908489@gmail.com", 
      userType: "ADMIN",
    });

    const user = await userModel.findOne({ userID: "abhishek_55" });
    console.log("ADMIN CREATED", user);
  } catch (err) {
    console.log(err, "ERROR OCCURRED WHILE CREATING ADMIN");
  }
}

app.get("/bookingApp/api/survey", getAllSurveyData);
app.use("/bookingApp/api/auth", authRoutes);
app.use("/bookingApp/api/movie", movieRoutes);
app.use("/bookingApp/api/show", showRoutes);
app.use("/bookingApp/api/theater", theaterRoutes);
app.use("/bookingApp/api/booking", bookingRoutes);
app.use("/bookingApp/api/seat", seatRoutes);
