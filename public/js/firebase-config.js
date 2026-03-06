/**
 * firebase-config.js
 * ──────────────────────────────────────────────────────────────────
 * Firebase SDK initialization for the RETRET Hotel website.
 *
 * HOW TO USE:
 *   1. Go to https://console.firebase.google.com/
 *   2. Create or select your project
 *   3. Click the Web icon (</>)  to register your web app
 *   4. Copy the firebaseConfig object values into the config below
 *   5. Enable Firestore in "Build > Firestore Database"
 *
 * IMPORTANT: Never commit real API keys to public repositories.
 * Consider using environment variables or Firebase App Hosting
 * secrets for production deployments.
 * ──────────────────────────────────────────────────────────────────
 */

// ── Import the Firebase modules we need (v9+ modular SDK via CDN) ──
// These <script> imports are declared in each HTML file's <head>.
// Here we use the globally available firebase namespace (compat SDK)
// loaded via CDN for simplicity without a build step.

/**
 * firebaseConfig
 * ──────────────────────────────────────────────────────────────────
 * REPLACE each placeholder value with your actual Firebase project
 * credentials found in: Firebase Console > Project Settings > Your Apps
 * ──────────────────────────────────────────────────────────────────
 */
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",             // Web API key
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",          // Firestore project ID
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ── Initialize Firebase App ──
// firebase.initializeApp() must be called before any other Firebase service.
let app;
try {
  app = firebase.initializeApp(firebaseConfig);
} catch (e) {
  // Firebase may already be initialized (e.g., on hot reload in dev)
  app = firebase.app();
}

// ── Initialize Firestore ──
// db is the Firestore database reference used across the application.
const db = firebase.firestore();

// ── Optional: Enable Firestore offline persistence ──
// This caches data locally so the app works when the device is offline.
// db.enablePersistence().catch(err => console.warn('Persistence error:', err.code));

/**
 * isFirebaseConfigured
 * A helper to detect whether the developer has replaced the placeholder
 * values with real Firebase credentials.  Used by rooms.js and booking.js
 * to decide whether to fall back to sample data.
 */
function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}
