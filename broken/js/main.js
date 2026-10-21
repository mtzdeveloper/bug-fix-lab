"use strict";

/*
 * Demo settings. The page is a personal portfolio project: nothing is sent anywhere.
 * To connect a real backend, set CONTACT_ENDPOINT to a URL that accepts JSON POST.
 */
const CONTACT_ENDPOINT = null;
const SLOT_TIMES = ["09:00", "10:00", "11:00", "12:00", "16:00", "17:00", "18:00", "19:00"];
const DAYS_TO_SHOW = 6;
const CLOSED_WEEKDAY = 5; // Friday (Date.getDay)

const faDigits = (value) => String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const toLatinDigits = (value) =>
  String(value)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

const weekdayFmt = new Intl.DateTimeFormat("fa-IR", { weekday: "long" });
const dayNumFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric" });
const fullDateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long" });

const state = { day: null, slot: null };

/* ---------- Mobile navigation ---------- */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".sr-only").textContent = open ? "بستن منو" : "باز کردن منو";
  };

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
}

/* ---------- Booking widget ---------- */
function upcomingDays() {
  const days = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.length < DAYS_TO_SHOW) {
    if (d.getDay() !== CLOSED_WEEKDAY) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// Deterministic "taken" slots so the demo looks realistic and stays stable between reloads.
function isTaken(date, time) {
  const key = `${date.getFullYear()}${date.getMonth()}${date.getDate()}${time}`;
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % 1000;
  return hash % 3 === 0;
}

function isPast(date, time) {
  const [h, m] = time.split(":").map(Number);
  const t = new Date(date);
  t.setHours(h, m, 0, 0);
  return t.getTime() < Date.now() + 60 * 60 * 1000; // at least one hour ahead
}

function makeRadio(className, label, checked, onSelect) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.setAttribute("role", "radio");
  btn.setAttribute("aria-checked", String(checked));
  btn.tabIndex = checked ? 0 : -1;
  btn.innerHTML = label;
  btn.addEventListener("click", onSelect);
  return btn;
}

// Arrow-key navigation inside a radiogroup (RTL aware)
function enableArrowKeys(group) {
  group.addEventListener("keydown", (e) => {
    const keys = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    const items = [...group.querySelectorAll('[role="radio"]:not(:disabled)')];
    const i = items.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    const next = items[(i + keys[e.key] + items.length) % items.length];
    next.focus();
    next.click();
  });
}

function renderDays(days) {
  const wrap = document.getElementById("days");
  wrap.replaceChildren(
    ...days.map((date) =>
      makeRadio(
        "day",
        `<small>${weekdayFmt.format(date)}</small><b>${dayNumFmt.format(date)}</b>`,
        state.day && date.getTime() === state.day.getTime(),
        () => {
          state.day = date;
          state.slot = firstFreeSlot(date);
          renderDays(days);
          renderSlots();
        }
      )
    )
  );
}

function firstFreeSlot(date) {
  return SLOT_TIMES.find((t) => !isTaken(date, t) && !isPast(date, t)) || null;
}

function renderSlots() {
  const wrap = document.getElementById("slots");
  wrap.replaceChildren(
    ...SLOT_TIMES.map((time) => {
      const btn = makeRadio("slot", faDigits(time), time === state.slot, () => {
        state.slot = time;
        renderSlots();
      });
      if (isTaken(state.day, time) || isPast(state.day, time)) {
        btn.disabled = true;
        btn.setAttribute("aria-label", `${faDigits(time)}، پر شده`);
      }
      return btn;
    })
  );
  updateSummary();
}

function slotText() {
  if (!state.day || !state.slot) return "";
  return `${fullDateFmt.format(state.day)}، ساعت ${faDigits(state.slot)}`;
}

function updateSummary() {
  const summary = document.getElementById("booking-summary");
  const text = slotText();
  summary.textContent = text ? `انتخاب شما: ${text}` : "برای این روز زمان خالی نمانده؛ روز دیگری را انتخاب کنید.";
  summary.classList.toggle("has-slot", Boolean(text));
}

function initBooking() {
  const days = upcomingDays();
  state.day = days.find((d) => firstFreeSlot(d)) || days[0];
  state.slot = firstFreeSlot(state.day);
  renderDays(days);
  renderSlots();
  enableArrowKeys(document.getElementById("days"));
  enableArrowKeys(document.getElementById("slots"));
}

