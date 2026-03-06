/**
 * functions/notificationService.js
 * ──────────────────────────────────────────────────────────────────
 * Notification and logging logic for the RETRET Hotel Cloud Functions.
 *
 * Exported functions:
 *   sendBookingConfirmation(booking) – logs confirmation (placeholder for email)
 *   logBooking(bookingId, bookingData) – structured Cloud Logging
 *
 * Used by functions/index.js.
 * ──────────────────────────────────────────────────────────────────
 */

const { logger } = require('firebase-functions');

/**
 * sendBookingConfirmation
 * Logs a booking confirmation summary.
 * Placeholder for a real email/SMS notification via SendGrid, Nodemailer, etc.
 *
 * HOW TO ADD EMAIL:
 *   1. Install a mail provider: npm install @sendgrid/mail
 *   2. Replace the logger.info call below with your provider's send call.
 *   3. Store the API key in Firebase environment config:
 *        firebase functions:config:set sendgrid.key="YOUR_KEY"
 *      Then access it as: functions.config().sendgrid.key
 *
 * @param {Object} booking – The Firestore booking document data
 * @param {string} booking.name
 * @param {string} booking.email
 * @param {string} booking.room
 * @param {string} booking.checkin
 * @param {string} booking.checkout
 * @param {number} booking.guests
 */
function sendBookingConfirmation(booking) {
  logger.info('📧 Booking confirmation would be sent here', {
    guestName:  booking.name     || 'N/A',
    guestEmail: booking.email    || 'N/A',
    room:       booking.room     || 'N/A',
    checkIn:    booking.checkin  || 'N/A',
    checkOut:   booking.checkout || 'N/A',
    guests:     booking.guests   || 0,
    // NOTE: Extend this function with your preferred email provider.
    // Example SendGrid snippet (requires @sendgrid/mail):
    //
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(functions.config().sendgrid.key);
    // await sgMail.send({
    //   to:      booking.email,
    //   from:    'noreply@retret.com',
    //   subject: `Booking Confirmed – ${booking.room}`,
    //   html:    `<p>Dear ${booking.name}, your stay from ${booking.checkin} to ${booking.checkout} is confirmed.</p>`
    // });
  });
}

/**
 * logBooking
 * Writes a structured log entry to Cloud Logging (visible in the Firebase
 * console under Functions → Logs).
 *
 * Deliberately excludes phone number from logs to minimise PII exposure.
 *
 * @param {string} bookingId   – Firestore document ID of the booking
 * @param {Object} bookingData – The booking document data
 */
function logBooking(bookingId, bookingData) {
  logger.info('🏨 New booking received', {
    bookingId,
    guestName:  bookingData.name     || 'N/A',
    guestEmail: bookingData.email    || 'N/A',
    room:       bookingData.room     || 'N/A',
    checkIn:    bookingData.checkin  || 'N/A',
    checkOut:   bookingData.checkout || 'N/A',
    guests:     bookingData.guests   || 0,
    status:     bookingData.status   || 'N/A',
    // phone is intentionally omitted to minimise PII in logs
  });
}

module.exports = { sendBookingConfirmation, logBooking };
