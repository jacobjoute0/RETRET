/**
 * auth.js
 * ──────────────────────────────────────────────────────────────────
 * Firebase Authentication helper module for the RETRET Hotel website.
 *
 * Responsibilities:
 *   - Sign in / sign out via Firebase Auth (email + password)
 *   - Watch auth-state changes
 *   - Check whether the current user has the "admin" role
 *     (role is stored in the Firestore "users" collection)
 *   - Guard admin-only pages: redirect to login if unauthenticated
 *
 * Prerequisites:
 *   - firebase-app-compat.js must be loaded before this script
 *   - firebase-auth-compat.js must be loaded before this script
 *   - firebase-config.js must be loaded before this script (initialises `db`)
 *
 * Usage:
 *   Include this script on any page that requires auth functionality.
 *   Call `requireAdminAuth()` at the top of admin pages to enforce
 *   role-based access control.
 * ──────────────────────────────────────────────────────────────────
 */

// ── Auth instance (Firebase compat SDK) ──────────────────────────
// firebase.auth() is available after firebase-auth-compat.js is loaded.
const auth = firebase.auth();

/* ── Sign In ─────────────────────────────────────────────────────

/**
 * signIn
 * Signs the user in with email and password via Firebase Auth.
 *
 * @param {string} email    - User's email address
 * @param {string} password - User's password
 * @returns {Promise<firebase.auth.UserCredential>}
 * @throws  {firebase.auth.AuthError}  on invalid credentials
 */
async function signIn(email, password) {
  return auth.signInWithEmailAndPassword(email.trim(), password);
}

/* ── Sign Out ────────────────────────────────────────────────────

/**
 * signOut
 * Signs the current user out and optionally redirects to a URL.
 *
 * @param {string} [redirectUrl='../../index.html'] - Page to redirect after sign-out
 * @returns {Promise<void>}
 */
async function signOut(redirectUrl = '../../index.html') {
  await auth.signOut();
  if (redirectUrl) window.location.href = redirectUrl;
}

/* ── Auth State Watcher ──────────────────────────────────────────

/**
 * onAuthStateChanged
 * Subscribes to Firebase Auth state changes.
 * Calls `callback` with the current User object (or null if signed out).
 *
 * @param {function(firebase.User|null): void} callback
 * @returns {function} Unsubscribe function
 */
function onAuthChange(callback) {
  return auth.onAuthStateChanged(callback);
}

/* ── Role Check ──────────────────────────────────────────────────

/**
 * isAdmin
 * Checks whether the currently signed-in user has the "admin" role.
 * Role is stored in the Firestore "users/{uid}" document under the
 * "role" field.
 *
 * Returns false if:
 *   - no user is signed in
 *   - the user document does not exist
 *   - the role field is not "admin"
 *
 * @param {firebase.User} user - Firebase Auth user object
 * @returns {Promise<boolean>}
 */
async function isAdmin(user) {
  if (!user) return false;
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    return doc.exists && doc.data().role === 'admin';
  } catch (err) {
    console.error('auth.js: isAdmin check failed', err);
    return false;
  }
}

/* ── Admin Page Guard ────────────────────────────────────────────

/**
 * requireAdminAuth
 * Guards an admin-only page.
 *
 * Behaviour:
 *   1. Waits for Firebase to resolve the initial auth state.
 *   2. If no user → redirects to the admin login page.
 *   3. If user is signed in but does not have the "admin" role →
 *      redirects to the main site with an `?error=unauthorized` param.
 *   4. If user is an admin → calls `onSuccess(user)` so the page can
 *      proceed with initialisation.
 *
 * @param {function(firebase.User): void} [onSuccess] - Callback when auth + role is confirmed
 * @param {string} [loginPage='login.html']           - Path to the login page (relative)
 */
function requireAdminAuth(onSuccess, loginPage = 'login.html') {
  // Show a loading overlay while we wait for auth state
  const loadingEl = document.getElementById('authLoadingOverlay');
  if (loadingEl) loadingEl.style.display = 'flex';

  // onAuthStateChanged fires once immediately with current state
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    unsubscribe(); // We only need the first emission

    if (!user) {
      // Not signed in → go to login
      window.location.href = loginPage;
      return;
    }

    const adminOk = await isAdmin(user);
    if (!adminOk) {
      // Signed in but not admin → redirect to home
      window.location.href = '../../index.html?error=unauthorized';
      return;
    }

    // Auth confirmed – hide overlay and invoke callback
    if (loadingEl) loadingEl.style.display = 'none';
    if (typeof onSuccess === 'function') onSuccess(user);
  });
}

/* ── Current User Helper ─────────────────────────────────────────

/**
 * getCurrentUser
 * Returns the currently signed-in Firebase User, or null.
 *
 * @returns {firebase.User|null}
 */
function getCurrentUser() {
  return auth.currentUser;
}
