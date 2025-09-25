const { BookingService } = require("../services");
const { asyncHandler } = require("../middlewares");
const { SuccessResponse } = require("../utils/commons");
const { StatusCodes } = require("http-status-codes");

const createBooking = asyncHandler(async (req, res) => {
  const booking = await BookingService.createBooking(req.body);
  SuccessResponse.data = booking;

  return res.status(StatusCodes.CREATED).json(SuccessResponse);
});

const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await BookingService.confirmBooking(
    req.params.idempotencyKey
  );
  SuccessResponse.data = booking;

  return res.status(StatusCodes.OK).json(SuccessResponse);
});

module.exports = {
  createBooking,
  confirmBooking,
};
