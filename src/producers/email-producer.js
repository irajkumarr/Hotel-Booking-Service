const { mailerQueue } = require("../queues/mailer-queue");

const BOOKING_EMAIL_JOB = "send:booking-email";

/**
 * Adds a booking email job to the queue.
 * @param {Object} payload The data required to send the email.
 */
const addBookingEmailJob = async (payload) => {
  await mailerQueue.add(BOOKING_EMAIL_JOB, payload);
};

module.exports = {
  addBookingEmailJob,
  BOOKING_EMAIL_JOB,
};
