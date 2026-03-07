/**
 * booking.js
 * ─────────────────────────────────────────────────────────────────
 * Handles the hotel booking form on booking.html:
 *   - Reads and validates all form fields
 *   - Writes a new document to the Firestore "bookings" collection
 *   - Shows loading state during submission
 *   - Displays a success or error message on the page
 *   - Clears the form after successful submission
 * ─────────────────────────────────────────────────────────────────
 */

/* ─────────────────────────────────────────────────────────────────
   Validation Helpers
   ───────────────────────────────────────────────────────────────── */

/**
 * isValidEmail
 * Returns true if the string matches a basic email pattern.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * isValidPhone
 * Returns true if the string contains 7–15 digits (allows spaces/dashes).
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  return /^[\d\s\-\+\(\)]{7,20}$/.test(phone.trim());
}

/**
 * showFieldError
 * Marks a form field as invalid and shows its error message.
 * @param {HTMLElement} field   - The <input>/<select> element
 * @param {HTMLElement} errEl   - The <span class="field-error"> element
 * @param {string}      message - Error text to display
 */
function showFieldError(field, errEl, message) {
  field.classList.add('error');
  errEl.textContent = message;
  errEl.classList.add('visible');
}

/**
 * clearFieldError
 * Removes the error state from a field.
 * @param {HTMLElement} field
 * @param {HTMLElement} errEl
 */
function clearFieldError(field, errEl) {
  field.classList.remove('error');
  errEl.classList.remove('visible');
}

/* ─────────────────────────────────────────────────────────────────
   Form Validation
   ───────────────────────────────────────────────────────────────── */

/**
 * validateBookingForm
 * Validates all booking form fields.
 * Returns true if the form is valid; false otherwise.
 * Also sets visual error states on invalid fields.
 *
 * @param {Object} fields  - Map of field name → { el, errEl }
 * @returns {boolean}
 */
function validateBookingForm(fields) {
  let isValid = true;

  // Clear previous errors
  Object.values(fields).forEach(({ el, errEl }) => clearFieldError(el, errEl));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Name ──
  if (!fields.name.el.value.trim()) {
    showFieldError(fields.name.el, fields.name.errEl, 'Full name is required.');
    isValid = false;
  }

  // ── Email ──
  if (!fields.email.el.value.trim()) {
    showFieldError(fields.email.el, fields.email.errEl, 'Email address is required.');
    isValid = false;
  } else if (!isValidEmail(fields.email.el.value)) {
    showFieldError(fields.email.el, fields.email.errEl, 'Please enter a valid email address.');
    isValid = false;
  }

  // ── Phone ──
  if (!fields.phone.el.value.trim()) {
    showFieldError(fields.phone.el, fields.phone.errEl, 'Phone number is required.');
    isValid = false;
  } else if (!isValidPhone(fields.phone.el.value)) {
    showFieldError(fields.phone.el, fields.phone.errEl, 'Please enter a valid phone number.');
    isValid = false;
  }

  // ── Room Type ──
  if (!fields.room.el.value) {
    showFieldError(fields.room.el, fields.room.errEl, 'Please select a room type.');
    isValid = false;
  }

  // ── Check-in Date ──
  const checkinDate = fields.checkin.el.value
    ? new Date(fields.checkin.el.value)
    : null;

  if (!fields.checkin.el.value) {
    showFieldError(fields.checkin.el, fields.checkin.errEl, 'Check-in date is required.');
    isValid = false;
  } else if (checkinDate < today) {
    showFieldError(fields.checkin.el, fields.checkin.errEl, 'Check-in date cannot be in the past.');
    isValid = false;
  }

  // ── Check-out Date ──
  const checkoutDate = fields.checkout.el.value
    ? new Date(fields.checkout.el.value)
    : null;

  if (!fields.checkout.el.value) {
    showFieldError(fields.checkout.el, fields.checkout.errEl, 'Check-out date is required.');
    isValid = false;
  } else if (checkinDate && checkoutDate && checkoutDate <= checkinDate) {
    showFieldError(fields.checkout.el, fields.checkout.errEl, 'Check-out must be after check-in.');
    isValid = false;
  }

  // ── Number of Guests ──
  const guests = parseInt(fields.guests.el.value, 10);
  if (!fields.guests.el.value || isNaN(guests) || guests < 1) {
    showFieldError(fields.guests.el, fields.guests.errEl, 'Please enter at least 1 guest.');
    isValid = false;
  } else if (guests > 10) {
    showFieldError(fields.guests.el, fields.guests.errEl, 'Maximum 10 guests per booking. Contact us for groups.');
    isValid = false;
  }

  return isValid;
}

/* ─────────────────────────────────────────────────────────────────
   UI State Helpers
   ───────────────────────────────────────────────────────────────── */

/**
 * setSubmitLoading
 * Toggles the submit button between its normal state and a loading state.
 * @param {HTMLButtonElement} btn
 * @param {HTMLElement}       spinner
 * @param {boolean}           loading
 */
function setSubmitLoading(btn, spinner, loading) {
  if (loading) {
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Submitting…';
    spinner.classList.add('visible');
  } else {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Confirm Booking';
    spinner.classList.remove('visible');
  }
}

/**
 * showAlert
 * Shows the page-level success or error alert box.
 * Hides the alert after a timeout (default 8 s) if it's a success message.
 *
 * @param {HTMLElement} alertEl    - The alert <div>
 * @param {'success'|'error'} type
 * @param {string}      message
 */
