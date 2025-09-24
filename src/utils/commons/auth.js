const jwt = require("jsonwebtoken");
const { ServerConfig } = require("../../config");

function verifyToken(token) {
  return jwt.verify(token, ServerConfig.PUBLIC_KEY, { algorithms: ["RS256"] });
}

module.exports = {
  verifyToken,
};