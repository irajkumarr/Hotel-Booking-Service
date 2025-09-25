const express = require("express");
const { ServerConfig, Logger } = require("./config");
const apiRoutes = require("./routes");
const { errorHandler } = require("./middlewares");
const morgan = require("morgan");
const {
  attachCorrelationIdMiddleware,
} = require("./middlewares/correlation-middleware");
const bookingScheduler = require("./scheduler/booking-scheduler");

const app = express();

//* Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(attachCorrelationIdMiddleware);

//routes
app.use("/api", apiRoutes);

//* Error Handler
app.use(errorHandler);

// Start the scheduler
bookingScheduler();

//Server starting
app.listen(ServerConfig.PORT, () => {
  Logger.info(`🚀 Server started at PORT ${ServerConfig.PORT}`);
  Logger.info(`Press Ctrl+C to stop the server.`);
});
