// Navigation toggle for mobile
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

// Billing toggle (monthly/yearly)
const monthlyBtn = document.getElementById('monthlyBtn');
const yearlyBtn = document.getElementById('yearlyBtn');
const priceElements = document.querySelectorAll('.price');
if (monthlyBtn && yearlyBtn && priceElements.length) {
  const setActive = (activeBtn, inactiveBtn) => {
    activeBtn.classList.add('active');
    inactiveBtn.classList.remove('active');
  };
  const updatePrices = (period) => {
    priceElements.forEach((el) => {
      const monthly = el.getAttribute('data-monthly');
      const yearly = el.getAttribute('data-yearly');
      el.textContent = period === 'monthly' ? monthly : yearly;
    });
  };
  monthlyBtn.addEventListener('click', () => {
    setActive(monthlyBtn, yearlyBtn);
    updatePrices('monthly');
  });
  yearlyBtn.addEventListener('click', () => {
    setActive(yearlyBtn, monthlyBtn);
    updatePrices('yearly');
  });
}

// Simple scroll reveal animations
const animateOnScroll = () => {
  const elements = document.querySelectorAll('.animate');
  const windowHeight = window.innerHeight;
  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= windowHeight * 0.85) {
      el.classList.add('visible');
    }
  });
};
window.addEventListener('scroll', animateOnScroll);
window.addEventListener('load', animateOnScroll);
