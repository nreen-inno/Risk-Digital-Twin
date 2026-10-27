const EMAIL = "hello@riskdigitaltwin.com";

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");

toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });
});

const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Hero carousel: crossfades through the four questions, auto-advancing, with
// dots to jump. Pauses on hover/focus and respects reduced-motion.
const heroCarousel = document.querySelector(".hero-carousel");
if (heroCarousel) {
  const heroSlides = Array.from(heroCarousel.querySelectorAll(".hero-slide"));
  const heroDots = Array.from(document.querySelectorAll(".hero-dot"));
  const heroRoot = document.querySelector(".hero");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) heroCarousel.classList.add("anim");
  const SLIDE_MS = 5500;
  let current = 0;
  let heroTimer = null;

  const showSlide = (n) => {
    current = (n + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((s, k) => {
      const on = k === current;
      s.classList.toggle("is-active", on);
      s.setAttribute("aria-hidden", on ? "false" : "true");
    });
    heroDots.forEach((d, k) => {
      d.classList.toggle("is-active", k === current);
      d.setAttribute("aria-selected", k === current ? "true" : "false");
    });
  };
  const stopHero = () => { if (heroTimer) { clearInterval(heroTimer); heroTimer = null; } };
  const startHero = () => {
    if (reduceMotion || heroSlides.length < 2) return;
    stopHero();
    heroTimer = setInterval(() => showSlide(current + 1), SLIDE_MS);
  };

  heroDots.forEach((d, k) => d.addEventListener("click", () => { showSlide(k); startHero(); }));
  if (heroRoot) {
    heroRoot.addEventListener("mouseenter", stopHero);
    heroRoot.addEventListener("mouseleave", startHero);
    heroRoot.addEventListener("focusin", stopHero);
    heroRoot.addEventListener("focusout", startHero);
  }
  showSlide(0);
  startHero();
}

// Controllable film: the video stays silent and paused until the visitor
// presses Play (so there is no autoplay and sound starts on their click).
// Restart replays from the beginning; the branded poster returns when it ends.
const filmPlayer = document.querySelector("#film-player");
const filmVideo = document.querySelector("#film-video");
if (filmPlayer && filmVideo) {
  const playFilm = () => {
    if (filmVideo.ended) filmVideo.currentTime = 0;
    filmPlayer.classList.add("playing");
    filmVideo.play();
  };
  const restartFilm = () => {
    filmVideo.currentTime = 0;
    filmPlayer.classList.add("playing");
    filmVideo.play();
  };
  const playBtn = document.querySelector("#film-play");
  const restartBtn = document.querySelector("#film-restart");
  if (playBtn) playBtn.addEventListener("click", playFilm);
  if (restartBtn) restartBtn.addEventListener("click", restartFilm);
  filmVideo.addEventListener("ended", () => filmPlayer.classList.remove("playing"));
}

const form = document.querySelector("#pilot-form");
const status = document.querySelector("#form-status");
const endpoint = form ? form.getAttribute("action") || "" : "";
const endpointReady = endpoint && !/REPLACE_WITH_YOUR_ID/.test(endpoint);

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);

    // When a real form endpoint is configured (Formspree / Netlify), POST to it.
    // Works on any static host and captures the lead reliably.
    if (endpointReady) {
      try {
        status.textContent = "Sending…";
        const res = await fetch(endpoint, {
          method: "POST",
          body: data,
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          form.reset();
          status.textContent = "Thank you — we’ll be in touch about a pilot conversation.";
        } else {
          status.textContent = `Something went wrong. Please email us directly at ${EMAIL}.`;
        }
      } catch (err) {
        status.textContent = `Something went wrong. Please email us directly at ${EMAIL}.`;
      }
      return;
    }

    // Fallback until a form endpoint is set: open the visitor’s email app.
    const lines = [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Company: ${data.get("company")}`,
      `Watch first: ${data.get("watch")}`,
      "",
      String(data.get("note") || "").trim(),
    ];
    const href =
      `mailto:${EMAIL}?subject=${encodeURIComponent("Risk Digital Twin pilot")}` +
      `&body=${encodeURIComponent(lines.join("\n"))}`;
    status.textContent = `Opening a draft to ${EMAIL}. If nothing opens, email us directly.`;
    window.location.href = href;
  });
}
