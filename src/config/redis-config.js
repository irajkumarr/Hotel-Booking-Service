const IORedis = require("ioredis");
const serverConfig = require("./server-config");
const logger = require("./logger-config");

// Redis connection
const redisConnection = new IORedis(serverConfig.REDIS_URL, {
  maxRetriesPerRequest: null, // required for BullMQ
});

redisConnection.on("connect", () => {
  logger.info("✅ Connected to Redis");
});

redisConnection.on("error", (err) => {
  logger.error("❌ Redis connection error:", err.message);
});

module.exports = { redisConnection };
