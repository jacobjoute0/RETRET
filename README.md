# RETRET Hotel – Luxury Booking Website

A complete, responsive hotel booking and information website built with HTML, CSS, JavaScript, and Firebase.

---

## Features

- 🏨 Multi-page responsive hotel UI (Home, Rooms, Booking, Contact)
- 🔄 Dynamic component loading – shared navbar and footer injected by `ui.js`
- 🛏️ Room listings loaded from Firestore (with sample-data fallback)
- 📅 Online booking form with full client-side validation
- 📧 Contact form with Firestore message storage
- ⚡ Firebase Hosting, Firestore, Cloud Functions, and Authentication
- ♿ Accessibility attributes throughout (ARIA roles, aria-expanded, aria-current)
- 📱 Mobile-responsive with hamburger navigation
- 🔒 Firestore Security Rules with admin role-based access control
- 🔑 Admin dashboard with room management, bookings, and image upload
- 💳 Payment processing service (Stripe-ready placeholder)
- 📨 Booking confirmation emails via nodemailer (configurable SMTP)

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript (no build step) |
| Database  | Firebase Firestore (NoSQL)                      |
| Hosting   | Firebase Hosting                                |
| Backend   | Firebase Cloud Functions (Node.js 18)           |
| Auth      | Firebase Authentication                         |
| Storage   | Firebase Storage (admin image upload)           |
| Email     | Nodemailer (configurable SMTP)                  |

---

## Folder Structure

```
RETRET/
├── .firebaserc                  ← Firebase project alias
├── .gitignore
├── firebase.json                ← Hosting, Firestore, Functions config
├── firestore.rules              ← Firestore Security Rules (role-based)
├── README.md
│
├── config/
│   └── firebaseConfig.js        ← Shared config reference + schema docs
│
├── functions/
│   ├── index.js                 ← Cloud Function entry point
│   ├── bookingService.js        ← Booking validation & Firestore writes
│   ├── notificationService.js   ← Logging & nodemailer email confirmation
│   ├── paymentService.js        ← Payment processing (Stripe-ready)
│   └── package.json
│
└── public/
    ├── index.html               ← Home page
    ├── rooms.html               ← Rooms & Suites listing
    ├── booking.html             ← Reservation form
    ├── contact.html             ← Contact page
    ├── admin/
    │   ├── login.html           ← Admin sign-in page
    │   ├── dashboard.html       ← Admin dashboard (stats + recent bookings)
    │   ├── rooms.html           ← Admin room management (CRUD + image upload)
    │   ├── bookings.html        ← Admin bookings management (view/cancel)
    │   └── admin.js             ← Admin CRUD operations
    ├── components/
    │   ├── navbar.html          ← Reusable navbar partial
    │   └── footer.html          ← Reusable footer partial
    ├── css/
    │   └── style.css
    ├── images/                  ← Static images (add your own)
    └── js/
        ├── firebase-config.js   ← Firebase SDK init (client-side)
        ├── auth.js              ← Firebase Auth helpers (signIn, isAdmin, guard)
        ├── ui.js                ← Shared UI helpers (components, nav, scroll)
        ├── rooms.js             ← Room card rendering & Firestore loader
        └── booking.js           ← Booking form logic
```

---

## Setup Instructions

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

### 1. Clone the repository

```bash
git clone https://github.com/jacobjoute0/RETRET.git
cd RETRET
```

### 2. Install Cloud Functions dependencies

```bash
cd functions
npm install
cd ..
```

### 3. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Firestore Database** (Build → Firestore Database).
3. Enable **Authentication** (Build → Authentication → Sign-in method → Email/Password).
4. Enable **Hosting** (Build → Hosting).
5. Enable **Functions** (Build → Functions).
6. Enable **Storage** (Build → Storage) – required for admin image uploads.
7. Register a **Web App** (Project Settings → Your apps → Add app).
8. Copy the `firebaseConfig` values into `public/js/firebase-config.js`.

### 4. Log in and initialise

```bash
firebase login
firebase use --add   # select your project (or edit .firebaserc manually)
```

---

## Admin Dashboard Setup

### Creating an Admin User

