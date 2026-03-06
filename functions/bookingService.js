/**
 * functions/bookingService.js
 * ──────────────────────────────────────────────────────────────────
 * Booking-related backend logic for the RETRET Hotel Cloud Functions.
 *
 * Exported functions:
 *   createBooking(data)                        – validates and writes a
 *                                                booking doc to Firestore
 *   checkAvailability(roomId, checkin, checkout) – queries existing bookings
 *                                                for date overlap
 *
 * Used by functions/index.js.
 * ──────────────────────────────────────────────────────────────────
 */

const admin = require('firebase-admin');

/* ── Validation Helpers ──────────────────────────────────────────── */

/**
 * isISODate
 * Returns true if the string matches YYYY-MM-DD format.
 * @param {string} str
 * @returns {boolean}
 */
function isISODate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

/**
 * validateBookingData
 * Checks that all required fields are present and have valid types/formats.
 * Returns an array of error messages (empty if valid).
 *
 * @param {Object} data – Raw booking payload
 * @returns {string[]}  – Validation error messages
 */
function validateBookingData(data) {
  const errors = [];

  // ── Required string fields ──
  const requiredStrings = ['name', 'email', 'phone', 'room', 'checkin', 'checkout'];
  requiredStrings.forEach(field => {
    if (!data[field] || typeof data[field] !== 'string' || !data[field].trim()) {
      errors.push(`Field '${field}' is required and must be a non-empty string.`);
    }
  });

  // ── Email format ──
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Field 'email' must be a valid email address.");
  }

  // ── Date formats ──
  if (data.checkin && !isISODate(data.checkin)) {
    errors.push("Field 'checkin' must be in YYYY-MM-DD format.");
  }
  if (data.checkout && !isISODate(data.checkout)) {
    errors.push("Field 'checkout' must be in YYYY-MM-DD format.");
  }

  // ── checkout must be after checkin ──
  if (data.checkin && data.checkout && isISODate(data.checkin) && isISODate(data.checkout)) {
    if (data.checkout <= data.checkin) {
      errors.push("Field 'checkout' must be after 'checkin'.");
    }
  }

  // ── Guests: must be an integer between 1 and 10 ──
  const guests = data.guests;
  if (guests === undefined || guests === null) {
    errors.push("Field 'guests' is required.");
  } else if (!Number.isInteger(guests) || guests < 1 || guests > 10) {
    errors.push("Field 'guests' must be an integer between 1 and 10.");
  }

  return errors;
}

/* ── Public API ──────────────────────────────────────────────────── */

/**
 * createBooking
 * Validates the booking payload and writes a new document to the
 * Firestore "bookings" collection.
 *
 * @param {Object} data – Booking payload (name, email, phone, room, checkin, checkout, guests)
 * @returns {Promise<{ success: boolean, bookingId?: string, errors?: string[] }>}
 */
async function createBooking(data) {
  // Validate input
  const errors = validateBookingData(data);
  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Write to Firestore with a server-generated creation timestamp
  const docRef = await admin.firestore().collection('bookings').add({
    name:      data.name.trim(),
    email:     data.email.trim().toLowerCase(),
    phone:     data.phone.trim(),
    room:      data.room.trim(),
    checkin:   data.checkin,
    checkout:  data.checkout,
    guests:    data.guests,
    status:    'pending',                                    // Initial status
    createdAt: admin.firestore.FieldValue.serverTimestamp(), // Server-side timestamp
  });

  return { success: true, bookingId: docRef.id };
}

/**
 * checkAvailability
 * Queries the "bookings" collection to see if any confirmed/pending bookings
 * for the given room overlap the requested date range.
 *
 * Overlap condition (A=existing, B=requested):
 *   A.checkin < B.checkout  AND  A.checkout > B.checkin
 *
 * @param {string} roomId   – Room identifier (value stored in the 'room' field)
 * @param {string} checkin  – Requested check-in date  (YYYY-MM-DD)
 * @param {string} checkout – Requested check-out date (YYYY-MM-DD)
 * @returns {Promise<{ available: boolean, conflicts: number }>}
 */
async function checkAvailability(roomId, checkin, checkout) {
  // Validate date parameters
  if (!roomId || !isISODate(checkin) || !isISODate(checkout) || checkout <= checkin) {
    throw new Error('checkAvailability: invalid parameters.');
  }

  // Query bookings that are for this room and overlap the requested range.
  // Firestore does not support two inequality filters on different fields,
  // so we filter checkin < checkout client-side after fetching bookings
  // where the room matches and the existing checkin is before our checkout.
  const snapshot = await admin.firestore()
    .collection('bookings')
    .where('room', '==', roomId)
    .where('checkin', '<', checkout)  // Existing check-in before our check-out
    .get();

  // Filter out bookings whose checkout is on or before our checkin (no overlap)
  const conflicts = snapshot.docs.filter(doc => {
    const existingCheckout = doc.data().checkout;
    return existingCheckout > checkin; // Existing check-out after our check-in
  }).length;

  return { available: conflicts === 0, conflicts };
}

module.exports = { createBooking, checkAvailability };
