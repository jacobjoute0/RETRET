/**
 * admin.js
 * ──────────────────────────────────────────────────────────────────
 * Admin panel JavaScript for the RETRET Hotel website.
 *
 * Handles:
 *   - Auth guard (calls requireAdminAuth from auth.js)
 *   - Dashboard statistics and recent bookings (dashboard.html)
 *   - Room CRUD operations (admin/rooms.html):
 *       listAdminRooms()   – load and render all rooms in a table
 *       openRoomModal()    – show add/edit room modal
 *       saveRoom()         – create or update a room document
 *       deleteRoom()       – soft-delete or remove a room
 *       uploadRoomImage()  – upload a room image to Firebase Storage
 *   - Booking management (admin/bookings.html):
 *       listAdminBookings() – load and render all bookings in a table
 *       cancelBooking()     – update booking status to "cancelled"
 *       viewBooking()       – show booking details in a modal
 *
 * Prerequisites (must be loaded before admin.js):
 *   - firebase-app-compat.js
 *   - firebase-auth-compat.js
 *   - firebase-firestore-compat.js
 *   - firebase-storage-compat.js  (only on rooms.html)
 *   - ../js/firebase-config.js    (initialises firebase, db)
 *   - ../js/auth.js               (auth helpers)
 * ──────────────────────────────────────────────────────────────────
 */

/* ════════════════════════════════════════════════════════════════
   SHARED HELPERS
   ════════════════════════════════════════════════════════════════ */

/**
 * showAdminAlert
 * Displays a temporary status alert inside the admin panel.
 *
 * @param {string} message - Text to display
 * @param {'success'|'error'|'info'} type
 * @param {string} [containerId='adminAlert'] - ID of the alert element
 */
function showAdminAlert(message, type = 'info', containerId = 'adminAlert') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = message;
  el.className = `admin-alert admin-alert-${type} visible`;
  if (type !== 'error') {
    setTimeout(() => el.classList.remove('visible'), 5000);
  }
}

/**
 * formatDate
 * Converts YYYY-MM-DD or a Firestore Timestamp to a readable date.
 *
 * @param {string|{toDate: function}|null} value
 * @returns {string}
 */
