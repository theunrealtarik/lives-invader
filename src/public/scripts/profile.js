// tabs
const container = document.getElementById("container");
const tabs = document.getElementsByClassName("tab");
const tabsContent = document.getElementsByClassName("tab-content");

if (tabs.length > 0) {
  let selected = tabs[0].id;

  for (const content of tabsContent) {
    if (content.id != selected) {
      content.setAttribute("hidden", true);
    }
  }

  for (const tab of tabs) {
    tab.addEventListener("click", (e) => {
      for (const content of tabsContent) {
        if (tab.id != content.id) {
          content.setAttribute("hidden", true);
        } else {
          content.removeAttribute("hidden");
        }
      }
    });
  }
}

const open = document.getElementById("photos");
const close = document.getElementById("photos-close");
const modal = document.getElementById("photos-modal");

if (open && close && modal) {
  open.addEventListener("click", () => {
    modal.showModal();
  });

  close.addEventListener("click", () => modal.close());
}

// slides
let currentIndex = 0;
const slides = document.querySelectorAll(".slide");
const descriptions = document.querySelectorAll(".description");

const next = document.getElementById("next");
const prev = document.getElementById("prev");
const totalSlides = slides.length;

if (descriptions.length >= 1) descriptions[0].style.display = "block";

const showMessage = (index) => {
  for (const description of descriptions) {
    description.style.display = "none";
  }
  showSlide(index);
  descriptions[currentIndex].style.display = "block";
};

const showSlide = (index) => {
  if (index < 0) {
    currentIndex = totalSlides - 1;
  } else if (index >= totalSlides) {
    currentIndex = 0;
  } else {
    currentIndex = index;
  }

  const translateValue = -currentIndex * 100 + "%";
  document.getElementById("slider").style.transform =
    "translateX(" + translateValue + ")";
};

const nextSlide = () => showMessage(currentIndex + 1);
const prevSlide = () => showMessage(currentIndex - 1);

next.addEventListener("click", () => nextSlide());
prev.addEventListener("click", () => prevSlide());
