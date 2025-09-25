const { StatusCodes } = require("http-status-codes");
const { BookingRepository } = require("../repositories");
const { AppError } = require("../utils");
const { ServerConfig, prisma, Logger } = require("../config");
const { redlock } = require("../config/redis-config");
const axios = require("axios");
const { NotificationDto } = require("../dto/notification-dto");
const { addBookingEmailJob } = require("../producers/email-producer");
const {
  generateIdempotencyKey,
} = require("../utils/helpers/generate-idempotency-key");

const bookingRepository = new BookingRepository();

async function createBooking(data) {
  const ttl = ServerConfig.LOCK_TTL;
  const bookingResource = `room:${data.roomId}:${data.checkInDate}`;

  // Check availability date
  const checkInDate = new Date(data.checkInDate);
  checkInDate.setUTCHours(0, 0, 0, 0);

  const checkOutDate = new Date(data.checkOutDate);
  checkOutDate.setUTCHours(0, 0, 0, 0);

  const todayDate = new Date();
  todayDate.setUTCHours(0, 0, 0, 0);

  if (checkInDate < todayDate) {
    throw new AppError(
      "Check in date must be today date or in the future",
      StatusCodes.BAD_REQUEST
    );
  }
  try {
    //  Acquire distributed lock for multiple concurrent booking
    const lock = await redlock.acquire([bookingResource], ttl);

    // Check availability via hotel Service API
    const roomServiceUrl = `${ServerConfig.HOTEL_SERVICE_URL}/api/v1/rooms/${data.roomId}`;
    let roomData;
    try {
      const roomResponse = await axios.get(roomServiceUrl);
      roomData = roomResponse.data.data;
      if (!roomData) {
        throw new AppError(
          "Room not found in the database",
          StatusCodes.NOT_FOUND
        );
      }

      if (roomData.isBooked) {
        throw new AppError(
          "Room is not available for selected dates",
          StatusCodes.CONFLICT
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error.response) {
        if (error.response.status === StatusCodes.NOT_FOUND) {
          throw new AppError(
            "Room not found or already booked",
            StatusCodes.NOT_FOUND
          );
        }
        throw new AppError(
          error.response.data?.message || "Hotel service error",
          error.response.status
        );
      } else if (error.request) {
        throw new AppError(
          "No response from Hotel service",
          StatusCodes.SERVICE_UNAVAILABLE
        );
      } else {
        throw new AppError(
          "Unexpected error while calling Hotel service",
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }
    }

    // Create booking in Booking Service
    const booking = await bookingRepository.createBooking({
      userId: data.userId,
      hotelId: roomData.hotelId,
      roomId: roomData.id,
      bookingAmount: roomData.price,
      totalGuests: data.totalGuests || 1,
      checkInDate: new Date(data.checkInDate),
      checkOutDate: new Date(data.checkOutDate),
    });
    // Update room as booked in Hotel Service
    await axios.patch(
      `${ServerConfig.HOTEL_SERVICE_URL}/api/v1/rooms/${booking.roomId}/book`,
      {
        isBooked: true,
        bookingId: booking.id,
      }
    );

    // Generate and store idempotency key
    const idempotencyKey = generateIdempotencyKey();
    await bookingRepository.createIdempotencyKey(idempotencyKey, booking.id);

    // Release lock
    await lock.unlock();

    return {
      bookingId: booking.id,
      idempotencyKey,
      status: booking.status,
      checkInDate: booking.checkInDate,
      roomId: booking.roomId,
    };
  } catch (error) {
    // If error occurred, automatically the lock expires after TTL
    // console.error(error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "Something went wrong while creating booking",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

async function confirmBooking(idempotencyKey, authHeader) {
  const token = authHeader.split(" ")[1];
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

    //  Confirm booking in Booking Service
    const booking = await bookingRepository.confirmBooking(
      tx,
      idempotencyKeyData.booking_id
    );
    //  Fetch user details from User Service
    let userData = null;
    try {
      const userServiceUrl = `${ServerConfig.USER_SERVICE_URL}/api/v1/users`;
      const userResponse = await axios.get(userServiceUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = userResponse.data.data;
    } catch (error) {
      console.log(error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Failed to fetch user details from User Service",
        StatusCodes.SERVICE_UNAVAILABLE
      );
    }

    //  Fetch room details with category + hotel
    let roomData = null;
    try {
      const roomResponse = await axios.get(
        `${ServerConfig.HOTEL_SERVICE_URL}/api/v1/rooms/${booking.roomId}`
      );
      roomData = roomResponse.data.data;
    } catch (error) {
      throw new AppError(
        "Failed to fetch room details from Hotel Service",
        StatusCodes.SERVICE_UNAVAILABLE
      );
    }
    //  Send email to user
    const notificationPayload = NotificationDto({
      to: userData.email, // user's email from User Service
      subject: "Your Booking is Confirmed!",
      templateId: "booking-email", // an identifier for the email template
      params: {
        name: userData.firstName, // User's first name
        bookingId: booking.id, // Booking ID
        hotelName: roomData.hotel.name, // Hotel name
        hotelAddress: roomData.hotel.address, // Hotel address
        roomType: roomData.roomCategory.roomType, // Room type (SINGLE, DOUBLE, etc.)
        price: booking.bookingAmount, // Booking amount
        checkInDate: booking.checkInDate.toDateString(), // format as needed
        checkOutDate: booking.checkOutDate.toDateString(),
        totalGuests: booking.totalGuests,
      },
    });
    await addBookingEmailJob(notificationPayload);

    //  Finalize idempotency
    await bookingRepository.finalizeIdempotencyKey(tx, idempotencyKey);

    //  Return enriched booking object
    return {
      booking,
      room: roomData,
    };
  });
}

async function cancelOldBookings() {
  try {
    const time = new Date(Date.now() - 1000 * 60 * 5); // 5 mins ago

    const oldBookings = await prisma.$transaction(async (tx) => {
      return bookingRepository.cancelOldBookings(tx, time);
    });

    // After DB update, free rooms in Hotel Service
    for (const booking of oldBookings) {
      try {
        await axios.patch(
          `${ServerConfig.HOTEL_SERVICE_URL}/api/v1/rooms/${booking.roomId}/book`,
          { isBooked: false, bookingId: null }
        );
      } catch (err) {
        Logger.error(
          `⚠️ Failed to free room ${booking.roomId} for booking ${booking.id}:${err.message}`
        );
      }
    }

    return oldBookings;
  } catch (error) {
    Logger.error("Error canceling old bookings: error.message");
    throw new AppError(
      `Error canceling old bookings:${error.message}`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

module.exports = {
  createBooking,
  confirmBooking,
  cancelOldBookings,
};
