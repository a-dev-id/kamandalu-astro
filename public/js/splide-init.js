import Splide from "@splidejs/splide";

document.addEventListener("DOMContentLoaded", () => {
  const carousel = document.getElementById("card-carousel");

  if (!carousel) {
    console.warn("Splide: #card-carousel not found");
    return;
  }

  const splide = new Splide(carousel, {
    type: "loop",
    perPage: 2,
    gap: "4rem",
    speed: 800,
    easing: "ease-in-out",
    arrows: false,
    pagination: false,
    breakpoints: {
      768: {
        perPage: 1,
      },
    },
  });

  splide.mount();

  // Optional: guard against missing custom arrows
  const prevBtn = document.getElementById("custom-prev");
  const nextBtn = document.getElementById("custom-next");

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => splide.go("<"));
    nextBtn.addEventListener("click", () => splide.go(">"));
  }
});
