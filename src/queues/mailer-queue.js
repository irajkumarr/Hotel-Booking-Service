const { Queue } = require("bullmq");
const { redisConnection } = require("../config/redis-config");

const MAILER_QUEUE = "mailer-queue";

const mailerQueue = new Queue(MAILER_QUEUE, {
 connection: redisConnection,
 defaultJobOptions:{
    attempts: 3, // 👈 add attempts here
    backoff: {
      type: "exponential",
      delay: 5000, // 5s, 10s, 20s...
    },
    removeOnComplete: false, // 👈 keep completed jobs (good for dev/testing)
    removeOnFail: false, // keep failed jobs too
  }
});

module.exports = {
  mailerQueue,
  MAILER_QUEUE,
};