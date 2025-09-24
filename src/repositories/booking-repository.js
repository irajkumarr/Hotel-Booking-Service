const { prisma } = require("../config");
const CrudRepository = require("./crud-repository");

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
}

module.exports = BookingRepository;
