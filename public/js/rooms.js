/**
 * rooms.js
 * ─────────────────────────────────────────────────────────────────
 * Loads hotel room data from Firestore and renders room cards on
 * both rooms.html (full listing) and index.html (featured cards).
 *
 * Firestore collection: "rooms"
 * Document fields:
 *   name        (string)  – room display name
 *   price       (number)  – price per night in USD
 *   capacity    (number)  – max number of guests
 *   image       (string)  – URL to room photo
 *   description (string)  – short room description
 *   amenities   (array)   – list of amenity strings
 *   featured    (boolean) – true to include in featured section
 * ─────────────────────────────────────────────────────────────────
 */

/* ── Fallback / Sample Rooms ─────────────────────────────────────
   Displayed when Firebase is not configured or Firestore is empty.
   ──────────────────────────────────────────────────────────────── */
const SAMPLE_ROOMS = [
  {
    id: "deluxe-king",
    name: "Deluxe King Room",
    price: 189,
    capacity: 2,
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format",
    description: "Spacious room with a king-sized bed, premium linens, and stunning city views from floor-to-ceiling windows.",
    amenities: ["King Bed", "City View", "Free WiFi", "Mini Bar", "Smart TV"],
    featured: true
  },
  {
    id: "superior-twin",
    name: "Superior Twin Room",
    price: 149,
    capacity: 2,
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&auto=format",
    description: "Elegantly furnished twin room ideal for business travelers or friends, with two comfortable queen beds.",
    amenities: ["Twin Beds", "Work Desk", "Free WiFi", "Coffee Maker", "Bathtub"],
    featured: true
  },
  {
    id: "junior-suite",
    name: "Junior Suite",
    price: 289,
    capacity: 3,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format",
    description: "A luxurious suite featuring a separate living area, walk-in wardrobe, and premium amenities throughout.",
    amenities: ["King Bed", "Living Area", "Free WiFi", "Jacuzzi", "Balcony", "Butler Service"],
    featured: true
  },
  {
    id: "presidential-suite",
    name: "Presidential Suite",
    price: 599,
    capacity: 4,
    image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&auto=format",
    description: "The pinnacle of luxury – a two-room suite with panoramic views, private dining, and dedicated concierge.",
    amenities: ["2 Bedrooms", "Private Pool", "Free WiFi", "Kitchen", "Panoramic View", "Concierge"],
    featured: false
  },
  {
    id: "standard-queen",
    name: "Standard Queen Room",
    price: 119,
    capacity: 2,
    image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&auto=format",
    description: "Comfortable and well-appointed room with all the essentials for a relaxing stay.",
    amenities: ["Queen Bed", "Free WiFi", "Smart TV", "Coffee Maker"],
    featured: false
  },
  {
    id: "family-room",
    name: "Family Room",
    price: 229,
    capacity: 5,
    image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&auto=format",
    description: "Generously sized room designed for families with extra beds, a play area, and family-friendly amenities.",
    amenities: ["Extra Beds", "Play Area", "Free WiFi", "Mini Kitchen", "Smart TV"],
    featured: false
  }
];

/* ── SVG Icon Helpers ──────────────────────────────────────────── */

/** Returns an SVG icon for the person/capacity indicator */
function personIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`;
}

/** Returns an SVG icon for the price/dollar indicator */
function dollarIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>`;
}

/* ── Room Card Builder ─────────────────────────────────────────── */

/**
 * buildRoomCard
 * Generates the HTML markup for a single room card.
 *
 * @param {Object} room  - Room data object (from Firestore or sample data)
 * @param {string} room.id
 * @param {string} room.name
 * @param {number} room.price
 * @param {number} room.capacity
 * @param {string} room.image
 * @param {string} room.description
 * @param {string[]} room.amenities
 * @returns {string} HTML string for the card
 */
function buildRoomCard(room) {
  // Limit amenities shown to first 4 to keep cards uniform
  const visibleAmenities = (room.amenities || []).slice(0, 4);
  const amenityTagsHTML = visibleAmenities
    .map(a => `<span class="amenity-tag">${a}</span>`)
    .join('');

  // Encode room name for the URL query parameter
  const roomParam = encodeURIComponent(room.name);

  return `
    <article class="room-card" data-room-id="${room.id || ''}">
      <!-- Room photo with badge overlay -->
      <div class="room-card-image">
        <img
          src="${room.image}"
          alt="${room.name}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format'"
        />
        <span class="room-badge">Available</span>
      </div>

      <!-- Card content -->
      <div class="room-card-body">
        <h3 class="room-card-title">${room.name}</h3>

        <!-- Capacity and price meta row -->
        <div class="room-card-meta">
          <span class="room-meta-item">
            ${personIcon()}
            Up to ${room.capacity} guests
          </span>
          <span class="room-meta-item">
            ${dollarIcon()}
            From $${room.price}/night
          </span>
        </div>

        <p class="room-card-description">${room.description}</p>

        <!-- Amenity tags -->
        <div class="room-amenities">${amenityTagsHTML}</div>
      </div>

      <!-- Price and CTA footer -->
      <div class="room-card-footer">
        <div class="room-price">
          <span class="amount">$${room.price}</span>
          <span class="per-night"> / night</span>
        </div>
        <a
          href="booking.html?room=${roomParam}"
          class="btn btn-primary"
          aria-label="Book ${room.name}"
        >Book Now</a>
      </div>
    </article>`;
}