function showAlert(alertEl, type, message) {
  // Remove previous type classes
  alertEl.classList.remove('alert-success', 'alert-error', 'visible');

  alertEl.classList.add(`alert-${type}`, 'visible');
  alertEl.querySelector('.alert-message').textContent = message;

  // Scroll the alert into view
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Auto-hide success messages after 8 seconds
  if (type === 'success') {
    setTimeout(() => alertEl.classList.remove('visible'), 8000);
  }
}

/* ─────────────────────────────────────────────────────────────────
   Booking Submission
   ───────────────────────────────────────────────────────────────── */

/**
 * submitBooking
 * Writes the booking data to Firestore "bookings" collection.
 * Returns a Promise that resolves on success.
 *
 * @param {Object} bookingData  - Plain object with booking details
 * @returns {Promise<void>}
 */
async function submitBooking(bookingData) {
  // Guard: Firebase not configured – simulate success in demo mode
  if (typeof isFirebaseConfigured === 'function' && !isFirebaseConfigured()) {
    // Simulate a short network delay for demo purposes
    await new Promise(resolve => setTimeout(resolve, 1200));
    console.info('Demo mode: booking not saved to Firestore.', bookingData);
    return;
  }

  // Write to Firestore; serverTimestamp() records when the doc was created
  await db.collection('bookings').add({
    ...bookingData,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/* ─────────────────────────────────────────────────────────────────
   Form Initializer  (called on DOMContentLoaded in booking.html)
   ───────────────────────────────────────────────────────────────── */

/**
 * initBookingForm
 * Wires up the booking form: validation, submission, and UI feedback.
 * Call this once the DOM is ready.
 */
function initBookingForm() {
  const form    = document.getElementById('bookingForm');
  const alertEl = document.getElementById('bookingAlert');
  const submitBtn = form ? form.querySelector('#submitBtn') : null;
  const spinner   = form ? form.querySelector('#submitSpinner') : null;

  if (!form || !alertEl || !submitBtn || !spinner) return;

  // Collect references to all form fields and their error elements
  const fields = {
    name:     { el: form.querySelector('#guestName'),     errEl: form.querySelector('#nameError') },
    email:    { el: form.querySelector('#guestEmail'),    errEl: form.querySelector('#emailError') },
    phone:    { el: form.querySelector('#guestPhone'),    errEl: form.querySelector('#phoneError') },
    room:     { el: form.querySelector('#roomType'),      errEl: form.querySelector('#roomError') },
    checkin:  { el: form.querySelector('#checkinDate'),   errEl: form.querySelector('#checkinError') },
    checkout: { el: form.querySelector('#checkoutDate'),  errEl: form.querySelector('#checkoutError') },
    guests:   { el: form.querySelector('#numGuests'),     errEl: form.querySelector('#guestsError') }
  };

  // Set minimum check-in date to today
  const todayISO = new Date().toISOString().split('T')[0];
  if (fields.checkin.el)  fields.checkin.el.min  = todayISO;
  if (fields.checkout.el) fields.checkout.el.min = todayISO;

  // When check-in changes, update check-out minimum date
  fields.checkin.el.addEventListener('change', () => {
    fields.checkout.el.min = fields.checkin.el.value || todayISO;
    // If check-out is before new check-in, reset it
    if (fields.checkout.el.value && fields.checkout.el.value <= fields.checkin.el.value) {
      fields.checkout.el.value = '';
    }
  });

  // Live validation: clear field error as soon as user fixes it
  Object.values(fields).forEach(({ el, errEl }) => {
    el.addEventListener('input',  () => clearFieldError(el, errEl));
    el.addEventListener('change', () => clearFieldError(el, errEl));
  });

  // ── Form Submit Handler ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Hide any previous alert
    alertEl.classList.remove('visible');

    // Validate – stop if invalid
    if (!validateBookingForm(fields)) {
      // Scroll to first error
      const firstError = form.querySelector('.form-control.error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Show loading state
    setSubmitLoading(submitBtn, spinner, true);

    // Assemble booking data object
    const bookingData = {
      name:     fields.name.el.value.trim(),
      email:    fields.email.el.value.trim().toLowerCase(),
      phone:    fields.phone.el.value.trim(),
      room:     fields.room.el.value,
      checkin:  fields.checkin.el.value,
      checkout: fields.checkout.el.value,
      guests:   parseInt(fields.guests.el.value, 10)
    };

    try {
      await submitBooking(bookingData);

      // ── Success ──
      showAlert(
        alertEl,
        'success',
        `🎉 Booking confirmed! Thank you, ${bookingData.name}. ` +
        `We look forward to welcoming you for your stay from ` +
        `${formatDate(bookingData.checkin)} to ${formatDate(bookingData.checkout)}.`
      );

      // Reset the form fields
      form.reset();

    } catch (error) {
      // ── Error ──
      console.error('Booking submission failed:', error);
      showAlert(
        alertEl,
        'error',
        'Sorry, we could not complete your booking. Please try again or call us directly.'
      );
    } finally {
      // Always restore the submit button
      setSubmitLoading(submitBtn, spinner, false);
    }
  });
}

/* ─────────────────────────────────────────────────────────────────
   Utility
   ───────────────────────────────────────────────────────────────── */

/**
 * formatDate
 * Converts an ISO date string (YYYY-MM-DD) to a human-readable format.
 * e.g. "2025-12-24" → "December 24, 2025"
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return '';
  const [year, month, day] = isoString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
