const { AsyncLocalStorage } = require("async_hooks");

const asyncLocalStorage = new AsyncLocalStorage(); //instance

function getCorrelationId() {
  const asyncStore = asyncLocalStorage.getStore();
  return (
    asyncStore?.correlationId || "unknown-error-while-creating-correlation-id"
  ); // Default value if not found
}

module.exports = {
  getCorrelationId,
  asyncLocalStorage,
};
