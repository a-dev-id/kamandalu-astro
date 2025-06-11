import Splide from "@splidejs/splide";

document.addEventListener("DOMContentLoaded", () => {
  const splide = new Splide("#card-carousel", {
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

  // ✅ Link bottom buttons to the slider
  document.getElementById("custom-prev").addEventListener("click", () => splide.go("<"));
  document.getElementById("custom-next").addEventListener("click", () => splide.go(">"));
});
