const express = require("express");
const { BookingController } = require("../../controllers");
const { AuthMiddlewares } = require("../../middlewares");
const { Enums } = require("../../utils/commons");
const { USER } = Enums.ROLE_TYPE;
const router = express.Router();

router.use(AuthMiddlewares.checkAuth, AuthMiddlewares.authorizeRoles([USER]));

router.post("/", BookingController.createBooking);
router.post("/confirm/:idempotencyKey", BookingController.confirmBooking);

module.exports = router;
