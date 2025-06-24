import redis from "redis";
import "dotenv/config";
// console.log(process.env.REDIS_URL)
const client = redis.createClient({
    url:process.env.REDIS_URL
});

client.on("error", (err) => console.error("Redis error:", err));

client.connect(); // returns a promise
 
export default client;
  