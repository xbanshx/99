
let quessSectionParent = document.getElementById("quess-section");
let quess =  Array.from(document.getElementById("quess-container").children);


let path = document.querySelector(".ques-path");
let pathLength = path.getTotalLength();

path.style.strokeDasharray = pathLength + " " + pathLength;
path.style.strokeDashoffset = pathLength;


let heroSection = document.getElementById("hero-section");

let hiddenElements = document.querySelectorAll(".hidden");

let observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (e.isIntersecting) {
            e.target.classList.add("show");
        }
    })
});

hiddenElements.forEach((el) => observer.observe(el))

// Throttled scroll handler using requestAnimationFrame
let scrollTicking = false;
window.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;

    requestAnimationFrame(() => {
        var scrollPercentage = ((document.documentElement.scrollTop - (quessSectionParent.offsetTop - (quessSectionParent.clientHeight / 2 - 200) )) / quessSectionParent.clientHeight);

        var drawLength = pathLength * scrollPercentage; 
        path.style.strokeDashoffset = pathLength - drawLength;

        if (scrollPercentage * 100 > 10 && scrollPercentage * 100 <= 35) {
            quess[0].classList.add("apparent");
            quess[1].classList.remove("apparent");
        } else if (scrollPercentage * 100 > 40 && scrollPercentage * 100 <= 65) {
            quess[0].classList.remove("apparent");
            quess[1].classList.add("apparent");
        } else if (scrollPercentage * 100 > 70) {
            quess[1].classList.remove("apparent");
            quess[2].classList.add("apparent");
        } else {
            quess.forEach(ques => {
                ques.classList.remove("apparent");
            });
        }
        scrollTicking = false;
    });
});

// Removed old mousemove parallax — now handled by animations.js
