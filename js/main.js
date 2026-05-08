// ===== AKMAZO AUTO SOLUTIONS - MAIN JS =====

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// Mobile nav
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
const mobileClose = document.getElementById('mobileClose');

hamburger?.addEventListener('click', () => mobileNav.classList.add('open'));
mobileClose?.addEventListener('click', () => mobileNav.classList.remove('open'));
mobileNav?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileNav.classList.remove('open'));
});

// Intersection Observer for animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Animated counter
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;

  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      el.textContent = target.toLocaleString() + suffix;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current).toLocaleString() + suffix;
    }
  }, 16);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('[data-target]').forEach(animateCounter);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.hero-stats').forEach(el => counterObserver.observe(el));

// Contact form handler
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = contactForm.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.textContent = 'Sending...';
  btn.disabled = true;

  try {
    const data = new FormData(contactForm);
    data.append('access_key', 'e18b4aa7-f29e-41c5-a80c-2b52b2a6b509');

    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' }
    });

    const json = await res.json();

    if (json.success) {
      btn.textContent = '✓ Message Sent!';
      btn.style.background = '#25D366';
      contactForm.reset();
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
        btn.style.background = '';
      }, 3000);
    } else {
      throw new Error('Failed');
    }
  } catch {
    btn.textContent = '✗ Failed — try WhatsApp';
    btn.style.background = '#e53e3e';
    btn.disabled = false;
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
    }, 4000);
  }
});