1. In the [Firebase Console](https://console.firebase.google.com/), go to **Authentication → Users**.
2. Click **Add user** and enter the admin email and password.
3. Copy the **UID** shown for that user.
4. Go to **Firestore Database** and create a document:
   - Collection: `users`
   - Document ID: `<paste the UID from step 3>`
   - Fields:
     ```
     name:  string  "Admin Name"
     email: string  "admin@example.com"
     role:  string  "admin"
     ```
5. Navigate to `https://your-site.web.app/admin/login.html` and sign in.

---

## Email Configuration (nodemailer)

Set SMTP credentials as Firebase Function config values:

```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="465" \
  email.user="your-gmail@gmail.com" \
  email.pass="your-app-password" \
  email.from="RETRET Hotel <noreply@retret.com>"
```

For Gmail, generate an **App Password** at:
https://myaccount.google.com/apppasswords

Then redeploy functions:

```bash
firebase deploy --only functions
```

If email credentials are not configured, the system falls back to structured logging (visible in Firebase Console → Functions → Logs).

---

## Payment Integration (Stripe)

The `functions/paymentService.js` file contains a Stripe-ready placeholder. To enable real payments:

1. Install the Stripe SDK: `cd functions && npm install stripe`
2. Set your Stripe secret key:
   ```bash
   firebase functions:config:set stripe.secret_key="sk_live_..."
   ```
3. Follow the commented-out Stripe code in `paymentService.js`.
4. Redeploy: `firebase deploy --only functions`

---

## Deploy

```bash
# Deploy everything
firebase deploy

# Deploy only hosting (frontend)
firebase deploy --only hosting

# Deploy only Cloud Functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules
```

---

## Local Development

```bash
# Serve the frontend locally
firebase serve --only hosting

# Start the Functions emulator
cd functions && npm run serve
```

---

## Firestore Database Schema

### `rooms` collection (managed via admin dashboard or console)

| Field       | Type     | Description                          |
|-------------|----------|--------------------------------------|
| name        | string   | Room display name                    |
| price       | number   | Price per night (USD)                |
| capacity    | number   | Maximum guests                       |
| description | string   | Short room description               |
| image       | string   | URL to room photo                    |
| amenities   | string[] | List of amenity labels               |
| featured    | boolean  | Show on home page featured section   |
| available   | boolean  | Room is bookable                     |

### `bookings` collection (created by booking form or Cloud Function)

| Field       | Type      | Description                          |
|-------------|-----------|--------------------------------------|
| name        | string    | Guest full name                      |
| email       | string    | Guest email (lowercased)             |
| phone       | string    | Guest phone number                   |
| room        | string    | Selected room name                   |
| checkin     | string    | Check-in date (YYYY-MM-DD)           |
| checkout    | string    | Check-out date (YYYY-MM-DD)          |
| guests      | integer   | Number of guests (1–10)              |
| status      | string    | pending / confirmed / cancelled      |
| paymentId   | string    | Reference to payments document       |
| createdAt   | timestamp | Server-side creation time            |

### `users` collection (managed via admin or Firebase Console)

| Field  | Type   | Description                    |
|--------|--------|--------------------------------|
| name   | string | User display name              |
| email  | string | User email                     |
| role   | string | "admin" or "user"              |

### `messages` collection (created by contact form)

| Field     | Type      | Description              |
|-----------|-----------|--------------------------|
| name      | string    | Sender's name            |
| email     | string    | Sender's email           |
| subject   | string    | Message subject          |
| message   | string    | Message body             |
| timestamp | timestamp | Creation time            |

### `payments` collection (created by Cloud Function)

| Field         | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| bookingId     | string    | Reference to bookings document       |
| amount        | number    | Payment amount (USD)                 |
| currency      | string    | ISO currency code (default: "usd")   |
| status        | string    | "paid" / "failed"                    |
| transactionId | string    | Payment processor transaction ID     |
| createdAt     | timestamp | Server-side creation time            |

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes following the existing code style.
3. Test locally with `firebase serve`.
4. Submit a Pull Request describing your changes.

Please keep frontend code in `public/`, backend code in `functions/`, and do not commit Firebase credentials or `node_modules/`.
