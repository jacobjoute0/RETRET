/**
 * functions/index.js
 * ──────────────────────────────────────────────────────────────────
 * Firebase Cloud Functions for the RETRET Hotel website.
 *
 * This module defines server-side logic that runs in Google Cloud
 * in response to Firestore events and HTTPS calls.
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

// ── Service modules ──
const { createBooking, checkAvailability } = require('./bookingService');
const { sendBookingConfirmation, logBooking } = require('./notificationService');

/**
 * onNewBooking
 * ──────────────────────────────────────────────────────────────────
 * Triggered whenever a new document is created in the "bookings"
 * Firestore collection.
 *
 * Delegates to:
 *   notificationService.logBooking()             – structured log entry
 *   notificationService.sendBookingConfirmation() – confirmation (placeholder)
 *
 * Firestore path: bookings/{bookingId}
 * ──────────────────────────────────────────────────────────────────
 */
exports.onNewBooking = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate((snapshot, context) => {
    const booking   = snapshot.data();
    const bookingId = context.params.bookingId;

    try {
      // Log the booking details to Cloud Logging
      logBooking(bookingId, booking);

      // Send (or mock) a confirmation notification to the guest
      sendBookingConfirmation(booking);
    } catch (err) {
      functions.logger.error('onNewBooking: handler error', { bookingId, error: err.message });
    }

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
      senderName: message.name    || 'N/A',
      subject:    message.subject || 'N/A',
      // Full message body is not logged to avoid capturing sensitive content
    });

    return null;
  });

/**
 * checkRoomAvailability
 * ──────────────────────────────────────────────────────────────────
 * HTTPS Callable function that checks whether a room is available for
 * a given date range. Called directly from the frontend using the
 * Firebase callable SDK.
 *
 * Request payload:
 *   { roomId: string, checkin: string (YYYY-MM-DD), checkout: string (YYYY-MM-DD) }
 *
 * Response:
 *   { available: boolean, conflicts: number }
 * ──────────────────────────────────────────────────────────────────
 */
exports.checkRoomAvailability = functions.https.onCall(async (data, context) => {
  const { roomId, checkin, checkout } = data || {};

  // Validate required parameters
  if (!roomId || !checkin || !checkout) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Request must include roomId, checkin, and checkout fields.'
    );
  }

  try {
    const result = await checkAvailability(roomId, checkin, checkout);
    return result;
  } catch (err) {
    functions.logger.error('checkRoomAvailability error', { roomId, checkin, checkout, error: err.message });
    throw new functions.https.HttpsError('internal', err.message);
  }
});