function formatAdminDate(value) {
  if (!value) return '—';
  let date;
  if (typeof value === 'string') {
    const [y, m, d] = value.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else if (value.toDate) {
    date = value.toDate(); // Firestore Timestamp
  } else {
    return '—';
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ════════════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════════════ */

/**
 * initDashboard
 * Loads headline statistics and the 10 most recent bookings for display
 * on the admin dashboard page.
 * Called by dashboard.html after auth is confirmed.
 *
 * @param {firebase.User} user - Authenticated admin user
 */
async function initDashboard(user) {
  // Show the admin's display name or email in the header
  const userNameEl = document.getElementById('adminUserName');
  if (userNameEl) userNameEl.textContent = user.displayName || user.email;

  // Load counts in parallel for performance
  try {
    const [roomsSnap, bookingsSnap, pendingSnap] = await Promise.all([
      db.collection('rooms').get(),
      db.collection('bookings').get(),
      db.collection('bookings').where('status', '==', 'pending').get()
    ]);

    // Update stat cards
    setStatCard('statTotalRooms',    roomsSnap.size);
    setStatCard('statTotalBookings', bookingsSnap.size);
    setStatCard('statPending',       pendingSnap.size);

    // Recent bookings – last 10 ordered by createdAt desc
    const recentSnap = await db
      .collection('bookings')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    renderRecentBookings(recentSnap.docs);

  } catch (err) {
    console.error('initDashboard error:', err);
    showAdminAlert('Failed to load dashboard data. Check console for details.', 'error');
  }
}

/**
 * setStatCard
 * Updates the text content of a stat card element.
 *
 * @param {string} id    - Element ID
 * @param {number} value - Numeric value to display
 */
function setStatCard(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * renderRecentBookings
 * Populates the recent-bookings table on the dashboard.
 *
 * @param {firebase.firestore.QueryDocumentSnapshot[]} docs
 */
function renderRecentBookings(docs) {
  const tbody = document.getElementById('recentBookingsBody');
  if (!tbody) return;

  if (docs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">No bookings yet.</td></tr>';
    return;
  }

  tbody.innerHTML = docs.map(doc => {
    const b = doc.data();
    const statusClass = `status-${(b.status || 'pending').toLowerCase()}`;
    return `
      <tr>
        <td data-label="Guest">${escapeHtml(b.name || '—')}</td>
        <td data-label="Room">${escapeHtml(b.room || '—')}</td>
        <td data-label="Check-in">${formatAdminDate(b.checkin)}</td>
        <td data-label="Check-out">${formatAdminDate(b.checkout)}</td>
        <td data-label="Guests">${b.guests || '—'}</td>
        <td data-label="Status"><span class="status-badge ${statusClass}">${b.status || 'pending'}</span></td>
      </tr>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════════════
   ROOMS MANAGEMENT
   ════════════════════════════════════════════════════════════════ */

// Module-level state for the room currently being edited
let _editingRoomId = null;

/**
 * initAdminRooms
 * Entry point for the admin rooms page.
 * Called after auth is confirmed.
 *
 * @param {firebase.User} _user
 */
async function initAdminRooms(_user) {
  await listAdminRooms();

  // Wire up the "Add Room" button
  const addBtn = document.getElementById('addRoomBtn');
  if (addBtn) addBtn.addEventListener('click', () => openRoomModal(null));

  // Wire up the room form submission
  const roomForm = document.getElementById('roomForm');
  if (roomForm) roomForm.addEventListener('submit', saveRoom);

  // Wire up modal close buttons
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', closeRoomModal);
  });
}

/**
 * listAdminRooms
 * Fetches all rooms from Firestore and renders them in the admin table.
 */
async function listAdminRooms() {
  const tbody = document.getElementById('roomsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">Loading…</td></tr>';

  try {
    const snap = await db.collection('rooms').orderBy('price', 'asc').get();

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">No rooms found. Click "Add Room" to get started.</td></tr>';
      return;
    }

    tbody.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      return `
        <tr>
          <td data-label="Name">${escapeHtml(r.name || '—')}</td>
          <td data-label="Price">$${r.price || 0}/night</td>
          <td data-label="Capacity">${r.capacity || '—'} guests</td>
          <td data-label="Available">
            <span class="status-badge ${r.available !== false ? 'status-confirmed' : 'status-cancelled'}">
              ${r.available !== false ? 'Yes' : 'No'}
            </span>
          </td>
          <td data-label="Featured">
            <span class="status-badge ${r.featured ? 'status-confirmed' : 'status-pending'}">
              ${r.featured ? 'Yes' : 'No'}
            </span>
          </td>
          <td data-label="Actions" class="table-actions">
            <button class="btn-sm btn-edit" onclick="openRoomModal('${doc.id}')">Edit</button>
            <button class="btn-sm btn-delete" onclick="deleteRoom('${doc.id}', '${escapeHtml(r.name || '')}')">Delete</button>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('listAdminRooms error:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red;padding:2rem;">Error loading rooms.</td></tr>';
  }
}

/**
 * openRoomModal
 * Opens the add/edit room modal. If a roomId is provided, pre-fills
 * the form with the existing room data for editing.
 *
 * @param {string|null} roomId - Firestore document ID, or null for a new room
 */
async function openRoomModal(roomId) {
  _editingRoomId = roomId;
  const modal = document.getElementById('roomModal');
  const modalTitle = document.getElementById('roomModalTitle');
  const form = document.getElementById('roomForm');

  if (!modal || !form) return;

  // Reset form first
  form.reset();
  document.getElementById('roomImagePreview') && (document.getElementById('roomImagePreview').src = '');

  if (roomId) {
    // Edit mode – load existing data
    modalTitle.textContent = 'Edit Room';
    try {
      const doc = await db.collection('rooms').doc(roomId).get();
      if (doc.exists) {
        const r = doc.data();
        setFormValue('roomName',        r.name        || '');
        setFormValue('roomPrice',       r.price       || '');
        setFormValue('roomCapacity',    r.capacity    || '');
        setFormValue('roomDescription', r.description || '');
        setFormValue('roomImage',       r.image       || '');
        setCheckbox('roomAvailable',    r.available !== false);
        setCheckbox('roomFeatured',     !!r.featured);
        setFormValue('roomAmenities',   (r.amenities || []).join(', '));

        // Show image preview if URL is set
        const preview = document.getElementById('roomImagePreview');
        if (preview && r.image) {
          preview.src = r.image;
          preview.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('openRoomModal load error:', err);
    }
  } else {
    // Add mode
    modalTitle.textContent = 'Add New Room';
    setCheckbox('roomAvailable', true);
  }

  modal.style.display = 'flex';
}

/** Helper: set a form input's value */
function setFormValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

/** Helper: set a checkbox checked state */
function setCheckbox(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = !!checked;
}

/**
 * closeRoomModal
 * Closes the add/edit room modal.
 */
function closeRoomModal() {
  const modal = document.getElementById('roomModal');
  if (modal) modal.style.display = 'none';
  _editingRoomId = null;
}

/**
 * saveRoom
 * Handles the room form submission.
 * Creates a new room document or updates an existing one.
 *
 * @param {Event} e - Form submit event
 */
async function saveRoom(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('saveRoomBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  // Build the room data object from form values
  const roomData = {
    name:        (document.getElementById('roomName')?.value || '').trim(),
    price:       parseFloat(document.getElementById('roomPrice')?.value || 0),
    capacity:    parseInt(document.getElementById('roomCapacity')?.value || 1, 10),
    description: (document.getElementById('roomDescription')?.value || '').trim(),
    image:       (document.getElementById('roomImage')?.value || '').trim(),
    available:   document.getElementById('roomAvailable')?.checked ?? true,
    featured:    document.getElementById('roomFeatured')?.checked ?? false,
    amenities:   (document.getElementById('roomAmenities')?.value || '')
                  .split(',')
                  .map(a => a.trim())
                  .filter(Boolean),
  };

  // Basic client-side validation
  if (!roomData.name || !roomData.price || !roomData.capacity) {
    showAdminAlert('Name, price and capacity are required.', 'error', 'roomFormAlert');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Room'; }
    return;
  }

  try {
    if (_editingRoomId) {
      // Update existing document
      await db.collection('rooms').doc(_editingRoomId).update(roomData);
      showAdminAlert(`Room "${roomData.name}" updated successfully.`, 'success');
    } else {
      // Create new document
      await db.collection('rooms').add(roomData);
      showAdminAlert(`Room "${roomData.name}" added successfully.`, 'success');
    }

    closeRoomModal();
    await listAdminRooms(); // Refresh the table

  } catch (err) {
    console.error('saveRoom error:', err);
    showAdminAlert('Error saving room. Please try again.', 'error', 'roomFormAlert');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Room'; }
  }
}

/**
 * deleteRoom
 * Deletes a room document from Firestore after confirmation.
 *
 * @param {string} roomId   - Firestore document ID
 * @param {string} roomName - Room display name (for the confirmation prompt)
 */
async function deleteRoom(roomId, roomName) {
  if (!confirm(`Are you sure you want to delete "${roomName}"? This cannot be undone.`)) return;

  try {
    await db.collection('rooms').doc(roomId).delete();
    showAdminAlert(`Room "${roomName}" deleted.`, 'success');
    await listAdminRooms();
  } catch (err) {
    console.error('deleteRoom error:', err);
    showAdminAlert('Error deleting room. Please try again.', 'error');
  }
}

/**
 * uploadRoomImage
 * Uploads the selected image file to Firebase Storage and updates the
 * image URL input field with the resulting download URL.
 *
 * Requires firebase-storage-compat.js to be loaded.
 *
 * @param {Event} e - Change event from the file input
 */
async function uploadRoomImage(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showAdminAlert('Please select a valid image file (JPG, PNG, WebP, etc.)', 'error', 'roomFormAlert');
    return;
  }

  const uploadBtn  = document.getElementById('uploadImageBtn');
  const progressEl = document.getElementById('uploadProgress');

  if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.textContent = 'Uploading…'; }
  if (progressEl) { progressEl.style.display = 'block'; progressEl.textContent = 'Uploading…'; }

  try {
    const storageRef = firebase.storage().ref(`rooms/${Date.now()}_${file.name}`);
    const snapshot   = await storageRef.put(file);
    const url        = await snapshot.ref.getDownloadURL();

    // Populate the image URL field
    setFormValue('roomImage', url);

    // Show preview
    const preview = document.getElementById('roomImagePreview');
    if (preview) { preview.src = url; preview.style.display = 'block'; }

    showAdminAlert('Image uploaded successfully.', 'success', 'roomFormAlert');

  } catch (err) {
    console.error('uploadRoomImage error:', err);
    showAdminAlert('Image upload failed. Please try again or paste a URL manually.', 'error', 'roomFormAlert');
  } finally {
    if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.textContent = 'Upload Image'; }
    if (progressEl) progressEl.style.display = 'none';
  }
}

/* ════════════════════════════════════════════════════════════════
   BOOKINGS MANAGEMENT
   ════════════════════════════════════════════════════════════════ */

/**
 * initAdminBookings
 * Entry point for the admin bookings page.
 * Called after auth is confirmed.
 *
 * @param {firebase.User} _user
 */
async function initAdminBookings(_user) {
  await listAdminBookings();

  // Status filter dropdown
  const filterEl = document.getElementById('bookingStatusFilter');
  if (filterEl) {
    filterEl.addEventListener('change', () => listAdminBookings(filterEl.value || null));
  }

  // Close detail modal
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', closeBookingModal);
  });
}

/**
 * listAdminBookings
 * Fetches bookings from Firestore and renders them in the admin table.
 *
 * @param {string|null} [statusFilter=null] - Optional status to filter by
 */
async function listAdminBookings(statusFilter = null) {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">Loading…</td></tr>';

  try {
    let query = db.collection('bookings').orderBy('createdAt', 'desc').limit(100);
    if (statusFilter) {
      query = db.collection('bookings')
        .where('status', '==', statusFilter)
        .orderBy('createdAt', 'desc')
        .limit(100);
    }

    const snap = await query.get();

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">No bookings found.</td></tr>';
      return;
    }

    tbody.innerHTML = snap.docs.map(doc => {
      const b = doc.data();
      const statusClass = `status-${(b.status || 'pending').toLowerCase()}`;
      return `
        <tr>
          <td data-label="Guest">${escapeHtml(b.name || '—')}</td>
          <td data-label="Email">${escapeHtml(b.email || '—')}</td>
          <td data-label="Room">${escapeHtml(b.room || '—')}</td>
          <td data-label="Check-in">${formatAdminDate(b.checkin)}</td>
          <td data-label="Check-out">${formatAdminDate(b.checkout)}</td>
          <td data-label="Guests">${b.guests || '—'}</td>
          <td data-label="Status">
            <span class="status-badge ${statusClass}">${b.status || 'pending'}</span>
          </td>
          <td data-label="Actions" class="table-actions">
            <button class="btn-sm btn-view"   onclick="viewBooking('${doc.id}')">View</button>
            ${b.status !== 'cancelled'
              ? `<button class="btn-sm btn-delete" onclick="cancelBooking('${doc.id}', '${escapeHtml(b.name || '')}')">Cancel</button>`
              : ''}
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('listAdminBookings error:', err);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;padding:2rem;">Error loading bookings.</td></tr>';
  }
}

/**
 * cancelBooking
 * Updates the booking status to "cancelled" in Firestore.
 *
 * @param {string} bookingId  - Firestore document ID
 * @param {string} guestName  - Guest name (for confirmation prompt)
 */
async function cancelBooking(bookingId, guestName) {
  if (!confirm(`Cancel booking for "${guestName}"? This action cannot be undone.`)) return;

  try {
    await db.collection('bookings').doc(bookingId).update({
      status:      'cancelled',
      cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showAdminAlert(`Booking for "${guestName}" has been cancelled.`, 'success');
    // Refresh the table
    const filterEl = document.getElementById('bookingStatusFilter');
    await listAdminBookings(filterEl?.value || null);
  } catch (err) {
    console.error('cancelBooking error:', err);
    showAdminAlert('Error cancelling booking. Please try again.', 'error');
  }
}

/**
 * viewBooking
 * Opens the booking detail modal for the specified booking.
 *
 * @param {string} bookingId - Firestore document ID
 */
async function viewBooking(bookingId) {
  const modal   = document.getElementById('bookingModal');
  const content = document.getElementById('bookingModalContent');
  if (!modal || !content) return;

  content.innerHTML = '<p style="text-align:center;padding:2rem;">Loading…</p>';
  modal.style.display = 'flex';

  try {
    const doc = await db.collection('bookings').doc(bookingId).get();
    if (!doc.exists) {
      content.innerHTML = '<p style="color:red;">Booking not found.</p>';
      return;
    }

    const b = doc.data();
    const statusClass = `status-${(b.status || 'pending').toLowerCase()}`;

    content.innerHTML = `
      <dl class="detail-list">
        <dt>Booking ID</dt>      <dd>${escapeHtml(doc.id)}</dd>
        <dt>Guest Name</dt>      <dd>${escapeHtml(b.name   || '—')}</dd>
        <dt>Email</dt>           <dd>${escapeHtml(b.email  || '—')}</dd>
        <dt>Phone</dt>           <dd>${escapeHtml(b.phone  || '—')}</dd>
        <dt>Room</dt>            <dd>${escapeHtml(b.room   || '—')}</dd>
        <dt>Check-in</dt>        <dd>${formatAdminDate(b.checkin)}</dd>
        <dt>Check-out</dt>       <dd>${formatAdminDate(b.checkout)}</dd>
        <dt>Guests</dt>          <dd>${b.guests || '—'}</dd>
        <dt>Status</dt>          <dd><span class="status-badge ${statusClass}">${b.status || 'pending'}</span></dd>
        <dt>Created</dt>         <dd>${formatAdminDate(b.createdAt)}</dd>
      </dl>
      ${b.status !== 'cancelled'
        ? `<button class="btn btn-danger" style="margin-top:1rem;" onclick="cancelBooking('${doc.id}', '${escapeHtml(b.name || '')}'); closeBookingModal();">Cancel This Booking</button>`
        : ''}`;

  } catch (err) {
    console.error('viewBooking error:', err);
    content.innerHTML = '<p style="color:red;">Error loading booking details.</p>';
  }
}

/**
 * closeBookingModal
 * Closes the booking detail modal.
 */
function closeBookingModal() {
  const modal = document.getElementById('bookingModal');
  if (modal) modal.style.display = 'none';
}

/* ════════════════════════════════════════════════════════════════
   UTILITY
   ════════════════════════════════════════════════════════════════ */

/**
 * escapeHtml
 * Escapes HTML special characters to prevent XSS when inserting
 * user-supplied data into innerHTML.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
