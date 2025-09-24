const { StatusCodes } = require("http-status-codes");
const { BookingRepository } = require("../repositories");
const { AppError } = require("../utils");
const { ServerConfig } = require("../config");
const  {redlock} = require("../config/redis-config");
const {
  generateIdempotencyKey,
} = require("../utils/helpers/generate-idempotency-key");

const bookingRepository = new BookingRepository();

async function createBooking(data) {
  const ttl = ServerConfig.LOCK_TTL;
  const bookingResource = `hotel:${data.hotelId}`;
  try {
    await redlock.acquire([bookingResource], ttl);
    const booking = await bookingRepository.createBooking({
      userId: data.userId,
      hotelId: data.hotelId,
      roomId: data.roomId,
      bookingAmount: data.bookingAmount,
      totalGuests: data.totalGuests,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
    });

    const idempotencyKey = generateIdempotencyKey();
    await bookingRepository.createIdempotencyKey(idempotencyKey, booking.id);
    return {
      bookingId: booking.id,
      idempotencyKey: idempotencyKey,
    };
  } catch (error) {
    throw new AppError(
      "Something went wrong while creating booking",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

module.exports = {
  createBooking,
};
