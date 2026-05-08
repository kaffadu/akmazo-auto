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
  const tagLabel = document.querySelector('.car-tag span');
  const tagName  = document.querySelector('.car-tag strong');
  const heroCard = document.querySelector('.hero-car-image');

  if (!heroImg) return;

  // Slide 0 = yellow Mercedes (the existing hero image)
  const slides = [
    {
      image_url:   heroImg.getAttribute('src'),
      make:        'Mercedes AMG GT',
      model:       '',
      year:        '',
      badge:       'Featured Import',
      listing_url: null
    },
    ...cars.filter(c => c.image_url)
  ];

  if (slides.length < 2) return;

  // Make sure hero image transitions smoothly
  heroImg.style.transition = 'opacity 0.6s ease';

  let current = 0;
  let busy    = false;

  function goTo(index) {
    if (busy) return;
    busy = true;

    const car = slides[index];

    // Step 1 — fade out
    heroImg.style.opacity = '0';

    setTimeout(() => {
      // Step 2 — swap content
      heroImg.src = car.image_url;
      heroImg.alt = `${car.make} ${car.model}`;

      if (tagLabel) tagLabel.textContent = car.badge || 'Hot Deal';
      if (tagName)  tagName.textContent  = [car.year, car.make, car.model].filter(Boolean).join(' ');

      if (heroCard) {
        if (car.listing_url) {
          heroCard.style.cursor = 'pointer';
          heroCard.onclick = () => window.open(car.listing_url, '_blank', 'noopener,noreferrer');
        } else {
          heroCard.style.cursor = 'default';
          heroCard.onclick = null;
        }
      }

      // Step 3 — fade in
      heroImg.style.opacity = '1';

      setTimeout(() => { busy = false; }, 700);
    }, 650);
  }

  // Wait 4s then start cycling from slide 1 (hot deals)
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

    if (typeof observer !== 'undefined') {
      grid.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    }

    startHeroSlideshow(cars);

  } catch (err) {
    console.error('Listings error:', err);
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#8A92A8;">
        <div style="font-size:32px;margin-bottom:12px;">🚗</div>
        <p>Unable to load inventory. <a href="https://wa.me/233240247106" style="color:#F5A623;">WhatsApp us</a> for available vehicles.</p>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadListings);
