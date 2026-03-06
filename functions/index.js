/**
 * functions/index.js
 * ──────────────────────────────────────────────────────────────────
 * Firebase Cloud Functions for the RETRET Hotel website.
 *
 * This module defines server-side logic that runs in Google Cloud
 * in response to Firestore events.
 *
 * DEPLOY:
 *   cd functions && npm install
 *   firebase deploy --only functions
 * ──────────────────────────────────────────────────────────────────
 */

// ── Firebase Admin & Functions SDKs ──
const functions = require('firebase-functions');
const admin     = require('firebase-admin');

// Initialize the Admin SDK (uses application default credentials in Cloud)
admin.initializeApp();

/**
 * onNewBooking
 * ──────────────────────────────────────────────────────────────────
 * Triggered whenever a new document is created in the "bookings"
 * Firestore collection.
 *
 * What it does:
 *   1. Extracts the booking details from the new document snapshot
 *   2. Logs a structured summary to Cloud Logging (visible in Firebase console)
 *   3. Can be extended to send confirmation emails, SMS, etc.
 *
 * Firestore path: bookings/{bookingId}
 * ──────────────────────────────────────────────────────────────────
 */
exports.onNewBooking = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate((snapshot, context) => {
    // snapshot.data() returns the newly created document's field values
    const booking   = snapshot.data();
    const bookingId = context.params.bookingId;

    // ── Log the booking details ──
    // These logs appear in Firebase console > Functions > Logs
    functions.logger.info('🏨 New booking received', {
      bookingId,
      guestName:  booking.name     || 'N/A',
      guestEmail: booking.email    || 'N/A',
      room:       booking.room     || 'N/A',
      checkIn:    booking.checkin  || 'N/A',
      checkOut:   booking.checkout || 'N/A',
      guests:     booking.guests   || 0,
      // Do NOT log phone – minimise PII in logs
    });

    // ── Optional: Send confirmation email ──
    // Uncomment and configure a mail provider (e.g., SendGrid, Nodemailer)
    // when ready to send automated emails.
    //
    // const mailOptions = {
    //   from:    '"RETRET Hotel" <noreply@retret.com>',
    //   to:      booking.email,
    //   subject: `Booking Confirmation – ${booking.room}`,
    //   html: `
    //     <h2>Thank you for booking with RETRET Hotel!</h2>
    //     <p>Dear ${booking.name},</p>
    //     <p>Your reservation for <strong>${booking.room}</strong> is confirmed.</p>
    //     <ul>
    //       <li>Check-in: ${booking.checkin}</li>
    //       <li>Check-out: ${booking.checkout}</li>
    //       <li>Guests: ${booking.guests}</li>
    //     </ul>
    //     <p>We look forward to welcoming you!</p>
    //   `
    // };
    // return transporter.sendMail(mailOptions);

    // Return null to indicate the function completed successfully
    return null;
  });

/**
 * onNewMessage
 * ──────────────────────────────────────────────────────────────────
 * Triggered whenever a new document is created in the "messages"
 * Firestore collection (from the Contact page form).
 *
 * Firestore path: messages/{messageId}
 * ──────────────────────────────────────────────────────────────────
 */
exports.onNewMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate((snapshot, context) => {
    const message   = snapshot.data();
    const messageId = context.params.messageId;

    functions.logger.info('📧 New contact message received', {
      messageId,
      senderName:    message.name    || 'N/A',
      subject:       message.subject || 'N/A',
      // Do not log full message body – could contain sensitive content
    });

    return null;
  });
