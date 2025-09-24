// @ts-ignore
const IORedis = require("ioredis");
const serverConfig = require("./server-config");
const logger = require("./logger-config");
const Redlock = require("redlock");

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

const redlock = new Redlock([redisConnection], {
  driftFactor: 0.01, // time in ms
  retryCount: 10,
  retryDelay: 200, // time in ms
  retryJitter: 200, // time in ms
});

module.exports = { redisConnection, redlock };
