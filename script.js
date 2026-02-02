/* ================================
   CONFIGURAÇÕES QUE VOCÊ PODE EDITAR
=================================== */

// Data de início do relacionamento (AAAA-MM-DD HH:MM)
const START_DATE = "2025-07-17 00:00"; // 17/07/2025 às 00:00

// Nome para a capa
const PARTNER_NAME = "Sabrina";

/* ================================
   LÓGICA DO SITE
=================================== */

document.addEventListener("DOMContentLoaded", () => {
  applySavedTheme();
  updateHeroName();
  setupRevealOnScroll();
  setupLightbox();
  startLoveTimer();
  setupThemeToggle();
});

/* Tema claro/escuro */
function setupThemeToggle(){
  const toggle = document.getElementById("themeToggle");
  const icon = document.getElementById("themeIcon");
  if(!toggle || !icon) return;

  toggle.addEventListener("click", () => {
    const isLight = document.documentElement.classList.toggle("light");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    icon.textContent = isLight ? "🌞" : "🌙";
  });
}

function applySavedTheme(){
  const saved = localStorage.getItem("theme");
  const icon = document.getElementById("themeIcon");

  if(saved === "light"){
    document.documentElement.classList.add("light");
    if(icon) icon.textContent = "🌞";
  } else {
    if(icon) icon.textContent = "🌙";
  }
}

/* Nome da capa */
function updateHeroName(){
  const el = document.getElementById("partnerName");
  if(el && PARTNER_NAME) el.textContent = PARTNER_NAME;
}

/* Reveal on scroll */
function setupRevealOnScroll(){
  const items = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.classList.add("revealed");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  items.forEach(i => io.observe(i));
}

/* Lightbox */
function setupLightbox(){
  const buttons = document.querySelectorAll("[data-lightbox]");
  const modal = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  const closeBtn = document.getElementById("lightboxClose");

  if(!modal || !img || !closeBtn) return;

  function close(){
    modal.setAttribute("aria-hidden", "true");
    img.src = "";
    document.body.classList.remove("no-scroll");
    closeBtn.blur();
  }

  function open(src){
    img.src = src;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    closeBtn.focus();
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => open(btn.dataset.lightbox));
  });

  closeBtn.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    if(e.target === modal) close();
  });

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") close();
  });
}

/* Contador de tempo juntos */
function startLoveTimer(){
  const start = parseDateLocal(START_DATE);

  const els = {
    years: document.getElementById("years"),
    months: document.getElementById("months"),
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds"),
  };

  // Debug rápido (opcional): veja no console se a data está correta
  // console.log("START_DATE parsed:", start.toString());

  function tick(){
    const now = new Date();
    const diff = diffPartsIncremental(start, now);

    if(els.years) els.years.textContent = diff.years;
    if(els.months) els.months.textContent = diff.months;
    if(els.days) els.days.textContent = diff.days;
    if(els.hours) els.hours.textContent = String(diff.hours).padStart(2, "0");
    if(els.minutes) els.minutes.textContent = String(diff.minutes).padStart(2, "0");
    if(els.seconds) els.seconds.textContent = String(diff.seconds).padStart(2, "0");
  }

  tick();
  setInterval(tick, 1000);
}

/* Diferença robusta: soma anos e meses sem estourar */
function diffPartsIncremental(start, end){
  if(!(start instanceof Date) || isNaN(start)) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  // Se por algum motivo start > end, zera (ou você pode inverter, se quiser)
  if(start > end){
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  let cursor = new Date(start);
  let years = 0;
  let months = 0;

  // Anos
  while (true){
    const next = new Date(cursor);
    next.setFullYear(next.getFullYear() + 1);
    if(next <= end){
      cursor = next;
      years++;
    } else break;
  }

  // Meses
  while (true){
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    if(next <= end){
      cursor = next;
      months++;
    } else break;
  }

  // Resto em ms
  let ms = end - cursor;

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;

  const days = Math.floor(ms / dayMs); ms -= days * dayMs;
  const hours = Math.floor(ms / hourMs); ms -= hours * hourMs;
  const minutes = Math.floor(ms / minuteMs); ms -= minutes * minuteMs;
  const seconds = Math.floor(ms / 1000);

  return { years, months, days, hours, minutes, seconds };
}

/* Parse data local “AAAA-MM-DD HH:MM” */
function parseDateLocal(str){
  const [datePart, timePart] = str.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);

  let hh = 0, mm = 0;
  if(timePart){
    [hh, mm] = timePart.split(":").map(Number);
  }

  return new Date(y, (m-1), d, hh || 0, mm || 0, 0);
}
