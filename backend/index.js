/**
 * backend/index.js
 * ──────────────────────────────────────────────────────────────────
 * Firebase Cloud Functions for the RETRET Hotel website.
 *
 * This module defines server-side logic that runs in Google Cloud
 * in response to Firestore events and HTTPS calls.
 *
 * DEPLOY:
 *   cd backend && npm install
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
const { handlePayment, validatePaymentData }  = require('./paymentService');

/**
 * onNewBooking
 * ──────────────────────────────────────────────────────────────────
 * Triggered whenever a new document is created in the "bookings"
 * Firestore collection.
 *
 * Delegates to:
 *   notificationService.logBooking()             – structured log entry
 *   notificationService.sendBookingConfirmation() – confirmation email
 *
 * Firestore path: bookings/{bookingId}
 * ──────────────────────────────────────────────────────────────────
 */
exports.onNewBooking = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate((snapshot, context) => {
    const booking   = snapshot.data();
    const bookingId = context.params.bookingId;

    // sendBookingConfirmation is async – return the promise so the
    // function waits for it before exiting.
    return sendBookingConfirmation(booking, bookingId).catch(err => {
      functions.logger.error('onNewBooking: handler error', { bookingId, error: err.message });
    });
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

/**
 * createBookingHttp
 * ──────────────────────────────────────────────────────────────────
 * HTTPS Callable function that creates a new booking via the backend.
 * The frontend calls this to create a booking through the Cloud Function
 * rather than writing directly to Firestore (enables server-side
 * validation and availability checking before write).
 *
 * Request payload:
 *   { name, email, phone, room, checkin, checkout, guests }
 *
 * Response:
 *   { success: boolean, bookingId?: string, errors?: string[] }
 * ──────────────────────────────────────────────────────────────────
 */
exports.createBookingHttp = functions.https.onCall(async (data, context) => {
  if (!data) {
    throw new functions.https.HttpsError('invalid-argument', 'Request body is required.');
  }

  try {
    const result = await createBooking(data);

    if (!result.success) {
      throw new functions.https.HttpsError('invalid-argument', result.errors.join(' '));
    }

    return result;
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    functions.logger.error('createBookingHttp error', { error: err.message });
    throw new functions.https.HttpsError('internal', err.message);
  }
});

/**
 * processPayment
 * ──────────────────────────────────────────────────────────────────
 * HTTPS Callable function that processes a payment for an existing booking.
 * On success, updates the booking status to "confirmed" and records the
 * payment details in the "payments" collection.
 *
 * Request payload:
 *   { bookingId: string, amount: number, paymentMethodId: string, currency?: string }
 *
 * Response:
 *   { success: boolean, paymentId?: string, transactionId?: string }
 * ──────────────────────────────────────────────────────────────────
 */
exports.processPayment = functions.https.onCall(async (data, context) => {
  if (!data) {
    throw new functions.https.HttpsError('invalid-argument', 'Request body is required.');
  }

  // Validate before hitting the payment gateway
  const errors = validatePaymentData(data);
  if (errors.length > 0) {
    throw new functions.https.HttpsError('invalid-argument', errors.join(' '));
  }

  try {
    const result = await handlePayment(data);

    if (!result.success) {
      throw new functions.https.HttpsError('internal', result.error || 'Payment failed.');
    }

    return result;
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    functions.logger.error('processPayment error', { bookingId: data.bookingId, error: err.message });
    throw new functions.https.HttpsError('internal', err.message);
  }
});

/**
 * sendBookingConfirmationHttp
 * ──────────────────────────────────────────────────────────────────
 * HTTPS Callable function that (re-)sends a booking confirmation email.
 * Useful for resending confirmations when the automatic trigger fails.
 *
 * Request payload:
 *   { bookingId: string }
 *
 * Response:
 *   { success: boolean }
 * ──────────────────────────────────────────────────────────────────
 */
exports.sendBookingConfirmationHttp = functions.https.onCall(async (data, context) => {
  const { bookingId } = data || {};

  if (!bookingId || typeof bookingId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', "'bookingId' is required.");
  }

  try {
    const doc = await admin.firestore().collection('bookings').doc(bookingId).get();

    if (!doc.exists) {
      throw new functions.https.HttpsError('not-found', `Booking '${bookingId}' not found.`);
    }

    await sendBookingConfirmation(doc.data(), bookingId);
    return { success: true };

  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    functions.logger.error('sendBookingConfirmationHttp error', { bookingId, error: err.message });
    throw new functions.https.HttpsError('internal', err.message);
  }
});

