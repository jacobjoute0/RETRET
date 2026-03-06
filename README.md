# RETRET Hotel – Luxury Booking Website

A complete, responsive hotel booking and information website built with HTML, CSS, JavaScript, and Firebase.

---

## Features

- 🏨 Multi-page responsive hotel UI (Home, Rooms, Booking, Contact)
- 🔄 Dynamic component loading – shared navbar and footer injected by `ui.js`
- 🛏️ Room listings loaded from Firestore (with sample-data fallback)
- 📅 Online booking form with full client-side validation
- 📧 Contact form with Firestore message storage
- ⚡ Firebase Hosting, Firestore, and Cloud Functions
- ♿ Accessibility attributes throughout (ARIA roles, aria-expanded, aria-current)
- 📱 Mobile-responsive with hamburger navigation
- 🔒 Firestore Security Rules with field validation and size limits

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript (no build step) |
| Database  | Firebase Firestore (NoSQL)                      |
| Hosting   | Firebase Hosting                                |
| Backend   | Firebase Cloud Functions (Node.js 18)           |
| Auth      | Firebase Admin SDK (service-account free)       |

---

## Folder Structure

```
RETRET/
├── .firebaserc                  ← Firebase project alias
├── .gitignore
├── firebase.json                ← Hosting, Firestore, Functions config
├── firestore.rules              ← Firestore Security Rules
├── README.md
│
├── config/
│   └── firebaseConfig.js        ← Shared config reference + schema docs
│
├── functions/
│   ├── index.js                 ← Cloud Function entry point
│   ├── bookingService.js        ← Booking validation & Firestore writes
│   ├── notificationService.js   ← Logging & notification helpers
│   └── package.json
│
└── public/
    ├── index.html               ← Home page
    ├── rooms.html               ← Rooms & Suites listing
    ├── booking.html             ← Reservation form
    ├── contact.html             ← Contact page
    ├── components/
    │   ├── navbar.html          ← Reusable navbar partial
    │   └── footer.html          ← Reusable footer partial
    ├── css/
    │   └── style.css
    ├── images/                  ← Static images (add your own)
    └── js/
        ├── firebase-config.js   ← Firebase SDK init (client-side)
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
3. Enable **Hosting** (Build → Hosting).
4. Enable **Functions** (Build → Functions).
5. Register a **Web App** (Project Settings → Your apps → Add app).
6. Copy the `firebaseConfig` values into `public/js/firebase-config.js`.

### 4. Log in and initialise

```bash
firebase login
firebase use --add   # select your project (or edit .firebaserc manually)
```

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

### `rooms` collection (managed via console)

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

### `bookings` collection (created by booking form)

| Field     | Type      | Description                          |
|-----------|-----------|--------------------------------------|
| name      | string    | Guest full name                      |
| email     | string    | Guest email (lowercased)             |
| phone     | string    | Guest phone number                   |
| room      | string    | Selected room name                   |
| checkin   | string    | Check-in date (YYYY-MM-DD)           |
| checkout  | string    | Check-out date (YYYY-MM-DD)          |
| guests    | integer   | Number of guests (1–10)              |
| status    | string    | pending / confirmed / cancelled      |
| createdAt | timestamp | Server-side creation time            |

### `messages` collection (created by contact form)

| Field   | Type      | Description              |
|---------|-----------|--------------------------|
| name    | string    | Sender's name            |
| email   | string    | Sender's email           |
| subject | string    | Message subject          |
| message | string    | Message body             |
| timestamp | timestamp | Creation time          |

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes following the existing code style.
3. Test locally with `firebase serve`.
4. Submit a Pull Request describing your changes.

Please keep frontend code in `public/`, backend code in `functions/`, and do not commit Firebase credentials or `node_modules/`.
