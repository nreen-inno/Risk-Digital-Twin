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

document.querySelector("#year").textContent = String(new Date().getFullYear());

const form = document.querySelector("#pilot-form");
const status = document.querySelector("#form-status");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
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
