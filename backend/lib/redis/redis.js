import { createClient } from "redis";
import "dotenv/config";

let redisClient;

async function initRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000), // backoff
      },
    });

    redisClient.on("error", (err) => {
      console.error("❌ Redis error:", err);
    }); 

    redisClient.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redisClient.on("reconnecting", () => {
      console.log("↻ Redis reconnecting...");
    });

    await redisClient.connect();
  }
  return redisClient;
}

export default await initRedis(); // top-level await allowed in ES modules
