import Splide from "@splidejs/splide";

const carousels = [
  {
    id: "#venue-carousel",
    prev: "venue-prev",
    next: "venue-next",
    options: {
      type: "slide",
      perPage: 2,
      gap: "4rem",
      speed: 800,
      easing: "ease-in-out",
      arrows: false,
      pagination: false,
      breakpoints: {
        1366: { gap: "2rem" },
        1024: { gap: "2rem", perPage: 2 },
        768: { perPage: 1, gap: "2rem" },
        640: { perPage: 1 },
      },
    },
  },
  {
    id: "#wellness-carousel",
    prev: "wellness-prev",
    next: "wellness-next",
    options: {
      type: "slide",
      perPage: 3,
      gap: "4rem",
      speed: 800,
      easing: "ease-in-out",
      arrows: false,
      pagination: false,
      breakpoints: {
        1366: { gap: "2rem" },
        1024: { gap: "2rem", perPage: 2 },
        768: { perPage: 1, gap: "2rem" },
        640: { perPage: 1 },
      },
    },
  },
];

window.addEventListener("DOMContentLoaded", () => {
  carousels.forEach(({ id, prev, next, options }) => {
    const el = document.querySelector(id);
    if (!el) return;
    const splide = new Splide(el, options);
    splide.on("mounted move", () => {
      const prevBtn = document.getElementById(prev),
        nextBtn = document.getElementById(next);
      if (prevBtn) {
        prevBtn.disabled = splide.index === 0;
        prevBtn.classList.toggle("opacity-30", splide.index === 0);
        prevBtn.classList.toggle("cursor-not-allowed", splide.index === 0);
      }
      if (nextBtn) {
        nextBtn.disabled = splide.index >= splide.length - splide.options.perPage;
        nextBtn.classList.toggle("opacity-30", splide.index >= splide.length - splide.options.perPage);
        nextBtn.classList.toggle("cursor-not-allowed", splide.index >= splide.length - splide.options.perPage);
      }
    });
    splide.mount();
    const prevBtn = document.getElementById(prev);
    const nextBtn = document.getElementById(next);
    if (prevBtn) prevBtn.onclick = () => splide.go("<");
    if (nextBtn) nextBtn.onclick = () => splide.go(">");
  });
});
