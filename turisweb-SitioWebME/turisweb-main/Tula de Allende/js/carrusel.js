document.addEventListener("DOMContentLoaded", function () {
  const slideContainer = document.querySelector(".carousel-slide");
  const images = document.querySelectorAll(".carousel-slide img");
  let index = 0;

  function nextSlide() {
    index++;
    if (index >= images.length) index = 0;
    slideContainer.style.transform = `translateX(-${index * 100}%)`;
  }

  setInterval(nextSlide, 3000);
});