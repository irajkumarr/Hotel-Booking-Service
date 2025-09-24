const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;
require("winston-daily-rotate-file");

const { getCorrelationId } = require("../utils/helpers/request-helpers");

const customFormat = printf(({ level, message, timestamp }) => {
  const correlationId = getCorrelationId();
  return `${timestamp}:[${correlationId}] ${level}: ${message}`;
});

// Configure daily rotate
const dailyRotateTransport = new transports.DailyRotateFile({
  filename: "logs/%DATE%-app.log", // The file name pattern
  datePattern: "YYYY-MM-DD", // The date format
  maxSize: "20m", // The maximum size of the log file
  maxFiles: "14d", // The maximum number of log files to keep
});

const logger = createLogger({
  format: combine(timestamp(), customFormat),
  transports: [dailyRotateTransport, new transports.Console()],
});

module.exports = logger;