/* ── Skeleton Loader ───────────────────────────────────────────── */

/**
 * showSkeletonLoader
 * Injects animated skeleton placeholder cards while real data loads.
 *
 * @param {HTMLElement} container  - DOM element to render skeletons into
 * @param {number}      count      - How many skeleton cards to show
 */
function showSkeletonLoader(container, count = 3) {
  container.innerHTML = `<div class="loading-skeleton">
    ${'<div class="skeleton-card">'
      + '<div class="skeleton-img"></div>'
      + '<div class="skeleton-content">'
      +   '<div class="skeleton-line medium"></div>'
      +   '<div class="skeleton-line short"></div>'
      +   '<div class="skeleton-line medium"></div>'
      + '</div></div>'
    .repeat(count)}
  </div>`;
}

/* ── Main Loaders ──────────────────────────────────────────────── */

/**
 * loadRooms
 * Entry point called from rooms.html.
 * Tries to fetch from Firestore; falls back to SAMPLE_ROOMS on error
 * or when Firebase is not yet configured.
 *
 * @param {string} containerId  - ID of the DOM element to populate
 */
async function loadRooms(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Show loading skeleton
  showSkeletonLoader(container, 6);

  try {
    // Guard: Firebase not configured yet – use sample data
    if (typeof isFirebaseConfigured === 'function' && !isFirebaseConfigured()) {
      throw new Error('Firebase not configured – using sample data');
    }

    // Query Firestore "rooms" collection, ordered by price
    const snapshot = await db.collection('rooms').orderBy('price', 'asc').get();

    if (snapshot.empty) {
      // Firestore is empty – fall back to sample rooms
      renderRooms(container, SAMPLE_ROOMS);
      return;
    }

    // Map Firestore documents to plain objects
    const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRooms(container, rooms);

  } catch (error) {
    console.warn('Rooms: using sample data.', error.message);
    // Graceful fallback – always show rooms even without Firebase
    renderRooms(container, SAMPLE_ROOMS);
  }
}

/**
 * loadFeaturedRooms
 * Entry point called from index.html.
 * Loads only rooms flagged as featured=true (or the first 3 samples).
 *
 * @param {string} containerId  - ID of the DOM element to populate
 */
async function loadFeaturedRooms(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  showSkeletonLoader(container, 3);

  try {
    if (typeof isFirebaseConfigured === 'function' && !isFirebaseConfigured()) {
      throw new Error('Firebase not configured – using sample data');
    }

    // Query only featured rooms
    const snapshot = await db
      .collection('rooms')
      .where('featured', '==', true)
      .limit(3)
      .get();

    if (snapshot.empty) throw new Error('No featured rooms found');

    const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRooms(container, rooms);

  } catch (error) {
    console.warn('Featured rooms: using sample data.', error.message);
    // Show the first 3 sample rooms that are marked featured
    const featured = SAMPLE_ROOMS.filter(r => r.featured).slice(0, 3);
    renderRooms(container, featured);
  }
}

/**
 * renderRooms
 * Converts an array of room objects into card HTML and injects it.
 * Shows an empty-state message if the array is empty.
 *
 * @param {HTMLElement} container
 * @param {Object[]}    rooms
 */
function renderRooms(container, rooms) {
  if (!rooms || rooms.length === 0) {
    // Empty state
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🏨</div>
        <h3>No rooms available</h3>
        <p>Please check back later or contact us directly.</p>
      </div>`;
    return;
  }

  // Wrap all cards in the grid container
  container.innerHTML = `<div class="rooms-grid">${rooms.map(buildRoomCard).join('')}</div>`;
}

/* ── Room Dropdown Populator ───────────────────────────────────── */

/**
 * populateRoomDropdown
 * Fills the <select id="roomType"> on booking.html with room options.
 * Also pre-selects a room if the URL has ?room=RoomName.
 *
 * @param {string} selectId  - ID of the <select> element to populate
 */
async function populateRoomDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    let rooms;

    if (typeof isFirebaseConfigured === 'function' && !isFirebaseConfigured()) {
      throw new Error('Firebase not configured');
    }

    const snapshot = await db.collection('rooms').orderBy('price', 'asc').get();
    rooms = snapshot.empty
      ? SAMPLE_ROOMS
      : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Build <option> elements
    rooms.forEach(room => {
      const opt = document.createElement('option');
      opt.value = room.name;
      opt.textContent = `${room.name} – $${room.price}/night`;
      select.appendChild(opt);
    });

  } catch {
    // Fallback: populate from sample rooms
    SAMPLE_ROOMS.forEach(room => {
      const opt = document.createElement('option');
      opt.value = room.name;
      opt.textContent = `${room.name} – $${room.price}/night`;
      select.appendChild(opt);
    });
  }

  // Pre-select room from URL query parameter ?room=...
  const urlParams = new URLSearchParams(window.location.search);
  const preselect = urlParams.get('room');
  if (preselect) {
    // Find a matching option (case-insensitive)
    const opts = Array.from(select.options);
    const match = opts.find(o => o.value.toLowerCase() === preselect.toLowerCase());
    if (match) match.selected = true;
  }
}
