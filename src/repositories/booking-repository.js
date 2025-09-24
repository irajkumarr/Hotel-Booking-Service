const { StatusCodes } = require("http-status-codes");
const { prisma } = require("../config");
const { AppError } = require("../utils");
const CrudRepository = require("./crud-repository");
const { validate } = require("uuid");

class BookingRepository extends CrudRepository {
  constructor() {
    super(prisma.booking);
  }

  async createBooking(data) {
    const booking = await prisma.booking.create({ data });
    return booking;
  }

  async createIdempotencyKey(key, bookingId) {
    const idempotencyKey = await prisma.idempotencyKey.create({
      data: {
        idemKey: key,
        booking: {
          connect: {
            id: +bookingId,
          },
        },
      },
    });
    return idempotencyKey;
  }

  async getIdempotencyKeyWithLock(tx, key) {
    if (!validate(key)) {
      throw new AppError(
        "Invalid idempotency key format",
        StatusCodes.BAD_REQUEST
      );
    }

    const [idempotencyKey] = await tx.$queryRaw`
      SELECT * FROM idempotency_keys
      WHERE idempotency_keys.idem_key = ${key}
      FOR UPDATE
    `;

    if (!idempotencyKey) {
      throw new AppError("Idempotency key not found", StatusCodes.NOT_FOUND);
    }

    return idempotencyKey;
  }

  async getBookingById(bookingId) {
    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
    });

    return booking;
  }

  async confirmBooking(tx, bookingId) {
    const booking = await tx.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: "CONFIRMED",
      },
    });
    return booking;
  }

  async cancelBooking(bookingId) {
    const booking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: "CANCELLED",
      },
    });
    return booking;
  }

  async finalizeIdempotencyKey(tx, key) {
    const idempotencyKey = await tx.idempotencyKey.update({
      where: {
        idemKey: key,
      },
      data: {
        finalized: true,
      },
    });

    return idempotencyKey;
  }
}

module.exports = BookingRepository;
