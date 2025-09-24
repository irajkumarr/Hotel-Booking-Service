const { StatusCodes } = require("http-status-codes");
const { BookingRepository } = require("../repositories");
const { AppError } = require("../utils");
const { ServerConfig, prisma } = require("../config");
const { redlock } = require("../config/redis-config");
const axios = require("axios");
const {
  generateIdempotencyKey,
} = require("../utils/helpers/generate-idempotency-key");

const bookingRepository = new BookingRepository();

async function createBooking(data) {
  const ttl = ServerConfig.LOCK_TTL;
  const bookingResource = `room:${data.roomId}:${data.checkInDate}`;

  try {
    //  Acquire distributed lock
    const lock = await redlock.acquire([bookingResource], ttl);

    // Check availability via hotel Service API
    const hotelServiceUrl = `${ServerConfig.HOTEL_SERVICE_URL}/api/v1/hotels/${data.hotelId}`;
    const hotelResponse = await axios.get(hotelServiceUrl);
    const hotelData = hotelResponse.data.data;

    if (!hotelData) {
      throw new AppError("Hotel not found", StatusCodes.NOT_FOUND);
    }
    // Check availability via hotel Service API
    const roomServiceUrl = `${ServerConfig.HOTEL_SERVICE_URL}/api/v1/rooms/${data.roomId}`;
    const roomResponse = await axios.get(roomServiceUrl);
    const roomData = roomResponse.data.data;

    if (!roomData) {
      throw new AppError("Room not found", StatusCodes.NOT_FOUND);
    }

    if (roomData.isBooked) {
      throw new AppError(
        "Room is not available for selected dates",
        StatusCodes.CONFLICT
      );
    }

    // Create booking in Booking Service
    const booking = await bookingRepository.createBooking({
      userId: data.userId,
      hotelId: data.hotelId,
      roomId: data.roomId,
      bookingAmount: roomData.price,
      totalGuests: data.totalGuests || 1,
      checkInDate: new Date(data.checkInDate),
      checkOutDate: new Date(data.checkOutDate),
    });

    // Generate and store idempotency key
    const idempotencyKey = generateIdempotencyKey();
    await bookingRepository.createIdempotencyKey(idempotencyKey, booking.id);

    // Release lock
    await lock.unlock();

    return { bookingId: booking.id, idempotencyKey };
  } catch (error) {
    // If error occurred, automatically the lock expires after TTL
    console.error(error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "Something went wrong while creating booking",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

async function confirmBooking(idempotencyKey) {
  return await prisma.$transaction(async (tx) => {
    const idempotencyKeyData =
      await bookingRepository.getIdempotencyKeyWithLock(tx, idempotencyKey);

    if (!idempotencyKeyData || !idempotencyKeyData.booking_id) {
      throw new AppError("Idempotency key not found", StatusCodes.NOT_FOUND);
    }

    if (idempotencyKeyData.finalized) {
      throw new AppError(
        "Idempotency key already finalized",
        StatusCodes.BAD_REQUEST
      );
    }

    const booking = await bookingRepository.confirmBooking(
      tx,
      idempotencyKeyData.booking_id
    );
    // Notify Room Service to mark dates as booked
    await axios.patch(
      `${ServerConfig.HOTEL_SERVICE_URL}/api/v1/rooms/${booking.roomId}`,
      {
        isBooked: true,
        bookingId: booking.id,
      }
    );

    await bookingRepository.finalizeIdempotencyKey(tx, idempotencyKey);

    return booking;
  });
}

module.exports = { createBooking, confirmBooking };
