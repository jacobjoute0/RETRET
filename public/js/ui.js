/**
 * ui.js
 * ──────────────────────────────────────────────────────────────────
 * Shared UI helper module for the RETRET Hotel website.
 *
 * Responsibilities:
 *   - Dynamic component loading: fetches navbar.html and footer.html
 *     and injects them into their placeholder <div>s on DOMContentLoaded.
 *   - Navbar scroll behaviour: adds 'scrolled' class when window.scrollY > 50.
 *     Interior pages (not home) always show the solid navbar immediately.
 *   - Mobile nav toggle: hamburger open/close with aria-expanded.
 *   - Scroll-to-top button: show/hide at scrollY > 400, smooth scroll on click.
 *   - Active nav link: reads <body data-page="…"> and highlights the
 *     matching link after the navbar component is injected.
 *
 * Load order: add <script src="js/ui.js"></script> on every HTML page
 * AFTER any page-specific scripts (e.g., firebase-config.js, rooms.js).
 * ──────────────────────────────────────────────────────────────────
 */

/* ── Component Loader ────────────────────────────────────────────── */

/**
 * loadComponent
 * Fetches an HTML partial from `url` and injects its content into the
 * first element matching `selector`.
 *
 * @param {string} selector - CSS selector for the placeholder element
 * @param {string} url      - Relative URL of the HTML partial to fetch
 * @returns {Promise<void>}
 */
async function loadComponent(selector, url) {
  const placeholder = document.querySelector(selector);
  if (!placeholder) return; // Placeholder not present on this page – skip

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – could not load ${url}`);
    }
    placeholder.innerHTML = await response.text();
  } catch (err) {
    // Log warning but don't crash the page – navigation still works without the component
    console.warn('ui.js: component load failed:', err.message);
  }
}

/* ── Navbar Scroll Behaviour ─────────────────────────────────────── */

/**
 * initNavbarScroll
 * Adds the 'scrolled' class to the navbar when the page is scrolled past
 * 50 px. On interior pages (any page other than "home") the navbar is
 * immediately set to scrolled so it always displays the solid background.
 */
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const page = document.body.dataset.page;

  // Interior pages always show the solid navbar style
  if (page && page !== 'home') {
    navbar.classList.add('scrolled');
  }

  // Update on scroll for all pages
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

/* ── Mobile Nav Toggle ───────────────────────────────────────────── */

/**
 * initMobileNav
 * Wires up the hamburger toggle button for the mobile navigation menu.
 * Toggles the 'open' class on both the button and the nav list, and
 * updates aria-expanded for accessibility.
 */
function initMobileNav() {
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');
  if (!navToggle || !navLinks) return;

  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

/* ── Scroll-to-top Button ────────────────────────────────────────── */

/**
 * initScrollToTop
 * Shows the scroll-to-top button once the user scrolls past 400 px.
 * Clicking the button smooth-scrolls back to the top of the page.
 */
function initScrollToTop() {
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (!scrollTopBtn) return;

  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── Active Nav Link ─────────────────────────────────────────────── */

/**
 * setActiveNavLink
 * Reads the data-page attribute from <body> and adds the 'active' class
 * plus aria-current="page" to the matching nav link.
 * Must be called AFTER the navbar component has been injected.
 */
function setActiveNavLink() {
  const page = document.body.dataset.page;
  if (!page) return;

  // Select all nav links that carry a data-page attribute
  const links = document.querySelectorAll('.nav-links a[data-page]');
  links.forEach(link => {
    if (link.dataset.page === page) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* ── DOMContentLoaded – Bootstrap ───────────────────────────────── */

/**
 * On DOM ready:
 *   1. Load the navbar and footer HTML partials into their placeholders.
 *   2. Highlight the active nav link for the current page.
 *   3. Initialise scroll, mobile-nav, and scroll-to-top handlers.
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Inject reusable components into their placeholders
  await loadComponent('#navbar-placeholder', 'components/navbar.html');
  await loadComponent('#footer-placeholder', 'components/footer.html');

  // Set active state on the correct nav link
  setActiveNavLink();

  // Wire up shared UI interactions
  initNavbarScroll();
  initMobileNav();
  initScrollToTop();
});
