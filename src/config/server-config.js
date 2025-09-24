require("dotenv").config();
const fs = require("fs");
const path = require("path");

module.exports = {
  PORT: process.env.PORT,
  PUBLIC_KEY: fs.readFileSync(path.join(__dirname, "../../public.key"), "utf8"),
  //Redis
  REDIS_URL: process.env.REDIS_URL,
};
