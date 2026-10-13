
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

// Web3Forms AJAX Handler for Media Contact Form
const contactForm = document.getElementById("contact-form");
if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const statusDiv = contactForm.querySelector(".form-status");
        const submitBtn = contactForm.querySelector("button[type='submit'], .btn");
        const originalBtnText = submitBtn ? submitBtn.innerHTML : "";

        const nameInput = contactForm.querySelector("#user-name");
        const emailInput = contactForm.querySelector("#user-email");
        const messageInput = contactForm.querySelector("#message");
        const botcheck = contactForm.querySelector('input[name="botcheck"]');

        if (botcheck && botcheck.checked) return;

        const isEn = (document.documentElement.lang === "en");

        if (!nameInput.value.trim() || !emailInput.value.trim() || !messageInput.value.trim()) {
            if (statusDiv) {
                statusDiv.style.display = "block";
                statusDiv.style.color = "var(--pink-color)";
                statusDiv.textContent = isEn ? "Please fill in all required fields." : "يرجى تعبئة جميع الحقول المطلوبة.";
            }
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
            if (statusDiv) {
                statusDiv.style.display = "block";
                statusDiv.style.color = "var(--pink-color)";
                statusDiv.textContent = isEn ? "Please enter a valid email address." : "يرجى إدخال بريد إلكتروني صحيح.";
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";
            submitBtn.textContent = isEn ? "Sending..." : "جاري الإرسال...";
        }
        if (statusDiv) statusDiv.style.display = "none";

        const formData = new FormData(contactForm);
        const object = Object.fromEntries(formData);
        const json = JSON.stringify(object);

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: json
            });
            const result = await response.json();
            if (response.status === 200 && result.success) {
                contactForm.reset();
                if (statusDiv) {
                    statusDiv.style.display = "block";
                    statusDiv.style.color = "var(--light-blue-color)";
                    statusDiv.textContent = isEn ? "Your message has been sent successfully! We will contact you soon." : "تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.";
                }
            } else {
                throw new Error(result.message || "Submission failed");
            }
        } catch (err) {
            if (statusDiv) {
                statusDiv.style.display = "block";
                statusDiv.style.color = "var(--pink-color)";
                statusDiv.textContent = isEn ? "Failed to send. Please try again or contact us at Info@i99.sa." : "حدث خطأ أثناء الإرسال. يرجى المحاولة لاحقاً أو مراسلتنا عبر Info@i99.sa.";
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.innerHTML = originalBtnText;
            }
        }
    });
}

