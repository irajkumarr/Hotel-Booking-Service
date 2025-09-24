const express = require("express");
const { BookingController } = require("../../controllers");

const router = express.Router();

router.post("/", BookingController.createBooking);
router.post("/confirm/:idempotencyKey", BookingController.confirmBooking);

module.exports = router;
