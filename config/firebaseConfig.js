/**
 * config/firebaseConfig.js
 * ──────────────────────────────────────────────────────────────────
 * Shared Firebase configuration reference for the RETRET Hotel project.
 *
 * PURPOSE:
 *   This file is for documentation and reference only.
 *   The actual client-side Firebase initialisation code lives in:
 *     public/js/firebase-config.js
 *   The Cloud Functions Admin SDK is initialised in:
 *     functions/index.js  (via admin.initializeApp())
 *
 * HOW TO SET UP:
 *   1. Go to https://console.firebase.google.com/
 *   2. Create (or select) your Firebase project.
 *   3. Click the Web icon (</>)  to register a web app.
 *   4. Copy the firebaseConfig values shown and paste them into
 *      public/js/firebase-config.js.
 *   5. Enable Firestore: Build → Firestore Database → Create database.
 *   6. Enable Hosting:   Build → Hosting → Get started.
 *   7. Enable Functions: Build → Functions → Get started.
 *
 * SECURITY NOTE:
 *   Firebase Web API keys are NOT secret – they are included in the
 *   client bundle and are safe to expose.  Security is enforced via
 *   Firestore Security Rules (see firestore.rules).
 *   Never commit service-account JSON files or Admin SDK credentials.
 * ──────────────────────────────────────────────────────────────────
 *
 * ══════════════════════════════════════════════════════════════════
 * FIRESTORE COLLECTIONS SCHEMA
 * ══════════════════════════════════════════════════════════════════
 *
 * Collection: rooms
 * ─────────────────
 * Managed via Firebase console / Admin SDK.  Public read-only.
 *
 * Field        Type      Description
 * ──────────── ───────── ──────────────────────────────────────────
 * name         string    Display name  (e.g. "Deluxe King Room")
 * price        number    Price per night in USD
 * capacity     number    Maximum number of guests
 * description  string    Short room description
 * image        string    URL to the room photo
 * amenities    string[]  List of amenity labels
 * featured     boolean   true → shown on the home page featured section
 * available    boolean   true → room is currently bookable
 *
 * Collection: bookings
 * ─────────────────────
 * Created by the client booking form.  Public create, no public read.
 *
 * Field        Type      Description
 * ──────────── ───────── ──────────────────────────────────────────
 * name         string    Guest full name       (< 100 chars)
 * email        string    Guest email address   (< 200 chars, lowercase)
 * phone        string    Guest phone number    (< 50 chars)
 * room         string    Selected room name    (< 200 chars)
 * checkin      string    Check-in  date        (YYYY-MM-DD)
 * checkout     string    Check-out date        (YYYY-MM-DD)
 * guests       integer   Number of guests      (1–10)
 * status       string    Booking status        ("pending" | "confirmed" | "cancelled")
 * createdAt    timestamp Server-side creation  (set by Admin SDK)
 * timestamp    timestamp Client-side timestamp (set by client SDK – legacy field)
 *
 * Collection: users  (optional, future)
 * ──────────────────────────────────────
 * Field        Type      Description
 * ──────────── ───────── ──────────────────────────────────────────
 * name         string    User display name
 * email        string    User email address
 * role         string    "admin" | "staff" | "guest"
 *
 * Collection: messages
 * ─────────────────────
 * Created by the contact form.  Public create, no public read.
 *
 * Field        Type      Description
 * ──────────── ───────── ──────────────────────────────────────────
 * name         string    Sender's name          (< 100 chars)
 * email        string    Sender's email         (< 200 chars)
 * subject      string    Message subject        (< 300 chars)
 * message      string    Message body           (< 5000 chars)
 * timestamp    timestamp Server-side creation  (set by client SDK)
 * ══════════════════════════════════════════════════════════════════
 */

// Reference configuration object (replace placeholders before deploying)
const firebaseConfig = {
  apiKey: "AIzaSyCUL...",
  authDomain: "retret-2f25f.firebaseapp.com",
  projectId: "retret-2f25f",
  storageBucket: "retret-2f25f.firebasestorage.app",
  messagingSenderId: "855570710368",
  appId: "1:855570710368:web:2f4040087e5018aee9e805",
  measurementId: "G-QGEY8YEN7K"
};

firebase.initializeApp(firebaseConfig);