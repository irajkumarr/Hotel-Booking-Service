const { v4: uuidv4 } = require("uuid");
const { asyncLocalStorage } = require("../utils/helpers/request-helpers");

function attachCorrelationIdMiddleware(req, res, next) {
  const correlationId = uuidv4();
  req.headers["x-correlation-id"] = correlationId;

  asyncLocalStorage.run({ correlationId }, () => {
    next();
  });
}

module.exports = {
  attachCorrelationIdMiddleware,
};
