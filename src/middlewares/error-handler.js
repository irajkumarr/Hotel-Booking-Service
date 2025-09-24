const { StatusCodes } = require("http-status-codes");
const { Logger } = require("../config");

const errorHandler = (err, req, res, next) => {
  Logger.error(`💥 ${err.message}`);

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = "Something went wrong";

  res.status(statusCode).json({
    success: false,
    message,
    data: {},
    error: {
      statusCode,
      explanation: Array.isArray(err.explanation)
        ? err.explanation
        : err.explanation
        ? [err.explanation]
        : ["Unexpected error occurred"],
    },
  });
};

module.exports = errorHandler;
