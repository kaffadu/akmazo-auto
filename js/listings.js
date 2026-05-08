// ===== AKMAZO - LIVE LISTINGS FROM RENDER API =====
const API_URL = 'https://akmazo-auto-web-backend.onrender.com/api/listings';

function buildCard(car, index) {
  const delays = ['', 'fade-in-delay-1', 'fade-in-delay-2', 'fade-in-delay-3'];
  const delay  = delays[index % 4];
  const source = (car.source || 'IAA').toUpperCase();
  const cta    = source === 'IAA' ? 'View on IAA →' : 'View on Copart →';

  return `
    <a class="car-card fade-in ${delay}" href="${car.listing_url || '#'}" target="_blank" rel="noopener noreferrer">
      <div class="car-image">
        <img src="${car.image_url}" alt="${car.make} ${car.model}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80'" />
        ${car.badge ? `<div class="car-badge">${car.badge}</div>` : ''}
        <div class="car-source">${source}</div>
      </div>
      <div class="car-body">
        <div class="car-make">${car.make}</div>
        <div class="car-name">${car.model} ${car.year || ''}</div>
        <div class="car-specs">
          ${car.engine   ? `<div class="car-spec"><span class="spec-label">Engine</span><span class="spec-value">${car.engine}</span></div>` : ''}
          ${car.drive    ? `<div class="car-spec"><span class="spec-label">Drive</span><span class="spec-value">${car.drive}</span></div>` : ''}
          ${car.condition? `<div class="car-spec"><span class="spec-label">Condition</span><span class="spec-value">${car.condition}</span></div>` : ''}
        </div>
        <div class="car-footer">
          <div class="car-price">${car.price ? '$' + Number(car.price).toLocaleString() : 'Contact Us'} <span>Buy Now™</span></div>
          <div class="car-cta">${cta}</div>
        </div>
      </div>
    </a>`;
}

// ===== HERO SLIDESHOW =====
function startHeroSlideshow(cars) {
  const heroImg  = document.querySelector('.hero-car-image img');
  const heroLink = document.querySelector('.hero-car-image');
  const tagLabel = document.querySelector('.car-tag span');
  const tagName  = document.querySelector('.car-tag strong');

  if (!heroImg) return;

  // Keep the original yellow car as the first slide
  const original = {
    image_url:   heroImg.src,
    make:        'Toyota',
    model:       'Land Cruiser',
    year:        '',
    source:      'Featured',
    badge:       'Featured Import',
    listing_url: null
  };

  // Combine original + hot deal cars that have images
  const slides = [original, ...cars.filter(c => c.image_url)];
  if (slides.length < 2) return;

  let current = 0;

  function goTo(index) {
    const car = slides[index];

    // Fade out
    heroImg.style.transition = 'opacity 0.5s ease';
    heroImg.style.opacity    = '0';

    setTimeout(() => {
      heroImg.src = car.image_url;
      heroImg.alt = `${car.make} ${car.model}`;

      if (tagLabel) tagLabel.textContent = `${car.source || 'IAA'} · ${car.badge || 'Hot Deal'}`;
      if (tagName)  tagName.textContent  = `${car.year || ''} ${car.make} ${car.model}`;

      // Update link to listing
      if (heroLink && car.listing_url) {
        heroLink.style.cursor = 'pointer';
        heroLink.onclick = () => window.open(car.listing_url, '_blank', 'noopener,noreferrer');
      }

      // Fade in
      heroImg.style.opacity = '1';
    }, 500);
  }

  // Start immediately with first listing
  goTo(0);

  // Cycle every 4 seconds
  setInterval(() => {
    current = (current + 1) % slides.length;
    goTo(current);
  }, 4000);
}

// ===== LOAD LISTINGS =====
async function loadListings() {
  const grid = document.getElementById('listingsGrid');
  if (!grid) return;

  try {
    const res  = await fetch(API_URL);
    const cars = await res.json();

    if (!cars.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#8A92A8;">
          <div style="font-size:32px;margin-bottom:12px;">🚗</div>
          <p>New inventory coming soon. <a href="https://wa.me/233240247106" style="color:#F5A623;">WhatsApp us</a> for available vehicles.</p>
        </div>`;
      return;
    }

    grid.innerHTML = cars.map((car, i) => buildCard(car, i)).join('');
    grid.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // Start hero slideshow with the loaded cars
    startHeroSlideshow(cars);

  } catch {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#8A92A8;">
        <div style="font-size:32px;margin-bottom:12px;">🚗</div>
        <p>Unable to load inventory. <a href="https://wa.me/233240247106" style="color:#F5A623;">WhatsApp us</a> for available vehicles.</p>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadListings);
