/**
 * backend/notificationService.js
 * ──────────────────────────────────────────────────────────────────
 * Notification and logging logic for the RETRET Hotel Cloud Functions.
 *
 * Exported functions:
 *   sendBookingConfirmation(booking, bookingId) – sends a confirmation email
 *                                                 via nodemailer (or logs in demo mode)
 *   logBooking(bookingId, bookingData)          – structured Cloud Logging
 *
 * HOW TO CONFIGURE EMAIL (nodemailer):
 *   1. Store SMTP credentials as Firebase Function config values:
 *        firebase functions:config:set \
 *          email.host="smtp.gmail.com" \
 *          email.port="465" \
 *          email.user="your-gmail@gmail.com" \
 *          email.pass="your-app-password" \
 *          email.from="RETRET Hotel <noreply@retret.com>"
 *   2. For Gmail: create an App Password at
 *        https://myaccount.google.com/apppasswords
 *      and use it as email.pass above (not your regular Gmail password).
 *   3. Alternatively, use SendGrid SMTP:
 *        host: "smtp.sendgrid.net", port: 587,
 *        user: "apikey", pass: "<SENDGRID_API_KEY>"
 *   4. Deploy the functions:  firebase deploy --only functions
 *
 * Used by backend/index.js.
 * ──────────────────────────────────────────────────────────────────
 */

const { logger, config } = require('firebase-functions');
const nodemailer          = require('nodemailer');

/* ── Nodemailer transporter ──────────────────────────────────────
 * The transporter is created lazily (on first send) so the module
 * can be imported without crashing when config values are absent
 * (e.g. during unit tests or the first cold boot).
 */
let _transporter = null;

/**
 * getTransporter
 * Returns a reusable nodemailer transporter configured from
 * Firebase Function environment config values.
 *
 * If config values are absent (local dev / demo mode) the function
 * returns null, which causes sendBookingConfirmation() to fall back
 * to logging only.
 *
 * @returns {nodemailer.Transporter|null}
 */
function getTransporter() {
  if (_transporter) return _transporter;

  let emailConfig;
  try {
    emailConfig = config().email; // Populated via `firebase functions:config:set`
  } catch {
    return null; // Config not available (local/demo mode)
  }

  if (!emailConfig || !emailConfig.user || !emailConfig.pass) {
    return null; // Email not configured – will log only
  }

  _transporter = nodemailer.createTransport({
    host:   emailConfig.host || 'smtp.gmail.com',
    port:   parseInt(emailConfig.port || '465', 10),
    secure: parseInt(emailConfig.port || '465', 10) === 465, // true for port 465
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass,
    },
  });

  return _transporter;
}

/* ── Email Template ──────────────────────────────────────────────

/**
 * buildConfirmationEmailHtml
 * Generates the HTML body for a booking confirmation email.
 *
 * @param {Object} booking   – Booking document data from Firestore
 * @param {string} bookingId – Firestore document ID of the booking
 * @returns {string}         – HTML email content
 */
