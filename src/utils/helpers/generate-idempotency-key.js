const { v4: uuidv4 } = require("uuid");

function generateIdempotencyKey() {
  return uuidv4();
}

module.exports = { generateIdempotencyKey };
