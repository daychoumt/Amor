/* ================================
   CONFIGURAÇÕES QUE VOCÊ PODE EDITAR
=================================== */

// Data de início do relacionamento (AAAA-MM-DD HH:MM)
const START_DATE = "2025-08-31 20:00"; // data correta

// Nome para o título (opcional)
const PARTNER_NAME = "Sabrina"; // aparece na capa

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
  if(saved === "light"){
    document.documentElement.classList.add("light");
    const icon = document.getElementById("themeIcon");
    if(icon) icon.textContent = "🌞";
  }
}

/* Nome da capa */
function updateHeroName(){
  const el = document.querySelector(".hero-text h1");
  if(el && PARTNER_NAME){
    el.innerHTML = el.innerHTML.replace("Amor da Minha Vida", escapeHtml(PARTNER_NAME));
  }
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

/* Lightbox simples */
function setupLightbox(){
  const buttons = document.querySelectorAll("[data-lightbox]");
  const modal = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  const closeBtn = document.getElementById("lightboxClose");

  function close(){
    modal.setAttribute("aria-hidden", "true");
    img.src = "";
  }
  function open(src){
    img.src = src;
    modal.setAttribute("aria-hidden", "false");
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => open(btn.dataset.lightbox));
  });
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if(e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") close();
  });
}

/* Contador de tempo juntos */
function startLoveTimer(){
  const start = parseDateLocal(START_DATE);
  const ids = ["years","months","days","hours","minutes","seconds"];
  const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

  function tick(){
    const now = new Date();
    const diff = diffYMDHMS(start, now);
    if(!diff) return;

    els.years.textContent   = diff.years;
    els.months.textContent  = diff.months;
    els.days.textContent    = diff.days;
    els.hours.textContent   = String(diff.hours).padStart(2, "0");
    els.minutes.textContent = String(diff.minutes).padStart(2, "0");
    els.seconds.textContent = String(diff.seconds).padStart(2, "0");
  }
  tick();
  setInterval(tick, 1000);
}

/* Utilitário: diferença detalhada entre datas */
function diffYMDHMS(start, end){
  if(!(start instanceof Date) || isNaN(start)) return null;

  let a = new Date(start), b = new Date(end);

  let years = b.getFullYear() - a.getFullYear();
  let aTest = new Date(a); aTest.setFullYear(a.getFullYear() + years);
  if(aTest > b){ years--; aTest.setFullYear(a.getFullYear() + years); }

  let months = b.getMonth() - aTest.getMonth();
  if(months < 0){ years--; months += 12; aTest.setFullYear(aTest.getFullYear() - 1); }
  let mTest = new Date(aTest); mTest.setMonth(aTest.getMonth() + months);
  if(mTest > b){ months--; mTest.setMonth(aTest.getMonth() + months); }

  let days = Math.floor((b - mTest) / (1000*60*60*24));
  let dTest = new Date(mTest.getTime() + days*24*60*60*1000);

  let rem = b - dTest;
  let hours = Math.floor(rem / (1000*60*60)); rem -= hours*(1000*60*60);
  let minutes = Math.floor(rem / (1000*60)); rem -= minutes*(1000*60);
  let seconds = Math.floor(rem / 1000);

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
  return new Date(y, (m-1), d, hh||0, mm||0, 0);
}

/* Escapar HTML básico */
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
