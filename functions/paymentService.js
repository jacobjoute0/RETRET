/**
 * functions/paymentService.js
 * ──────────────────────────────────────────────────────────────────
 * Payment processing logic for the RETRET Hotel Cloud Functions.
 *
 * This module provides a structure for integrating a real payment
 * processor (e.g. Stripe).  The current implementation validates the
 * payment request and returns a structured response.
 *
 * HOW TO ADD REAL STRIPE PAYMENTS:
 *   1. Install the Stripe SDK:
 *        cd functions && npm install stripe
 *   2. Set your Stripe secret key as a Firebase Function config value:
 *        firebase functions:config:set stripe.secret_key="sk_live_..."
 *   3. Uncomment the Stripe sections below and remove the placeholder code.
 *   4. Deploy:  firebase deploy --only functions
 *
 * HOW TO ADD PAYPAL:
 *   1. Install PayPal SDK:
 *        cd functions && npm install @paypal/checkout-server-sdk
 *   2. Set PayPal credentials:
 *        firebase functions:config:set paypal.client_id="..." paypal.client_secret="..."
 *   3. Follow the PayPal Orders API integration guide.
 *
 * Exported functions:
 *   handlePayment(bookingId, amount, paymentMethodId) – process a payment
 *   validatePaymentData(data)                         – validate request payload
 *
 * Used by functions/index.js.
 * ──────────────────────────────────────────────────────────────────
 */

const admin    = require('firebase-admin');
const { logger } = require('firebase-functions');

/* ── Uncomment when using Stripe ─────────────────────────────────
const functions = require('firebase-functions');
const stripe    = require('stripe')(functions.config().stripe.secret_key);
────────────────────────────────────────────────────────────────── */

/* ── Validation ──────────────────────────────────────────────────

/**
 * validatePaymentData
 * Checks that all required payment fields are present and valid.
 * Returns an array of error messages (empty if valid).
 *
 * @param {Object} data – Payment payload
 * @returns {string[]}  – Validation errors
 */
function validatePaymentData(data) {
  const errors = [];

  // Required string fields
  if (!data.bookingId || typeof data.bookingId !== 'string' || !data.bookingId.trim()) {
    errors.push("Field 'bookingId' is required and must be a non-empty string.");
  }

  // Amount must be a positive number
  if (data.amount === undefined || data.amount === null) {
    errors.push("Field 'amount' is required.");
  } else if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount <= 0) {
    errors.push("Field 'amount' must be a positive number.");
  }

  // Currency code (optional, defaults to USD)
  if (data.currency && typeof data.currency !== 'string') {
    errors.push("Field 'currency' must be a string (e.g. 'usd').");
  }

  // Payment method token (required for Stripe card payments)
  if (!data.paymentMethodId || typeof data.paymentMethodId !== 'string') {
    errors.push("Field 'paymentMethodId' is required (Stripe payment method ID).");
  }

  return errors;
}

/* ── Payment Handler ─────────────────────────────────────────────

/**
 * handlePayment
 * Processes a payment for a booking and records the result in Firestore.
 *
 * Flow:
 *   1. Validate input data
 *   2. Confirm the booking exists in Firestore
 *   3. Create a Stripe PaymentIntent (or simulate in demo mode)
 *   4. Record the payment outcome in the "payments" collection
 *   5. Update the booking status to "confirmed" if payment succeeded
 *   6. Return a structured result object
 *
 * @param {Object}  data
 * @param {string}  data.bookingId       – Firestore document ID of the booking
 * @param {number}  data.amount          – Amount in USD (e.g. 299.00)
 * @param {string}  data.paymentMethodId – Stripe PaymentMethod ID (from frontend)
 * @param {string}  [data.currency='usd']– ISO currency code
 *
 * @returns {Promise<{ success: boolean, paymentId?: string, error?: string }>}
 */
async function handlePayment(data) {
  // 1. Validate input
  const errors = validatePaymentData(data);
  if (errors.length > 0) {
    return { success: false, error: errors.join(' ') };
  }

  const { bookingId, amount, paymentMethodId, currency = 'usd' } = data;

  // 2. Verify the booking exists
  const bookingRef = admin.firestore().collection('bookings').doc(bookingId);
  const bookingDoc = await bookingRef.get();

  if (!bookingDoc.exists) {
    return { success: false, error: `Booking '${bookingId}' not found.` };
  }

  if (bookingDoc.data().status === 'cancelled') {
    return { success: false, error: 'This booking has been cancelled and cannot be charged.' };
  }

  /* ── 3. Stripe PaymentIntent (uncomment for live payments) ──────
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount:           Math.round(amount * 100), // Stripe uses smallest currency unit (cents)
      currency,
      payment_method:   paymentMethodId,
      confirm:          true,
      return_url:       'https://your-hotel-domain.com/booking-confirmed',
      metadata:         { bookingId },
      description:      `RETRET Hotel – Booking ${bookingId}`,
    });
  } catch (stripeError) {
    logger.error('Stripe PaymentIntent creation failed', { bookingId, error: stripeError.message });
    return { success: false, error: stripeError.message };
  }

  const transactionId = paymentIntent.id;
  const paymentStatus = paymentIntent.status === 'succeeded' ? 'paid' : 'failed';
  ────────────────────────────────────────────────────────────────── */

  // ── Demo / placeholder implementation ──
  // Remove this block and uncomment the Stripe section above for production.
  const transactionId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const paymentStatus = 'paid'; // Simulate successful payment in demo mode
  logger.info('💳 Payment processed (demo mode)', { bookingId, amount, currency, transactionId });

  // 4. Record the payment in the "payments" collection
  const paymentRef = await admin.firestore().collection('payments').add({
    bookingId,
    amount,
    currency,
    status:        paymentStatus,
    transactionId,
    paymentMethod: paymentMethodId,
    createdAt:     admin.firestore.FieldValue.serverTimestamp(),
  });

  // 5. Update booking status to "confirmed" on successful payment
  if (paymentStatus === 'paid') {
    await bookingRef.update({
      status:      'confirmed',
      paymentId:   paymentRef.id,
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // 6. Return result
  return { success: paymentStatus === 'paid', paymentId: paymentRef.id, transactionId };
}

module.exports = { handlePayment, validatePaymentData };
