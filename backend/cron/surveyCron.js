import cron from "node-cron";
import { commitSurveyData } from "../controllers/cacheControllers/surveyData.controller.js";

cron.schedule("0 0 * * *", async () => {
  console.log("Running periodic survey commit...");
  try {
    await commitSurveyData();
    const timeNow = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    console.log(`Survey data committed successfully at ${timeNow}`);
  } catch (err) {
    console.error("Error committing survey data:", err.message);
  }
});
