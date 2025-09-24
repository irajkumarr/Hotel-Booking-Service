const { StatusCodes } = require("http-status-codes");
const { AppError } = require("../utils");
const { Auth } = require("../utils/commons");
const axios = require("axios");
const { ServerConfig } = require("../config");
const { Enums } = require("../utils/commons");
const { USER, ADMIN, HOTEL_MANAGER, HOTEL_STAFF } = Enums.ROLE_TYPE;

async function checkAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Missing or invalid Authorization header",
        StatusCodes.UNAUTHORIZED
      );
    }

    const token = authHeader.split(" ")[1];

    //  Verify JWT locally
    let decoded;
    try {
      decoded = Auth.verifyToken(token); // using public key
    } catch (err) {
      throw new AppError("Invalid token", StatusCodes.UNAUTHORIZED);
    }

    //  Fetch from user service if not cached
    const userServiceUrl = `${ServerConfig.USER_SERVICE_URL}/api/v1/users`;
    try {
      const response = await axios.get(userServiceUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data.data;
    } catch (err) {
      throw new AppError("User does not exist", StatusCodes.UNAUTHORIZED);
    }

    //  Check if user is verified
    if (!userData.isVerified) {
      throw new AppError("User is not verified", StatusCodes.FORBIDDEN);
    }

    //  Check roles if needed
    const allowedRoles = [USER, ADMIN, HOTEL_MANAGER, HOTEL_STAFF];
    if (!allowedRoles.includes(userData.role)) {
      throw new AppError(
        "You do not have permission to perform this action",
        StatusCodes.FORBIDDEN
      );
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: userData.role,
      email: userData.email,
    };

    next();
  } catch (error) {
    console.error(error);
    next(error);
  }
}

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - array of roles allowed to access the route
 */
function authorizeRoles(allowedRoles = []) {
  return (req, res, next) => {
    try {
      console.log(req.user);
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        throw new AppError(
          "You do not have permission to perform this action",
          StatusCodes.FORBIDDEN
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { checkAuth, authorizeRoles };
