const cron = require("node-cron");
const { BookingService } = require("../services");
const { Logger } = require("../config");

function bookingScheduler() {
  cron.schedule("*/5 * * * *", async () => {
    Logger.info("Running cancelOldBookings cron");
    try {
      const cancelledBookings = await BookingService.cancelOldBookings();

      Logger.info(`Cancelled ${cancelledBookings.length} old bookings`);
    } catch (error) {
      Logger.error(`Error in cancelOldBookings cron:${error.message}`);
    }
  });
}

module.exports = bookingScheduler;