/* ---------- Modal ---------- */
let lastFocus = null;

function openModal() {
  const modal = document.getElementById("booking-modal");
  const text = slotText();
  if (!text) {
    document.getElementById("booking-summary").focus?.();
    return;
  }
  lastFocus = document.activeElement;
  document.getElementById("modal-slot").textContent = text;
  document.getElementById("booking-done").hidden = true;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  document.getElementById("b-name").focus();
}

function closeModal() {
  const modal = document.getElementById("booking-modal");
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  if (lastFocus) lastFocus.focus();
}

function trapFocus(e) {
  const modal = document.getElementById("booking-modal");
  if (modal.hidden || e.key !== "Tab") return;
  const focusable = [...modal.querySelectorAll("button, input, [href]")].filter((el) => !el.disabled && el.offsetParent);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function initModal() {
  document.getElementById("open-booking").addEventListener("click", openModal);
  document.getElementById("booking-modal").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
    trapFocus(e);
  });
}

/* ---------- Form helpers ---------- */
function setError(input, errorEl, message) {
  const invalid = Boolean(message);
  input.setAttribute("aria-invalid", String(invalid));
  if (invalid) {
    errorEl.textContent = message;
    input.setAttribute("aria-describedby", errorEl.id);
  } else {
    input.removeAttribute("aria-describedby");
  }
  errorEl.hidden = !invalid;
  return !invalid;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function send(payload) {
  if (!CONTACT_ENDPOINT) {
    await new Promise((r) => setTimeout(r, 500)); // demo mode
    return true;
  }
  const res = await fetch(CONTACT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  const name = form.querySelector("#name");
  const email = form.querySelector("#email");
  const message = form.querySelector("#message");
  const success = form.querySelector('[data-test="success"]');
  const fail = form.querySelector("#form-fail");
  const button = form.querySelector('[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    success.hidden = true;
    fail.hidden = true;

    const okName = setError(name, document.getElementById("error-name"), name.value.trim() ? "" : "نام خود را بنویسید.");
    const okEmail = setError(
      email,
      document.getElementById("error-email"),
      EMAIL_RE.test(email.value.trim()) ? "" : "یک ایمیل معتبر بنویسید، مثل name@example.com"
    );
    const okMsg = setError(message, document.getElementById("error-message"), message.value.trim() ? "" : "متن پیام را بنویسید.");

    if (!okName && !okEmail && !okMsg) {
      form.querySelector('[aria-invalid="true"]').focus();
      return;
    }

    button.disabled = true;
    button.textContent = "در حال ارسال…";
    try {
      const ok = await send({ name: name.value.trim(), email: email.value.trim(), message: message.value.trim() });
      if (ok) {
        form.reset();
        success.hidden = false;
      } else {
        fail.hidden = false;
      }
    } catch {
      fail.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = "ارسال پیام";
    }
  });
}

function initBookingForm() {
  const form = document.getElementById("booking-form");
  const name = form.querySelector("#b-name");
  const phone = form.querySelector("#b-phone");
  const done = form.querySelector("#booking-done");
  const button = form.querySelector('[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phoneValue = toLatinDigits(phone.value).replace(/[\s-]/g, "");
    const okName = setError(name, document.getElementById("error-b-name"), name.value.trim() ? "" : "نام خود را بنویسید.");
    const okPhone = setError(
      phone,
      document.getElementById("error-b-phone"),
      /^09\d{9}$/.test(phoneValue) ? "" : "شماره موبایل ۱۱ رقمی که با ۰۹ شروع می‌شود بنویسید."
    );
    if (!(okName && okPhone)) {
      form.querySelector('[aria-invalid="true"]').focus();
      return;
    }

    button.disabled = true;
    await send({ name: name.value.trim(), phone: phoneValue, slot: slotText() });
    button.disabled = false;
    done.textContent = `درخواست نوبت ${slotText()} ثبت شد. پذیرش برای تأیید با شما تماس می‌گیرد.`;
    done.hidden = false;
    form.reset();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initBooking();
  initModal();
  initContactForm();
  initBookingForm();
});

// Run nav setup as early as possible
initNav();
