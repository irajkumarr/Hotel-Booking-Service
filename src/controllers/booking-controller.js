const { BookingService } = require("../services");
const { asyncHandler } = require("../middlewares");
const { SuccessResponse } = require("../utils/commons");
const { StatusCodes } = require("http-status-codes");

const createBooking = asyncHandler(async (req, res) => {
  const { roomId, checkInDate, checkOutDate, totalGuests } = req.body;
  const userId = req.user.id;

  const booking = await BookingService.createBooking({
    roomId,
    checkInDate,
    checkOutDate,
    totalGuests,
    userId,
  });
  SuccessResponse.data = booking;

  return res.status(StatusCodes.CREATED).json(SuccessResponse);
});

const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await BookingService.confirmBooking(
    req.params.idempotencyKey,
   req.headers.authorization
  );
  SuccessResponse.data = booking;

  return res.status(StatusCodes.OK).json(SuccessResponse);
});

module.exports = {
  createBooking,
  confirmBooking,
};