function buildConfirmationEmailHtml(booking, bookingId) {
  const name     = booking.name     || 'Guest';
  const room     = booking.room     || 'Selected Room';
  const checkin  = booking.checkin  || '—';
  const checkout = booking.checkout || '—';
  const guests   = booking.guests   || 1;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmation – RETRET Hotel</title>
  <style>
    /* Inline styles for maximum email client compatibility */
    body        { margin:0; padding:0; background:#f5f5f5; font-family:Arial,Helvetica,sans-serif; color:#333333; }
    .wrapper    { max-width:600px; margin:40px auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.12); }
    .header     { background:#1a1a2e; padding:2.5rem 2rem; text-align:center; }
    .header h1  { color:#c9a84c; font-size:1.8rem; margin:0 0 0.25rem; font-family:Georgia,serif; }
    .header p   { color:rgba(255,255,255,0.7); font-size:0.9rem; margin:0; }
    .body       { padding:2rem; }
    .greeting   { font-size:1.1rem; color:#1a1a2e; font-weight:bold; margin-bottom:0.5rem; }
    .intro      { color:#666666; margin-bottom:1.5rem; }
    .booking-box{ background:#f9f6ef; border-left:4px solid #c9a84c; border-radius:4px; padding:1.5rem; margin-bottom:1.5rem; }
    .booking-box h2 { color:#1a1a2e; font-size:1rem; margin:0 0 1rem; font-family:Georgia,serif; text-transform:uppercase; letter-spacing:0.05em; }
    .detail-row { display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid rgba(0,0,0,0.07); font-size:0.95rem; }
    .detail-row:last-child { border-bottom:none; }
    .detail-label { color:#666; }
    .detail-val   { color:#1a1a2e; font-weight:600; }
    .notice     { background:#fff3cd; border-radius:4px; padding:1rem 1.2rem; font-size:0.88rem; color:#856404; margin-bottom:1.5rem; }
    .cta        { text-align:center; margin-bottom:1.5rem; }
    .cta-btn    { display:inline-block; background:#c9a84c; color:#1a1a2e; padding:0.75rem 2rem; border-radius:4px; font-weight:bold; text-decoration:none; font-size:0.95rem; }
    .footer     { background:#1a1a2e; padding:1.5rem 2rem; text-align:center; }
    .footer p   { color:rgba(255,255,255,0.5); font-size:0.8rem; margin:0.25rem 0; }
    .footer a   { color:#c9a84c; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Header -->
    <div class="header">
      <h1>RETRET Hotel</h1>
      <p>Booking Confirmation</p>
    </div>

    <!-- Body -->
    <div class="body">

      <p class="greeting">Dear ${name},</p>
      <p class="intro">
        Thank you for choosing RETRET Hotel! Your reservation has been received and
        is currently being processed. You will receive a final confirmation once
        payment has been completed.
      </p>

      <!-- Booking details box -->
      <div class="booking-box">
        <h2>Your Reservation Details</h2>
        <div class="detail-row">
          <span class="detail-label">Booking ID</span>
          <span class="detail-val">${bookingId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Room</span>
          <span class="detail-val">${room}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Check-in</span>
          <span class="detail-val">${checkin}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Check-out</span>
          <span class="detail-val">${checkout}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Number of Guests</span>
          <span class="detail-val">${guests}</span>
        </div>
      </div>

      <!-- Cancellation notice -->
      <div class="notice">
        <strong>Free cancellation</strong> up to 48 hours before check-in.
        To cancel or modify your booking, please contact us at
        <a href="mailto:reservations@retret.com" style="color:#856404;">reservations@retret.com</a>
        quoting your Booking ID.
      </div>

      <!-- CTA -->
      <div class="cta">
        <a href="https://retret.com" class="cta-btn">Visit Our Website</a>
      </div>

      <p style="color:#666;font-size:0.9rem;">
        If you have any questions, please don't hesitate to contact us:<br />
        📞 <a href="tel:+15551234567" style="color:#c9a84c;">+1 (555) 123-4567</a> &nbsp;|&nbsp;
        ✉️ <a href="mailto:reservations@retret.com" style="color:#c9a84c;">reservations@retret.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>RETRET Hotel &nbsp;·&nbsp; 123 Grand Boulevard, City Centre, Metropolis 10001</p>
      <p>© 2025 RETRET Hotel. All rights reserved.</p>
      <p style="margin-top:0.5rem;">
        <a href="https://retret.com/privacy">Privacy Policy</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

/* ── Public API ──────────────────────────────────────────────────

/**
 * sendBookingConfirmation
 * Sends a booking confirmation email to the guest via nodemailer.
 * Falls back to structured logging if email is not configured.
 *
 * @param {Object} booking   – The Firestore booking document data
 * @param {string} [bookingId=''] – The Firestore document ID
 * @returns {Promise<void>}
 */
async function sendBookingConfirmation(booking, bookingId = '') {
  // Always log the confirmation attempt
  logBooking(bookingId, booking);

  const transporter = getTransporter();

  if (!transporter) {
    // Email not configured — log intent and return
    logger.info('📧 [Demo] Booking confirmation email would be sent to:', {
      to:        booking.email    || 'N/A',
      guestName: booking.name     || 'N/A',
      room:      booking.room     || 'N/A',
      checkIn:   booking.checkin  || 'N/A',
      checkOut:  booking.checkout || 'N/A',
      bookingId,
    });
    return;
  }

  // Get the "from" address from config, fall back to a sensible default
  let fromAddress = 'RETRET Hotel <noreply@retret.com>';
  try {
    fromAddress = config().email.from || fromAddress;
  } catch { /* Use default */ }

  const mailOptions = {
    from:    fromAddress,
    to:      booking.email,
    subject: `Booking Confirmation – ${booking.room || 'Your Stay'} | Booking #${bookingId}`,
    html:    buildConfirmationEmailHtml(booking, bookingId),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('📧 Confirmation email sent', {
      bookingId,
      messageId: info.messageId,
      to:        booking.email,
    });
  } catch (err) {
    // Log the error but don't throw — a failed email must not break the booking
    logger.error('📧 Failed to send confirmation email', {
      bookingId,
      to:    booking.email,
      error: err.message,
    });
  }
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
